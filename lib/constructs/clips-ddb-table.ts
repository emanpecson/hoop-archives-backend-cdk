import { RemovalPolicy } from "aws-cdk-lib";
import {
	AttributeType,
	BillingMode,
	ProjectionType,
	Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class GameClipsDdbTable extends Construct {
	readonly table: Table;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.table = this.createTable();
	}

	private createTable(): Table {
		const table = new Table(this, "ClipsTable", {
			tableName: "Clips",
			partitionKey: {
				name: "leagueId",
				type: AttributeType.STRING,
			},
			sortKey: {
				name: "clipId",
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY,
		});

		table.addGlobalSecondaryIndex({
			indexName: "GSI_gameId",
			partitionKey: { name: "leagueId", type: AttributeType.STRING },
			sortKey: { name: "gameId", type: AttributeType.STRING },
			projectionType: ProjectionType.ALL,
		});

		return table;
	}
}
