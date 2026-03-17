const { spawn } = require("child_process");
const DeploymentProvider = require("./DeploymentProvider");
const DeploymentHandle = require("./DeploymentHandle");

class DockerProvider extends DeploymentProvider {
    constructor() {
        super();
        this.activeProcesses = new Map();
    }

    /**
     * @param {Object} config - { gitURL, slug, storageUrl, accessKey, secretKey, bucketName }
     */
    deploy(config) {
        const { gitURL, slug, storageUrl, accessKey, secretKey, bucketName } = config;
        const handle = new DeploymentHandle(slug);

        // Resource limits (Placeholder for future implementation)
        const cpuLimit = "0.5";
        const memoryLimit = "512m";

        const child = spawn("docker", [
            "run", "--rm", "--link", "minio",
            "--cpus", cpuLimit,
            "--memory", memoryLimit,
            "-e", `REPO_URL=${gitURL}`,
            "-e", `JOB_ID=${slug}`,
            "-e", `STORAGE_URL=${storageUrl}`,
            "-e", `STORAGE_ACCESS_KEY=${accessKey}`,
            "-e", `STORAGE_SECRET_KEY=${secretKey}`,
            "-e", `BUCKET_NAME=${bucketName}`,
            "buildserver:latest"
        ]);

        this.activeProcesses.set(slug, child);

        child.stdout.on("data", (data) => {
            handle.emitLog(data.toString());
        });

        child.stderr.on("data", (data) => {
            handle.emitLog(`stderr: ${data.toString()}`);
        });

        child.on("close", (code) => {
            this.activeProcesses.delete(slug);
            if (code === 0) {
                handle.emitComplete({ code, jobId: slug });
            } else {
                handle.emitError(new Error(`Docker process exited with code ${code}`));
            }
        });

        child.on("error", (err) => {
            this.activeProcesses.delete(slug);
            handle.emitError(err);
        });

        // Handle cancellation
        const originalCancel = handle.cancel.bind(handle);
        handle.cancel = () => {
            originalCancel();
            const process = this.activeProcesses.get(slug);
            if (process) {
                process.kill();
                this.activeProcesses.delete(slug);
            }
        };

        return handle;
    }

    async cleanup(jobId) {
        // Docker --rm handles most cleanup, but we can add more logic here if needed
        console.log(`Cleaning up resources for job: ${jobId}`);
    }
}

module.exports = DockerProvider;
