// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "automation",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
    };
  },
  async run() {
    // Security group for automation app
    const securityGroup = new aws.ec2.SecurityGroup("automation-sg", {
      description: "Security group for Next.js automation app",
      ingress: [
        {
          description: "SSH",
          protocol: "tcp",
          fromPort: 22,
          toPort: 22,
          cidrBlocks: ["0.0.0.0/0"],
        },
        {
          description: "HTTP",
          protocol: "tcp",
          fromPort: 80,
          toPort: 80,
          cidrBlocks: ["0.0.0.0/0"],
        },
        {
          description: "HTTPS",
          protocol: "tcp",
          fromPort: 443,
          toPort: 443,
          cidrBlocks: ["0.0.0.0/0"],
        },
        {
          description: "Next.js",
          protocol: "tcp",
          fromPort: 3000,
          toPort: 3000,
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
      egress: [
        {
          description: "All outbound",
          protocol: "-1",
          fromPort: 0,
          toPort: 0,
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
    });

    // Ubuntu 24.04 LTS AMI
    const ami = aws.ec2.getAmi({
      filters: [
        {
          name: "name",
          values: [
            "ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*",
          ],
        },
      ],
      mostRecent: true,
      owners: ["099720109477"], // Canonical
    });

    // Get env vars for the app
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

    // User data script to install everything and auto-deploy the app
    const userData = `#!/bin/bash
set -e
exec > >(tee /var/log/user-data.log) 2>&1

echo "=== Starting automation app deployment ==="
cd /home/ubuntu

# Install system dependencies
apt-get update -y
apt-get install -y curl git

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install pnpm and pm2
npm install -g pnpm pm2

# Install Playwright system dependencies
npx playwright install-deps chromium

# Clone the repo
echo "=== Cloning repository ==="
sudo -u ubuntu git clone https://github.com/sayandedotcom/automation.git /home/ubuntu/app
cd /home/ubuntu/app

# Create .env file
echo "=== Creating .env file ==="
cat > /home/ubuntu/app/.env << 'ENVEOF'
GOOGLE_GENERATIVE_AI_API_KEY=${geminiKey}
ENVEOF
chown ubuntu:ubuntu /home/ubuntu/app/.env

# Install dependencies
echo "=== Installing dependencies ==="
sudo -u ubuntu pnpm install

# Install Playwright browsers
echo "=== Installing Playwright browsers ==="
sudo -u ubuntu npx playwright install chromium

# Build the app
echo "=== Building the app ==="
sudo -u ubuntu pnpm run build

# Create PM2 startup script
echo "=== Starting the app with PM2 ==="
sudo -u ubuntu pm2 start npm --name "automation" -- run start
sudo -u ubuntu pm2 save

# Setup PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo -u ubuntu pm2 save

echo "=== Deployment complete! ==="
`;

    // Create EC2 instance
    const server = new aws.ec2.Instance("automation-server", {
      instanceType: "t3.medium",
      ami: ami.then((a) => a.id),
      userData: userData,
      vpcSecurityGroupIds: [securityGroup.id],
      associatePublicIpAddress: true,
      rootBlockDevice: {
        volumeSize: 30,
        volumeType: "gp3",
        deleteOnTermination: true,
      },
      tags: {
        Name: `automation-${$app.stage}`,
        ManagedBy: "sst",
      },
    });

    // Get default VPC and subnets for ALB
    const defaultVpc = aws.ec2.getVpc({ default: true });
    const defaultSubnets = aws.ec2.getSubnets({
      filters: [{ name: "default-for-az", values: ["true"] }],
    });

    // Application Load Balancer
    const alb = new aws.lb.LoadBalancer("automation-alb", {
      loadBalancerType: "application",
      securityGroups: [securityGroup.id],
      subnets: defaultSubnets.then((subnets) => subnets.ids),
      enableDeletionProtection: false,
    });

    // Target Group for EC2 instance
    const targetGroup = new aws.lb.TargetGroup("automation-tg", {
      port: 3000,
      protocol: "HTTP",
      vpcId: defaultVpc.then((vpc) => vpc.id),
      healthCheck: {
        enabled: true,
        path: "/",
        protocol: "HTTP",
        port: "3000",
        healthyThreshold: 2,
        unhealthyThreshold: 5,
        interval: 30,
        timeout: 10,
      },
    });

    // ALB Listener
    new aws.lb.Listener("automation-listener", {
      loadBalancerArn: alb.arn,
      port: 80,
      protocol: "HTTP",
      defaultActions: [
        {
          type: "forward",
          targetGroupArn: targetGroup.arn,
        },
      ],
    });

    // Attach EC2 to Target Group
    new aws.lb.TargetGroupAttachment("automation-attachment", {
      targetGroupArn: targetGroup.arn,
      targetId: server.id,
      port: 3000,
    });

    // CloudFront distribution pointing to ALB (ALB has a domain name)
    const cdn = new sst.aws.Cdn("AutomationCdn", {
      origins: [
        {
          domainName: alb.dnsName,
          originId: "alb",
          customOriginConfig: {
            httpPort: 80,
            httpsPort: 443,
            originProtocolPolicy: "http-only",
            originSslProtocols: ["TLSv1.2"],
          },
        },
      ],
      defaultCacheBehavior: {
        targetOriginId: "alb",
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: [
          "GET",
          "HEAD",
          "OPTIONS",
          "PUT",
          "POST",
          "PATCH",
          "DELETE",
        ],
        cachedMethods: ["GET", "HEAD"],
        cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad", // CachingDisabled
        originRequestPolicyId: "216adef6-5c7f-47e4-b989-5492eafa07d3", // AllViewer
      },
    });

    return {
      instanceId: server.id,
      publicIp: server.publicIp,
      directUrl: server.publicIp.apply((ip) => `http://${ip}:3000`),
      albUrl: alb.dnsName.apply((dns) => `http://${dns}`),
      cloudfrontUrl: cdn.url,
    };
  },
});
