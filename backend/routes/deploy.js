const express = require("express");
const Project = require("../models/project");
const DeploymentService = require("../services/DeploymentService");
const router = express.Router();

// POST /deploy/staticSite — starts a new deployment
router.post("/staticSite", async (req, res) => {
    const { gitURL, slug, outputDir } = req.body;

    if (!gitURL || !slug) {
        return res.status(400).json({ error: "gitURL and slug are required." });
    }

    const projectSlug = slug.toLowerCase().trim();

    try {
        // Find or create the project
        let project = await Project.findOne({ name: projectSlug, userId: req.user._id });

        if (!project) {
            project = new Project({
                name: projectSlug,
                userId: req.user._id,
                type: 'static-site',
                status: 'PENDING',
                logs: []
            });
        } else {
            // Re-deploying: reset status and logs
            project.status = 'PENDING';
            project.logs = [];
        }

        await project.save();

        const buildConfig = {
            gitURL,
            slug: projectSlug,
            outputDir: outputDir || 'dist',
            storageUrl: process.env.STORAGE_ENDPOINT || "http://minio:9000",
            accessKey: process.env.STORAGE_ACCESS_KEY || "admin",
            secretKey: process.env.STORAGE_SECRET_KEY || "password",
            bucketName: process.env.BUCKET_NAME || "amazon"
        };

        // Start deployment asynchronously — do NOT await
        DeploymentService.startDeployment(project, buildConfig);

        // Return the project ID immediately so frontend can poll
        return res.status(200).json({
            projectId: project._id,
            status: 'PENDING',
            message: "Deployment queued successfully."
        });

    } catch (error) {
        console.error("[Deploy] Error:", error);
        return res.status(500).json({ error: "Failed to start deployment." });
    }
});

module.exports = router;