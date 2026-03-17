const DockerProvider = require("./DockerProvider");
const QueueService = require("./QueueService");
const DeploymentHandle = require("./DeploymentHandle");
const Project = require("../models/project");

class DeploymentService {
    constructor() {
        this.providers = {
            docker: new DockerProvider(),
            // k8s: new K8sProvider() // Future implementation
        };
    }

    /**
     * @param {Object} projectData - Data from the project model
     * @param {Object} buildConfig - Build settings (gitURL, commands, etc.)
     * @returns {DeploymentHandle}
     */
    async startDeployment(projectData, buildConfig) {
        // 1. Create a job-specific handle for the route to listen to
        const handle = new DeploymentHandle(projectData.name);

        // 2. Select provider (defaulting to docker for now)
        const providerName = process.env.RUN_ENV === 'production' ? 'docker' : 'docker';
        const provider = this.providers[providerName];

        if (!provider) {
            throw new Error(`Provider ${providerName} not found`);
        }

        // 3. Mark project as QUEUED in DB
        const project = await Project.findById(projectData._id);
        project.status = 'QUEUED';
        await project.save();

        // 4. Enqueue the build
        QueueService.enqueue({
            project,
            config: buildConfig,
            provider,
            handle
        });

        return handle;
    }
}

module.exports = new DeploymentService();
