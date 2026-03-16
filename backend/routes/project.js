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

module.exports = router;
