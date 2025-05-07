import { BlockPublicAccess, Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";

export class UploadsS3Bucket extends Construct {
	readonly bucket: Bucket;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.bucket = this.createBucket();
	}

	private createBucket(): Bucket {
		return new Bucket(this, "UploadsBucket", {
			bucketName: "hoop-archives-uploads",
			versioned: false,
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
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
	}
}
