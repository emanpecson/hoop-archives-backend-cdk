import { RemovalPolicy } from "aws-cdk-lib";
import {
	AttributeType,
	BillingMode,
	ProjectionType,
	Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class StatsDdbTable extends Construct {
	readonly table: Table;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.table = this.createTable();
	}

	private createTable(): Table {
		const table = new Table(this, "StatsTable", {
			tableName: "Stats",
			partitionKey: { name: "leagueId", type: AttributeType.STRING },
			sortKey: { name: "statsId", type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY,
		});

		// playerId GSI
		table.addGlobalSecondaryIndex({
			indexName: "GSI_playerId",
			partitionKey: { name: "leagueId", type: AttributeType.STRING },
			sortKey: { name: "playerId", type: AttributeType.STRING },
			projectionType: ProjectionType.ALL,
		});

		// gameId GSI
		table.addGlobalSecondaryIndex({
			indexName: "GSI_gameId",
			partitionKey: { name: "leagueId", type: AttributeType.STRING },
			sortKey: { name: "gameId", type: AttributeType.STRING },
			projectionType: ProjectionType.ALL,
		});

		return table;
	}
}
