const express = require("express");
const { DefaultAzureCredential } = require("@azure/identity");
const { ContainerAppsAPIClient } = require("@azure/arm-appcontainers");
const Project = require("../models/project");
const DeploymentService = require("../services/DeploymentService");
const router = express.Router();

const RUN_ENV = process.env.RUN_ENV || "development";

// Azure Container App Job configuration
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
const jobName = process.env.AZURE_JOB_NAME_DEPLOY;
let client;

if (RUN_ENV === "production" && subscriptionId) {
  client = new ContainerAppsAPIClient(new DefaultAzureCredential(), subscriptionId);
}

// --- API Endpoint to trigger deployment ---
router.post("/staticSite", async (req, res) => {
  const { gitURL, slug, outputDir } = req.body;
  const projectSlug = slug || `proj-${Date.now()}`;

  try {
    // 1. Initial validation
    const existingProject = await Project.findOne({ name: projectSlug });
    if (existingProject) {
      return res.status(400).json({ error: "A project with this name already exists. Please choose a different name." });
    }

    // 2. Branching based on environment
    if (RUN_ENV === "production") {
      // --- PRODUCTION: Azure Container App Jobs ---
      const BUCKET_NAME = process.env.BUCKET_NAME;
      const params = {
        name: jobName,
        triggerType: "Manual",
        template: {
          containers: [{
              name: "builder-image",
              image: `deloydashimage.azurecr.io/buildserver:slim`,
              env: [
                { name: "REPO_URL", value: gitURL },
                { name: "JOB_ID", value: projectSlug },
                { name: "STORAGE_URL", value: process.env.STORAGE_ENDPOINT },
                { name: "STORAGE_ACCESS_KEY", value: process.env.STORAGE_ACCESS_KEY },
                { name: "STORAGE_SECRET_KEY", value: process.env.STORAGE_SECRET_KEY },
                { name: "BUCKET_NAME", value: BUCKET_NAME },
              ]
            }]
        }};

      // await client.jobs.beginStartAndWait(resourceGroup, jobName, params);
      res.json({
        status: "queued",
        data: { projectSlug, url: `http://${projectSlug}.azure.deployment.url/` } // Placeholder
      });

    } else {
      // --- DEVELOPMENT/LOCAL: Docker Worker with Queue ---
      
      // Create the project record in PENDING state
      const project = new Project({
          name: projectSlug,
          userId: req.user._id,
          type: 'static-site',
          status: 'PENDING'
      });
      await project.save();

      // Set headers for Server-Sent Events (SSE) for real-time logs
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const keepAliveId = setInterval(() => {
        res.write(':\n\n'); 
      }, 15000);

      const buildConfig = {
          gitURL: gitURL,
          slug: projectSlug,
          outputDir: outputDir || 'dist',
          storageUrl: process.env.STORAGE_ENDPOINT || "http://minio:9000",
          accessKey: process.env.STORAGE_ACCESS_KEY || "minioadmin",
          secretKey: process.env.STORAGE_SECRET_KEY || "minioadmin",
          bucketName: process.env.BUCKET_NAME || "projects"
      };

      const handle = await DeploymentService.startDeployment(project, buildConfig);

      handle.onLog((log) => {
          res.write(`data: ${JSON.stringify({ log })}\n\n`);
      });

      handle.onComplete((data) => {
          clearInterval(keepAliveId);
          res.write(`data: ${JSON.stringify({ success: "Deployment finished", url: `http://${projectSlug}.localhost:8000` })}\n\n`);
          res.end();
      });

      handle.onError((err) => {
          clearInterval(keepAliveId);
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
      });

      req.on("close", () => {
          clearInterval(keepAliveId);
      });
    }

  } catch (error) {
    console.error("Error in deployment route:", error);
    if (!res.headersSent) {
        return res.status(500).json({ error: "Failed to initiate deployment process." });
    }
    res.write(`data: ${JSON.stringify({ error: "Internal server error during deployment orchestration" })}\n\n`);
    res.end();
  }
});

module.exports = router;