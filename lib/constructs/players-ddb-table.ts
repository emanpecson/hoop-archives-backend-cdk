import { RemovalPolicy } from "aws-cdk-lib";
import {
	AttributeType,
	BillingMode,
	ProjectionType,
	Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class PlayersDdbTable extends Construct {
	readonly table: Table;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.table = this.createTable();
	}

	private createTable(): Table {
		const table = new Table(this, "PlayersTable", {
			tableName: "Players",
			partitionKey: { name: "leagueId", type: AttributeType.STRING },
			sortKey: { name: "playerId", type: AttributeType.STRING },
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: RemovalPolicy.DESTROY,
		});

		// gsi for fullName
		table.addGlobalSecondaryIndex({
			indexName: "GSI_fullName",
			partitionKey: { name: "leagueId", type: AttributeType.STRING },
			sortKey: { name: "fullName", type: AttributeType.STRING },
			projectionType: ProjectionType.ALL,
		});

		return table;
	}
}
