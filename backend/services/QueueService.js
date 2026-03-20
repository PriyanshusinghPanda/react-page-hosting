const Project = require("../models/project");

class QueueService {
    constructor() {
        this.queue = [];
        this.activeBuilds = 0;
        this.maxConcurrentBuilds = 2;
    }

    enqueue(job) {
        this.queue.push(job);
        console.log(`[Queue] Job enqueued: ${job.project.name}. Queue size: ${this.queue.length}`);
        this.processNext();
    }

    async processNext() {
        if (this.activeBuilds >= this.maxConcurrentBuilds || this.queue.length === 0) return;

        const job = this.queue.shift();
        this.activeBuilds++;

        try {
            await this.executeJob(job);
        } catch (error) {
            console.error(`[Queue] Error processing job ${job.project.name}:`, error);
        } finally {
            this.activeBuilds--;
            this.processNext();
        }
    }

    async executeJob(job) {
        const { project, config, provider } = job;

        try {
            // Reset logs and mark as BUILDING
            await Project.updateOne(
                { _id: project._id },
                { status: 'BUILDING', logs: ['Starting build...'] }
            );
            console.log(`[Queue] Starting build for ${project.name}`);

            // Run the deployment — K8sProvider returns a handle immediately
            const deploymentHandle = provider.deploy(config);

            // Listen to logs and persist each line to DB
            deploymentHandle.onLog(async (log) => {
                console.log(`[LOG:${project.name}] ${log}`);
                try {
                    await Project.updateOne(
                        { _id: project._id },
                        { $push: { logs: log } }
                    );
                } catch (e) {
                    console.error('[Queue] Failed to persist log:', e.message);
                }
            });

            // On success, mark project as DEPLOYED with URL
            deploymentHandle.onComplete(async () => {
                const baseDomain = process.env.DEPLOY_DOMAIN || 'api-deploydash.nstsdc.org';
                await Project.updateOne(
                    { _id: project._id },
                    {
                        status: 'DEPLOYED',
                        url: `https://${project.name}.${baseDomain}`,
                        $push: { logs: '✅ Build complete. Site is live!' }
                    }
                );
                console.log(`[Queue] Build SUCCESS for ${project.name}`);
            });

            // On failure, mark project as FAILED
            deploymentHandle.onError(async (err) => {
                await Project.updateOne(
                    { _id: project._id },
                    {
                        status: 'FAILED',
                        $push: { logs: `❌ Build failed: ${err.message}` }
                    }
                );
                console.error(`[Queue] Build FAILED for ${project.name}:`, err.message);
            });

        } catch (error) {
            await Project.updateOne(
                { _id: project._id },
                { status: 'FAILED', $push: { logs: `❌ Error: ${error.message}` } }
            );
            console.error(`[Queue] executeJob error for ${project.name}:`, error);
        }
    }
}

module.exports = new QueueService();
