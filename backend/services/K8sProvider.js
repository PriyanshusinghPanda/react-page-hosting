const k8s = require('@kubernetes/client-node');
const DeploymentProvider = require("./DeploymentProvider");
const DeploymentHandle = require("./DeploymentHandle");

class K8sProvider extends DeploymentProvider {
    constructor() {
        super();
        this.kc = new k8s.KubeConfig();
        this.kc.loadFromDefault();
        this.batchApi = this.kc.makeApiClient(k8s.BatchV1Api);
        this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
        this.namespace = process.env.K8S_NAMESPACE || 'default';
    }

    /**
     * @param {Object} config - { gitURL, slug, storageUrl, accessKey, secretKey, bucketName }
     * @returns {DeploymentHandle}
     */
    deploy(config) {
        const { gitURL, slug, storageUrl, accessKey, secretKey, bucketName, outputDir } = config;
        const handle = new DeploymentHandle(slug);
        const jobName = `deploy-job-${slug.toLowerCase()}-${Date.now()}`;

        const jobSpec = {
            apiVersion: 'batch/v1',
            kind: 'Job',
            metadata: {
                name: jobName,
                namespace: this.namespace,
            },
            spec: {
                template: {
                    spec: {
                        containers: [
                            {
                                name: 'builder-container',
                                image: process.env.BUILDER_IMAGE || 'buildserver:latest',
                                env: [
                                    { name: 'REPO_URL', value: gitURL },
                                    { name: 'JOB_ID', value: slug },
                                    { name: 'STORAGE_URL', value: storageUrl },
                                    { name: 'STORAGE_ACCESS_KEY', value: accessKey },
                                    { name: 'STORAGE_SECRET_KEY', value: secretKey },
                                    { name: 'BUCKET_NAME', value: bucketName },
                                ],
                                resources: {
                                    limits: {
                                        cpu: '500m',
                                        memory: '512Mi',
                                    },
                                    requests: {
                                        cpu: '250m',
                                        memory: '256Mi',
                                    },
                                },
                            },
                        ],
                        restartPolicy: 'Never',
                    },
                },
                backoffLimit: 2,
            },
        };

        this.batchApi.createNamespacedJob({
            namespace: this.namespace,
            body: jobSpec
        })
            .then(async (response) => {
                handle.emitLog(`Kubernetes Job created: ${jobName}`);
                await this.streamLogs(jobName, handle);
            })
            .catch((err) => {
                console.error('Error creating K8s job:', err);
                handle.emitError(new Error(`Failed to create Kubernetes job: ${err.message}`));
            });

        return handle;
    }

    async streamLogs(jobName, handle) {
        let lastLogLength = 0;
        let jobCompleted = false;

        let intervalId;
        const pollLogic = async () => {
            if (jobCompleted) {
                if (intervalId) clearInterval(intervalId);
                return;
            }

            try {
                // 1. ALWAYS try to fetch logs first
                const podList = await this.coreApi.listNamespacedPod({
                    namespace: this.namespace,
                    labelSelector: `job-name=${jobName}`
                });

                const pods = podList.body.items || [];
                if (pods.length > 0) {
                    const pod = pods[0];
                    const podName = pod.metadata.name;

                    if (pod.status.phase === 'Running' || pod.status.phase === 'Succeeded' || pod.status.phase === 'Failed') {
                        try {
                            const logResponse = await this.coreApi.readNamespacedPodLog({
                                name: podName,
                                namespace: this.namespace,
                                container: 'builder-container'
                            });

                            const fullLog = logResponse.body;

                            if (fullLog && typeof fullLog === 'string' && fullLog.length > lastLogLength) {
                                const newContent = fullLog.substring(lastLogLength);
                                const lines = newContent.split('\n');
                                lines.forEach((line, index) => {
                                    if (line || index < lines.length - 1) {
                                        handle.emitLog(line);
                                    }
                                });
                                lastLogLength = fullLog.length;
                            }
                        } catch (logErr) {
                            // Silently ignore log fetch errors
                        }
                    }
                }

                // 2. Check Job Status AFTER log attempt
                const jobStatusRes = await this.batchApi.readNamespacedJobStatus({
                    name: jobName,
                    namespace: this.namespace
                });

                const jobStatus = jobStatusRes.body;

                if (jobStatus.status && jobStatus.status.succeeded > 0) {
                    jobCompleted = true;
                    if (intervalId) clearInterval(intervalId);
                    handle.emitComplete({ jobId: jobName });
                    setTimeout(() => this.cleanup(jobName), 10000);
                    return;
                } else if (jobStatus.status && jobStatus.status.failed > 0) {
                    jobCompleted = true;
                    if (intervalId) clearInterval(intervalId);
                    handle.emitError(new Error("Build job failed in Kubernetes. Check logs for details."));
                    setTimeout(() => this.cleanup(jobName), 10000);
                    return;
                }
            } catch (err) {
                console.error("Polling error in K8sProvider:", err);
            }
        };

        // Run immediately then start interval
        pollLogic();
        intervalId = setInterval(pollLogic, 3000);

        handle.onCancel(() => {
            clearInterval(intervalId);
            jobCompleted = true;
        });
    }

    async cleanup(jobId) {
        // Cleanup the job after completion (standard practice)
        console.log(`Cleaning up K8s Job for ${jobId}`);
        try {
            await this.batchApi.deleteNamespacedJob({
                name: jobId,
                namespace: this.namespace,
                propagationPolicy: 'Background'
            });
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

module.exports = K8sProvider;
