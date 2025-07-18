import { RemovalPolicy, SecretValue } from "aws-cdk-lib";
import {
	ProviderAttribute,
	UserPool,
	UserPoolClient,
	UserPoolClientIdentityProvider,
	UserPoolIdentityProviderGoogle,
} from "aws-cdk-lib/aws-cognito";
import {
	IdentityPool,
	IdentityPoolProviderType,
	IdentityPoolProviderUrl,
	RoleMappingMatchType,
	UserPoolAuthenticationProvider,
} from "aws-cdk-lib/aws-cognito-identitypool";
import { FederatedPrincipal, ManagedPolicy, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class CognitoUsers extends Construct {
	readonly userPool: UserPool;
	readonly googleProvider: UserPoolIdentityProviderGoogle;
	readonly userPoolClient: UserPoolClient;
	readonly identityPool: IdentityPool;

	readonly betaUserRole: Role;
	readonly userRole: Role;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.userPool = this.createUserPool();
		this.googleProvider = this.addUserPoolGoogleProvider(this.userPool);
		this.userPoolClient = this.addUserPoolClient(this.googleProvider);

		this.addGroups(this.userPool);

		const federatedPrincipal = new FederatedPrincipal(
			"cognito-identity.amazonaws.com",
			{
				StringEquals: {
					"cognito-identity.amazonaws.com:aud": "*", // this.identityPool.identityPoolId,
				},
				"ForAnyValue:StringLike": {
					"cognito-identity.amazonaws.com:amr": "authenticated",
				},
			},
			"sts:AssumeRoleWithWebIdentity"
		);

		// define app roles
		this.betaUserRole = this.createBetaUserRole(federatedPrincipal);
		this.userRole = this.createUserRole(federatedPrincipal);

		this.identityPool = this.createIdentityPool(
			this.betaUserRole,
			this.userRole
		);
	}

	private createUserPool(): UserPool {
		const poolParty = new UserPool(this, "UserPool", {
			userPoolName: "HoopArchivesUserPool",
			selfSignUpEnabled: true, // allow public access
			signInAliases: { email: true },
			removalPolicy: RemovalPolicy.DESTROY,
		});

		// configure a domain through cognito
		poolParty.addDomain("UserPoolDomain", {
			cognitoDomain: {
				// https://hoop-archives-auth.auth.us-west-2.amazoncognito.com
				domainPrefix: "hoop-archives-auth",
			},
		});

		return poolParty;
	}

	private addUserPoolClient(
		googleProvider: UserPoolIdentityProviderGoogle
	): UserPoolClient {
		const poolPartyClient = this.userPool.addClient("UserPoolClient", {
			userPoolClientName: "HoopArchivesUserPoolClient",
			generateSecret: false,
			oAuth: {
				callbackUrls: [
					process.env.DEV_CALLBACK_URL!,
					// process.env.PROD_CALLBACK_URL!,
				],
				logoutUrls: [
					process.env.DEV_LOGOUT_URL!,
					// process.env.PROD_LOGOUT_URL!,
				],
			},
			supportedIdentityProviders: [
				UserPoolClientIdentityProvider.COGNITO,
				UserPoolClientIdentityProvider.GOOGLE,
			],
		});

		poolPartyClient.node.addDependency(googleProvider);

		return poolPartyClient;
	}

	private addUserPoolGoogleProvider(
		userPool: UserPool
	): UserPoolIdentityProviderGoogle {
		const googleClientSecret = SecretValue.secretsManager(
			process.env.GOOGLE_AUTH_CLIENT_SECRET_PATH!
		);

		return new UserPoolIdentityProviderGoogle(this, "GoogleIdP", {
			clientId: process.env.GOOGLE_AUTH_CLIENT_ID!,
			clientSecretValue: googleClientSecret,
			scopes: ["openid", "email", "profile"],
			userPool: userPool,
			attributeMapping: {
				profilePicture: ProviderAttribute.GOOGLE_PICTURE,
				email: ProviderAttribute.GOOGLE_EMAIL,
				givenName: ProviderAttribute.GOOGLE_GIVEN_NAME,
				familyName: ProviderAttribute.GOOGLE_FAMILY_NAME,
			},
		});
	}

	private createIdentityPool(betaUserRole: Role, userRole: Role): IdentityPool {
		const providerUrl = `${this.userPool.userPoolProviderName}:${this.userPoolClient.userPoolClientId}`;

		return new IdentityPool(this, "IdentityPool", {
			identityPoolName: "HoopArchivesIdentityPool",
			authenticationProviders: {
				userPools: [
					new UserPoolAuthenticationProvider({
						userPool: this.userPool,
						userPoolClient: this.userPoolClient,
					}),
				],
				google: {
					clientId: process.env.GOOGLE_AUTH_CLIENT_ID!,
				},
			},
			// default role on authentication
			authenticatedRole: betaUserRole,

			// conditionally apply role for users authenticated via the app's User Pool
			roleMappings: [
				{
					mappingKey: "cognito-mapping",
					providerUrl: new IdentityPoolProviderUrl(
						IdentityPoolProviderType.USER_POOL,
						providerUrl
					),
					resolveAmbiguousRoles: true,
					rules: [
						{
							claim: "cognito:groups",
							matchType: RoleMappingMatchType.CONTAINS,
							claimValue: "BetaUser",
							mappedRole: betaUserRole,
						},
						{
							claim: "cognito:groups",
							matchType: RoleMappingMatchType.CONTAINS,
							claimValue: "User",
							mappedRole: userRole,
						},
					],
				},
			],
		});
	}

	private addGroups(userPool: UserPool): void {
		userPool.addGroup("BetaUserGroup", { groupName: "BetaUser" });
		userPool.addGroup("UserGroup", { groupName: "User" });
	}

	private createBetaUserRole(federatedPrincipal: FederatedPrincipal): Role {
		// beta user role
		const role = new Role(this, "BetaUserRole", {
			assumedBy: federatedPrincipal,
			description: "Limited AWS permissions for beta testers",
		});
		role.addManagedPolicy(
			ManagedPolicy.fromAwsManagedPolicyName("AmazonS3ReadOnlyAccess")
		);

		return role;
	}

	private createUserRole(federatedPrincipal: FederatedPrincipal): Role {
		// user role
		const role = new Role(this, "UserRole", {
			assumedBy: federatedPrincipal,
			description: "Permissions for regular users",
		});
		role.addManagedPolicy(
			ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")
		);

		return role;
	}
}
