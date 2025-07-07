import * as path from "path";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { Duration, Size } from "aws-cdk-lib";
import { Construct } from "constructs";

export class ClipperLambda extends Construct {
	readonly function: Function;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.function = this.createLambdaFunction();
	}

	private createLambdaFunction(): Function {
		const lambdaPath = path.join(
			__dirname,
			"..",
			"lambda",
			"clipper-lambda.jar"
		);

		return new Function(this, "ClipperLambda", {
			runtime: Runtime.JAVA_17,
			handler: "com.hooparchives.Clipper::handleRequest",
			code: Code.fromAsset(lambdaPath),
			memorySize: 3008, // max on java runtimes
			timeout: Duration.minutes(5),
			ephemeralStorageSize: Size.gibibytes(6), // `/tmp` space
			environment: { AWS_S3_BUCKET_NAME: "hoop-archives-uploads" },
		});
	}
}
