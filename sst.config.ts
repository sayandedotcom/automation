// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "automation",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc("MyVpc");
    const cluster = new sst.aws.Cluster("MyCluster", { vpc });

    new sst.aws.Service("MyService", {
      cluster,
      loadBalancer: {
        ports: [{ listen: "80/http", forward: "3000/http" }],
      },
      environment: {
        GOOGLE_GENERATIVE_AI_API_KEY:
          process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
        HEADFUL: process.env.HEADFUL || "true", // Containers cannot run headed browsers - no X server
      },
      dev: {
        command: "npm run dev",
      },
    });
  },
});
