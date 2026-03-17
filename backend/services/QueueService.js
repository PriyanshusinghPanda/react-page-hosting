const Project = require("../models/project");
const LogService = require("./LogService");

class QueueService {
    constructor() {
        this.queue = [];
        this.activeBuilds = 0;
        this.maxConcurrentBuilds = 2; // Limit to 2 concurrent builds locally
    }

    /**
     * @param {Object} job - { project, config, provider, handle }
     */
    enqueue(job) {
        this.queue.push(job);
        console.log(`Job ${job.project.name} enqueued. Queue length: ${this.queue.length}`);
        this.processNext();
    }

    async processNext() {
        if (this.activeBuilds >= this.maxConcurrentBuilds || this.queue.length === 0) {
            return;
        }

        const job = this.queue.shift();
        this.activeBuilds++;

        try {
            await this.executeJob(job);
        } catch (error) {
            console.error(`Error processing job ${job.project.name}:`, error);
        } finally {
            this.activeBuilds--;
            this.processNext();
        }
    }

    async executeJob(job) {
        const { project, config, provider, handle } = job;

        try {
            // Update status to BUILDING
            project.status = 'BUILDING';
            await project.save();
            LogService.appendLog(project.name, "Starting build process...");

            const deploymentHandle = provider.deploy(config);

            // Link the provider's handle to our internal handle
            deploymentHandle.onLog((log) => {
                LogService.appendLog(project.name, log);
                handle.emitLog(log);
            });

            deploymentHandle.onComplete(async (data) => {
                project.status = 'DEPLOYED';
                project.url = `http://${project.name}.localhost:8000`; // Placeholder
                await project.save();
                LogService.appendLog(project.name, "Deployment successful!");
                handle.emitComplete(data);
            });

            deploymentHandle.onError(async (err) => {
                project.status = 'FAILED';
                await project.save();
                LogService.appendLog(project.name, `Deployment failed: ${err.message}`);
                handle.emitError(err);
            });

            // Handle cancellation if the user aborts
            handle.onCancel(() => {
                deploymentHandle.cancel();
            });

        } catch (error) {
            project.status = 'FAILED';
            await project.save();
            handle.emitError(error);
        }
    }
}

module.exports = new QueueService();
