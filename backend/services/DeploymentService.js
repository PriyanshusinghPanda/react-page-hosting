const DockerProvider = require("./DockerProvider");
const K8sProvider = require("./K8sProvider");
const QueueService = require("./QueueService");
const DeploymentHandle = require("./DeploymentHandle");
const Project = require("../models/project");

class DeploymentService {
    constructor() {
        this.providers = {
            docker: new DockerProvider(),
            k8s: new K8sProvider() 
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

        // 2. Select provider (k8s | docker)
        const strategy = process.env.DEPLOY_STRATEGY || 'docker';
        const provider = this.providers[strategy];

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
