import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import { Queue } from "aws-cdk-lib/aws-sqs";

export class TrimRequestSqsQueue extends Construct {
	readonly queue: Queue;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.queue = this.createQueue();
	}

	private createQueue(): Queue {
		// * throw failed messages in DLQ to prevent main queue overload
		let deadLetterQueue: Queue | undefined;
		deadLetterQueue = new Queue(this, "DeadLetterQueue", {
			queueName: "TrimRequestDLQ",
		});

		return new Queue(this, "MainQueue", {
			queueName: "TrimRequestQueue",
			visibilityTimeout: Duration.seconds(300),
			retentionPeriod: Duration.days(4),
			deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 3 },
		});
	}
}
