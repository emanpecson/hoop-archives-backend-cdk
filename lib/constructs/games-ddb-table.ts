import { RemovalPolicy } from "aws-cdk-lib";
import {
	AttributeType,
	BillingMode,
	ProjectionType,
	Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class GamesDdbTable extends Construct {
	readonly table: Table;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.table = this.createTable();
	}

	private createTable(): Table {
		const table = new Table(this, "GamesTable", {
			tableName: "Games",
			partitionKey: {
				name: "leagueId",
				type: AttributeType.STRING,
			},
			sortKey: {
				name: "gameId",
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY,
		});

		table.addGlobalSecondaryIndex({
			indexName: "GSI_title",
			partitionKey: { name: "leagueId", type: AttributeType.STRING },
			sortKey: { name: "title", type: AttributeType.STRING },
			projectionType: ProjectionType.ALL,
		});

		return table;
	}
}
