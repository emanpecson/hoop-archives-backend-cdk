import { Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, ProjectionType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Instance } from "aws-cdk-lib/aws-ec2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { UploadsS3Bucket } from "./constructs/uploads-s3-bucket";
import { GamesDdbTable } from "./constructs/games-ddb-table";
import { GameClipsDdbTable } from "./constructs/game-clips-ddb-table";
import { PlayersDdbTable } from "./constructs/players-ddb-table";
import { GameDraftsDdbTable } from "./constructs/game-drafts-ddb-table";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { TrimRequestSqsQueue } from "./constructs/trim-request-sqs-queue";

export class HoopArchivesBackendStack extends Stack {
	readonly uploadsBucket: Bucket;
	readonly gameDraftsTable: Table;
	readonly gamesTable: Table;
	readonly gameClipsTable: Table;
	readonly playersTable: Table;
	readonly trimRequestQueue: Queue;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		this.uploadsBucket = new UploadsS3Bucket(this, "UplodsBucket").bucket;

		this.gameDraftsTable = new GameDraftsDdbTable(
			this,
			"GameDraftsTable"
		).table;

		this.gamesTable = new GamesDdbTable(this, "GamesTable").table;

		this.gameClipsTable = new GameClipsDdbTable(this, "GameClipsTable").table;

		// gsi for game title
		this.gameClipsTable.addGlobalSecondaryIndex({
			indexName: "GameTitleIndex",
			partitionKey: { name: "leagueId", type: AttributeType.STRING },
			sortKey: { name: "gameTitle", type: AttributeType.STRING },
			projectionType: ProjectionType.ALL,
		});

		this.playersTable = new PlayersDdbTable(this, "PlayersTable").table;

		// gsi for player id
		this.playersTable.addGlobalSecondaryIndex({
			indexName: "PlayerIdIndex",
			partitionKey: { name: "playerId", type: AttributeType.STRING },
			projectionType: ProjectionType.ALL,
		});

		this.trimRequestQueue = new TrimRequestSqsQueue(
			this,
			"TrimRequestQueue"
		).queue;
	}
}
