const express = require("express");
const Project = require("../models/project");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const userId = req.user._id;
        const projects = await Project.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json({ projects });
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});
const RESERVED_NAMES = [
    'api', 'backend', 'frontend', 'dash', 'dashboard', 'www', 
    'minio', 'amazon', 'mongodb', 'postgres', 'redis', 
    'auth', 'login', 'admin', 'status', 'health'
];

router.get("/check-name", async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ error: "Project name is required" });
        }

        const slug = name.toLowerCase();
        
        // 1. Check reserved names
        if (RESERVED_NAMES.includes(slug)) {
            return res.status(200).json({ available: false, error: "This name is reserved by the platform." });
        }

        // 2. Check if any project exists with this name globally
        const existingProject = await Project.findOne({ name: slug });
        res.status(200).json({ available: !existingProject });
    } catch (error) {
        console.error("Error checking project name:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;
