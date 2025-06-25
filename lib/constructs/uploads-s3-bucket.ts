import { BlockPublicAccess, Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AnyPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

export class UploadsS3Bucket extends Construct {
	readonly bucket: Bucket;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.bucket = this.createBucket();
	}

	private createBucket(): Bucket {
		const bucket = new Bucket(this, "UploadsBucket", {
			bucketName: "hoop-archives-uploads",
			versioned: false,
			blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			cors: [
				{
					allowedMethods: [
						HttpMethods.GET,
						HttpMethods.PUT,
						HttpMethods.POST,
						HttpMethods.HEAD,
					],
					allowedOrigins: ["*"],
					allowedHeaders: ["*"],
					exposedHeaders: ["ETag"],
					maxAge: 3000,
				},
			],
		});

		// public GET access
		bucket.addToResourcePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				principals: [new AnyPrincipal()],
				actions: ["s3:GetObject"],
				resources: [`${bucket.bucketArn}/*`],
			})
		);

		return bucket;
	}
}
