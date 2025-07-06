import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";

export class TrimRequestSqsQueue extends Construct {
	public readonly queue: sqs.Queue;

	constructor(scope: Construct, id: string) {
		super(scope, id);

		// * throw failed messages in DLQ to prevent main queue overload
		let deadLetterQueue: sqs.Queue | undefined;
		deadLetterQueue = new sqs.Queue(this, "DeadLetterQueue", {
			queueName: "TrimRequestDLQ",
		});

		this.queue = new sqs.Queue(this, "MainQueue", {
			queueName: "TrimRequestQueue",
			visibilityTimeout: Duration.seconds(300),
			retentionPeriod: Duration.days(4),
			deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 3 },
		});
	}
}
