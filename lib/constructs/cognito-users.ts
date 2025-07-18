import { CfnJson, RemovalPolicy, Stack } from "aws-cdk-lib";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
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
	readonly userPoolClient: UserPoolClient;
	readonly identityPool: IdentityPool;

	readonly betaUserRole: Role;
	readonly userRole: Role;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		const userPoolId = "UserPool";
		const userPoolClientId = "UserPoolClient";

		this.userPool = this.createUserPool(userPoolId);
		this.userPoolClient = this.addUserPoolClient(userPoolClientId);

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
			userPoolId,
			userPoolClientId,
			this.betaUserRole,
			this.userRole
		);
	}

	private createUserPool(id: string): UserPool {
		const poolParty = new UserPool(this, id, {
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

	private addUserPoolClient(id: string): UserPoolClient {
		return this.userPool.addClient(id, {
			userPoolClientName: "HoopArchivesUserPoolClient",
			generateSecret: false,
		});
	}

	private createIdentityPool(
		userPoolId: string,
		userPoolClientId: string,
		betaUserRole: Role,
		userRole: Role
	): IdentityPool {
		const providerUrl = `${this.userPool.userPoolProviderName}:${this.userPoolClient.userPoolClientId}`;
		const mappingKey = `${userPoolId}:${userPoolClientId}`;

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
					clientId: String(process.env.GOOGLE_AUTH_CLIENT_ID),
				},
			},
			authenticatedRole: betaUserRole,
			// unauthenticatedRole: betaUserRole,
			roleMappings: [
				{
					mappingKey,
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
