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
        const { gitURL, slug, storageUrl, accessKey, secretKey, bucketName } = config;
        const handle = new DeploymentHandle(slug);
        const jobName = `deploy-job-${slug}-${Date.now()}`;

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

        this.batchApi.createNamespacedJob(this.namespace, jobSpec)
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
        try {
            // 1. Wait for the pod to be created and in 'Running' or 'Succeeded/Failed' state
            let podName = null;
            while (!podName) {
                const pods = await this.coreApi.listNamespacedPod(this.namespace, undefined, undefined, undefined, undefined, `job-name=${jobName}`);
                if (pods.body.items.length > 0) {
                    podName = pods.body.items[0].metadata.name;
                    handle.emitLog(`Targeting pod: ${podName}...`);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // 2. Stream logs from the pod
            const logStream = new k8s.Log(this.kc);
            const stream = await logStream.log(this.namespace, podName, 'builder-container', process.stdout, { follow: true });

            // Since logStream.log can be tricky to capture directly into handle, we can use a custom approach or listen to events
            // For now, we'll use listNamespacedPod to watch status and end the handle on completion
            const watch = new k8s.Watch(this.kc);
            watch.watch(`/api/v1/namespaces/${this.namespace}/pods`, 
                { labelSelector: `job-name=${jobName}` },
                (type, obj) => {
                    if (obj.status.phase === 'Succeeded') {
                        handle.emitComplete({ jobId: jobName });
                    } else if (obj.status.phase === 'Failed') {
                        handle.emitError(new Error("Build job failed inside Kubernetes."));
                    }
                },
                (err) => {
                    if (err) console.error('Watch error:', err);
                }
            );

        } catch (error) {
            handle.emitError(error);
        }
    }

    async cleanup(jobId) {
        // Cleanup the job after completion (standard practice)
        console.log(`Cleaning up K8s Job for ${jobId}`);
        try {
            await this.batchApi.deleteNamespacedJob(jobId, this.namespace, undefined, undefined, undefined, undefined, 'Background');
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

module.exports = K8sProvider;
