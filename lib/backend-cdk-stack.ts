import { Stack, StackProps } from "aws-cdk-lib";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Instance } from "aws-cdk-lib/aws-ec2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { Ec2Instance } from "./constructs/ec2-instance";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class BackendCdkStack extends Stack {
	readonly uploadsBucket: Bucket;
	readonly gamesTable: Table;
	readonly gameClipsTable: Table;
	readonly ec2Instance: Instance;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// this.uploadsBucket = new UploadsS3Bucket(this, "UplodsBucket").bucket;

		// this.gamesTable = new GamesDdbTable(this, "GamesTable").table;

		// this.gameClipsTable = new GameClipsDdbTable(this, "GameClipsTable").table;

		this.ec2Instance = new Ec2Instance(this, "MyInstance").instance;
	}
}
