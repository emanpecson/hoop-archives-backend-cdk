import * as path from "path";
import { Function, Runtime, Code, LayerVersion } from "aws-cdk-lib/aws-lambda";
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

		const ffmpegPath = path.join(__dirname, "..", "ffmpeg-layer.zip");

		return new Function(this, "ClipperLambda", {
			runtime: Runtime.JAVA_17,
			handler: "com.hooparchives.Clipper::handleRequest",
			code: Code.fromAsset(lambdaPath),
			memorySize: 3008, // max on java runtimes
			timeout: Duration.minutes(10),
			ephemeralStorageSize: Size.gibibytes(8), // `/tmp` space
			environment: {
				AWS_S3_BUCKET_NAME: String(process.env.AWS_S3_BUCKET_NAME),
				AWS_DDB_GAMES_TABLE: String(process.env.AWS_DDB_GAMES_TABLE),
				AWS_DDB_CLIPS_TABLE: String(process.env.AWS_DDB_CLIPS_TABLE),
				FFMPEG_PATH: String(process.env.FFMPEG_PATH),
			},
			layers: [
				new LayerVersion(this, "FFmpegLayer", {
					code: Code.fromAsset(ffmpegPath),
					compatibleRuntimes: [Runtime.JAVA_17],
				}),
			],
		});
	}
}
