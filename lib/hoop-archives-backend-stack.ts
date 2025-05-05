import { Stack, StackProps } from "aws-cdk-lib";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Instance } from "aws-cdk-lib/aws-ec2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { Ec2Instance } from "./constructs/ec2-instance";
import { UploadsS3Bucket } from "./constructs/uploads-s3-bucket";
import { GamesDdbTable } from "./constructs/games-ddb-table";
import { GameClipsDdbTable } from "./constructs/game-clips-ddb-table";
import { PlayersDdbTable } from "./constructs/players-ddb-table";

export class HoopArchivesBackendStack extends Stack {
	readonly uploadsBucket: Bucket;
	readonly gamesTable: Table;
	readonly gameClipsTable: Table;
	readonly playersTable: Table;
	readonly ec2Instance: Instance;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		this.uploadsBucket = new UploadsS3Bucket(this, "UplodsBucket").bucket;

		this.gamesTable = new GamesDdbTable(this, "GamesTable").table;

		this.gameClipsTable = new GameClipsDdbTable(this, "GameClipsTable").table;

		this.playersTable = new PlayersDdbTable(this, "PlayersTable").table;

		this.ec2Instance = new Ec2Instance(this, "MyInstance").instance;
	}
}
