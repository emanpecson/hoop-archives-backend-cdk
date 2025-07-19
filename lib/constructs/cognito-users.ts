import { RemovalPolicy, SecretValue } from "aws-cdk-lib";
import {
	CfnIdentityPool,
	CfnIdentityPoolRoleAttachment,
	OAuthScope,
	ProviderAttribute,
	UserPool,
	UserPoolClient,
	UserPoolClientIdentityProvider,
	UserPoolIdentityProviderGoogle,
} from "aws-cdk-lib/aws-cognito";
import { RoleMappingMatchType } from "aws-cdk-lib/aws-cognito-identitypool";
import { FederatedPrincipal, ManagedPolicy, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class CognitoUsers extends Construct {
	readonly userPool: UserPool;
	readonly googleProvider: UserPoolIdentityProviderGoogle;
	readonly userPoolClient: UserPoolClient;
	readonly identityPool: CfnIdentityPool;

	readonly betaUserRole: Role;
	readonly userRole: Role;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.userPool = this.createUserPool();
		this.googleProvider = this.addUserPoolGoogleProvider(this.userPool);
		this.userPoolClient = this.addUserPoolClient(this.googleProvider);

		this.addGroups(this.userPool);

		// start creation of identity pool
		this.identityPool = this.createIdentityPool();

		// create roles in reference to the identity pool id
		this.betaUserRole = this.createBetaUserRole(this.identityPool.ref);
		this.userRole = this.createUserRole(this.identityPool.ref);

		// attach roles to identity pool
		const providerUrl = `${this.userPool.userPoolProviderName}:${this.userPoolClient.userPoolClientId}`;
		this.identityPoolAttachRoles(
			providerUrl,
			this.identityPool.ref,
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
			generateSecret: true,
			oAuth: {
				callbackUrls: [
					process.env.DEV_CALLBACK_URL!,
					// process.env.PROD_CALLBACK_URL!,
				],
				logoutUrls: [
					process.env.DEV_LOGOUT_URL!,
					// process.env.PROD_LOGOUT_URL!,
				],
				scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
			},
			authFlows: {
				userSrp: true, // enable cognito user pool auth
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

	// L1 setup: no automatic role creation
	private createIdentityPool(): CfnIdentityPool {
		return new CfnIdentityPool(this, "IdentityPool", {
			identityPoolName: "HoopArchivesIdentityPool",
			allowUnauthenticatedIdentities: false,

			// maps cognito user pool + client
			cognitoIdentityProviders: [
				{
					clientId: this.userPoolClient.userPoolClientId,
					providerName: this.userPool.userPoolProviderName,
				},
			],

			// map external identity provider (google)
			supportedLoginProviders: {
				"accounts.google.com": process.env.GOOGLE_AUTH_CLIENT_ID,
			},
		});
	}

	private addGroups(userPool: UserPool): void {
		userPool.addGroup("BetaUserGroup", { groupName: "BetaUser" });
		userPool.addGroup("UserGroup", { groupName: "User" });
	}

	private createBetaUserRole(identityPoolId: string): Role {
		const federatedPrincipal = new FederatedPrincipal(
			"cognito-identity.amazonaws.com",
			{
				StringEquals: {
					"cognito-identity.amazonaws.com:aud": identityPoolId,
				},
				"ForAnyValue:StringLike": {
					"cognito-identity.amazonaws.com:amr": "authenticated",
				},
			},
			"sts:AssumeRoleWithWebIdentity"
		);

		const role = new Role(this, "BetaUserRole", {
			assumedBy: federatedPrincipal,
			description: "Limited AWS permissions for beta testers",
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName("AmazonS3ReadOnlyAccess"),
				ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBReadOnlyAccess"),
			],
		});

		return role;
	}

	private createUserRole(identityPoolId: string): Role {
		const federatedPrincipal = new FederatedPrincipal(
			"cognito-identity.amazonaws.com",
			{
				StringEquals: {
					"cognito-identity.amazonaws.com:aud": identityPoolId,
				},
				"ForAnyValue:StringLike": {
					"cognito-identity.amazonaws.com:amr": "authenticated",
				},
			},
			"sts:AssumeRoleWithWebIdentity"
		);

		const role = new Role(this, "UserRole", {
			assumedBy: federatedPrincipal,
			description: "Permissions for regular users",
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
				ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
				ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess"),
			],
		});

		return role;
	}

	private identityPoolAttachRoles(
		providerUrl: string,
		identityPoolId: string,
		betaUserRole: Role,
		userRole: Role
	): CfnIdentityPoolRoleAttachment {
		return new CfnIdentityPoolRoleAttachment(this, "RoleAttachment", {
			identityPoolId: identityPoolId,
			roles: {
				authenticated: betaUserRole.roleArn,
				unauthenticated: betaUserRole.roleArn,
			},
			roleMappings: {
				"cognito-mapping": {
					type: "Rules",
					ambiguousRoleResolution: "AuthenticatedRole",
					identityProvider: providerUrl,
					rulesConfiguration: {
						rules: [
							{
								claim: "cognito:groups",
								matchType: RoleMappingMatchType.CONTAINS,
								value: "BetaUser",
								roleArn: betaUserRole.roleArn,
							},
							{
								claim: "cognito:groups",
								matchType: RoleMappingMatchType.CONTAINS,
								value: "User",
								roleArn: userRole.roleArn,
							},
						],
					},
				},
			},
		});
	}
}
