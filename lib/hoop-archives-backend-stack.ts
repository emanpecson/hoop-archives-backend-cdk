import { Stack, StackProps } from "aws-cdk-lib";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { UploadsS3Bucket } from "./constructs/uploads-s3-bucket";
import { GamesDdbTable } from "./constructs/games-ddb-table";
import { GameClipsDdbTable } from "./constructs/clips-ddb-table";
import { PlayersDdbTable } from "./constructs/players-ddb-table";
import { GameDraftsDdbTable } from "./constructs/drafts-ddb-table";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { UploadRequestSqsQueue } from "./constructs/upload-request-sqs-queue";
import { Function } from "aws-cdk-lib/aws-lambda";
import { ClipperLambda } from "./constructs/clipper-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Effect, User, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StatsDdbTable } from "./constructs/stats-ddb-table";

export class HoopArchivesBackendStack extends Stack {
	readonly uploadsBucket: Bucket;
	readonly draftsTable: Table;
	readonly gamesTable: Table;
	readonly clipsTable: Table;
	readonly playersTable: Table;
	readonly statsTable: Table;
	readonly uploadRequestQueue: Queue;
	readonly lambdaFunction: Function;

	private awsUsername = String(process.env.AWS_USERNAME);

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		this.uploadsBucket = new UploadsS3Bucket(this, "UplodsBucket").bucket;

		this.draftsTable = new GameDraftsDdbTable(this, "DraftsTable").table;
		this.gamesTable = new GamesDdbTable(this, "GamesTable").table;
		this.clipsTable = new GameClipsDdbTable(this, "ClipsTable").table;
		this.playersTable = new PlayersDdbTable(this, "PlayersTable").table;
		this.statsTable = new StatsDdbTable(this, "StatsTable").table;

		this.uploadRequestQueue = new UploadRequestSqsQueue(
			this,
			"UploadRequestQueue"
		).queue;

		this.lambdaFunction = new ClipperLambda(this, "ClipperLambda").function;
		this.lambdaFunction.addEventSource(
			// 1 upload-request per lambda invocation
			new SqsEventSource(this.uploadRequestQueue, { batchSize: 1 })
		);

		// grant lambda access to resources
		this.gamesTable.grantReadWriteData(this.lambdaFunction);
		this.clipsTable.grantWriteData(this.lambdaFunction);
		this.uploadsBucket.grantReadWrite(this.lambdaFunction);

		// create "allow sqs message policy"
		const user = User.fromUserName(this, this.awsUsername, "hoop-archives-dev");
		const policy = new Policy(this, "AllowSendMessageToQueue", {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ["sqs:SendMessage"],
					resources: [this.uploadRequestQueue.queueArn],
				}),
			],
		});
		policy.attachToUser(user); // attach policy to user
	}
}
