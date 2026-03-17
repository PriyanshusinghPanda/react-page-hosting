const DeploymentProvider = require("./DeploymentProvider");
const DeploymentHandle = require("./DeploymentHandle");

/**
 * Skeleton for Kubernetes Deployment Provider.
 * This will eventually interface with the Kubernetes API to create Jobs/Pods.
 */
class K8sProvider extends DeploymentProvider {
    constructor() {
        super();
    }

    /**
     * @param {Object} config 
     * @returns {DeploymentHandle}
     */
    deploy(config) {
        const handle = new DeploymentHandle(config.slug);
        
        // TODO: Implement K8s Job creation using @kubernetes/client-node
        // 1. Create a V1Job object
        // 2. batchV1Api.createNamespacedJob(...)
        // 3. Watch for pod logs and emit to handle
        
        handle.emitLog("K8s Provider initiated (Placeholder)...");
        handle.emitError(new Error("K8s Provider is not yet fully implemented. Using Docker for now."));
        
        return handle;
    }

    async cleanup(jobId) {
        console.log(`Cleaning up K8s resources for job: ${jobId}`);
    }
}

module.exports = K8sProvider;
