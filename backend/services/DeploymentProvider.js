/**
 * Abstract class for Deployment Providers.
 * Should be extended by specific implementations like DockerProvider or K8sProvider.
 */
class DeploymentProvider {
    /**
     * @param {Object} config - Deployment configuration (gitURL, slug, etc.)
     * @returns {DeploymentHandle}
     */
    deploy(config) {
        throw new Error("Method 'deploy()' must be implemented.");
    }

    /**
     * @param {string} jobId 
     */
    async cleanup(jobId) {
        throw new Error("Method 'cleanup()' must be implemented.");
    }
}

module.exports = DeploymentProvider;
