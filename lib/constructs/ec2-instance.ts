import {
	BlockDeviceVolume,
	Instance,
	InstanceClass,
	InstanceSize,
	InstanceType,
	KeyPair,
	MachineImage,
	SecurityGroup,
	SubnetType,
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
		const userData = UserData.forLinux();
		userData.addCommands(
			"#!/bin/bash",
			"sudo yum update -y",
			"curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -",
			"sudo yum install -y nodejs",
			"sudo yum install -y git",
			"sudo yum install -y aws-cli",
			"sudo npm install -g aws-cdk"
		);

		return new Instance(this, "Instance", {
			vpc: Vpc.fromLookup(this, "Vpc", { vpcId: "vpc-02c1e374afcaeb1fd" }),
			vpcSubnets: { subnetType: SubnetType.PUBLIC },
			associatePublicIpAddress: true,
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
			userData,
		});
	}
}
