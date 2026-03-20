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

    // --- K8s/Docker Worker with Queue ---
    
    // Create or update the project record in PENDING state
    let project = await Project.findOne({ name: projectSlug, userId: req.user._id });
    
    if (!project) {
        project = new Project({
            name: projectSlug,
            userId: req.user._id,
            type: 'static-site',
            status: 'PENDING'
        });
    } else {
        project.status = 'PENDING';
    }
    
    await project.save();

    const buildConfig = {
        gitURL: gitURL,
        slug: projectSlug,
        outputDir: outputDir || 'dist',
        storageUrl: process.env.STORAGE_ENDPOINT || "http://minio:9000",
        accessKey: process.env.STORAGE_ACCESS_KEY || "minioadmin",
        secretKey: process.env.STORAGE_SECRET_KEY || "minioadmin",
        bucketName: process.env.BUCKET_NAME || "projects"
    };

    // This starts the async deployment process
    DeploymentService.startDeployment(project, buildConfig);

    // Return the project ID immediately so the frontend can start polling
    res.status(200).json({
        projectId: project._id,
        status: 'PENDING',
        message: "Deployment initiated"
    });

  } catch (error) {
    console.error("Error in deployment route:", error);
    res.status(500).json({ error: "Failed to initiate deployment process." });
  }
});

module.exports = router;