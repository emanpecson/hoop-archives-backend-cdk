import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class GameClipsDdbTable extends Construct {
	readonly table: Table;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.table = this.createTable();
	}

	private createTable(): Table {
		return new Table(this, "GameClipsTable", {
			tableName: "GameClips",
			partitionKey: {
				name: "gameTitle",
				type: AttributeType.STRING,
			},
			sortKey: {
				name: "clipId",
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY,
		});
	}
}
