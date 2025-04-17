import {
	BlockDeviceVolume,
	Instance,
	InstanceClass,
	InstanceSize,
	InstanceType,
	KeyPair,
	MachineImage,
	SecurityGroup,
	UserData,
	Vpc,
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class Ec2Instance extends Construct {
	readonly instance: Instance;

	constructor(scope: Construct, id: string) {
		super(scope, id);
		this.instance = this.createInstance();
	}

	private createInstance(): Instance {
		return new Instance(this, "Instance", {
			vpc: Vpc.fromLookup(this, "Vpc", { vpcId: "vpc-02c1e374afcaeb1fd" }),
			instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.XLARGE),
			machineImage: MachineImage.latestAmazonLinux2023(),
			securityGroup: SecurityGroup.fromSecurityGroupId(
				this,
				"default",
				"sg-022ca064296fe84a1"
			),
			keyPair: KeyPair.fromKeyPairName(this, "KeyPair", "eman-kp"),
			blockDevices: [
				{
					deviceName: "/dev/xvda",
					volume: BlockDeviceVolume.ebs(20),
				},
			],
			// userData: UserData.forLinux({  }), // script for installations
		});
	}
}
