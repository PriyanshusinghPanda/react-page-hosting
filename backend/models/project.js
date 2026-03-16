const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['frontend', 'backend', 'static-site', 'web-service', 'private-service', 'background-worker', 'cron-job', 'database'],
        default: 'frontend'
    },
    url: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'building', 'error'],
        default: 'building'
    },
    lastDeployed: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
