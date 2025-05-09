import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class GameDraftsDdbTable extends Construct {
	readonly table: Table;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.table = this.createTable();
	}

	private createTable(): Table {
		return new Table(this, "GameDraftsTable", {
			tableName: "GameDrafts",
			partitionKey: { name: "title", type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY,
		});
	}
}
