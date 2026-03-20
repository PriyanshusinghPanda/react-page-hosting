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

    deploy(config) {
        const { gitURL, slug, storageUrl, accessKey, secretKey, bucketName } = config;
        const handle = new DeploymentHandle(slug);
        const jobName = `deploy-job-${slug.toLowerCase()}-${Date.now()}`;

        const jobSpec = {
            apiVersion: 'batch/v1',
            kind: 'Job',
            metadata: { name: jobName, namespace: this.namespace },
            spec: {
                template: {
                    spec: {
                        containers: [{
                            name: 'builder-container',
                            image: process.env.BUILDER_IMAGE || 'deploy-builder:latest',
                            imagePullPolicy: 'Never',
                            env: [
                                { name: 'REPO_URL', value: gitURL },
                                { name: 'JOB_ID', value: slug },
                                { name: 'STORAGE_URL', value: storageUrl },
                                { name: 'MINIO_ACCESS_KEY', value: accessKey },
                                { name: 'MINIO_SECRET_KEY', value: secretKey },
                                { name: 'BUCKET_NAME', value: bucketName },
                            ],
                            resources: {
                                limits: { cpu: '1000m', memory: '1Gi' },
                                requests: { cpu: '250m', memory: '256Mi' }
                            }
                        }],
                        restartPolicy: 'Never',
                    }
                },
                backoffLimit: 0,
            }
        };

        this.batchApi.createNamespacedJob({ namespace: this.namespace, body: jobSpec })
            .then(() => {
                handle.emitLog(`Kubernetes Job created: ${jobName}`);
                this._pollLogs(jobName, handle);
            })
            .catch((err) => {
                handle.emitError(new Error(`Failed to create Kubernetes job: ${err.message}`));
            });

        return handle;
    }

    _pollLogs(jobName, handle) {
        let lastLogLength = 0;
        let jobCompleted = false;
        let intervalId;

        const poll = async () => {
            if (jobCompleted) return;

            try {
                // Step 1: Find the pod for this job
                const podListRes = await this.coreApi.listNamespacedPod({
                    namespace: this.namespace,
                    labelSelector: `job-name=${jobName}`
                });

                const items = (podListRes.body && podListRes.body.items) ? podListRes.body.items : [];

                if (items.length > 0) {
                    const pod = items[0];
                    const phase = pod.status && pod.status.phase;

                    // Check for image pull failures — fail fast
                    const containerStatuses = pod.status && pod.status.containerStatuses;
                    if (containerStatuses && containerStatuses.length > 0) {
                        const waiting = containerStatuses[0].state && containerStatuses[0].state.waiting;
                        if (waiting && (waiting.reason === 'ImagePullBackOff' || waiting.reason === 'ErrImagePull')) {
                            jobCompleted = true;
                            clearInterval(intervalId);
                            handle.emitLog(`❌ Image pull failed: ${waiting.message || waiting.reason}`);
                            handle.emitError(new Error(`Image pull failed: ${waiting.reason}. Check that the builder image exists and is accessible.`));
                            setTimeout(() => this._cleanup(jobName), 5000);
                            return;
                        }
                    }

                    // Step 2: Fetch logs if pod is active
                    if (phase === 'Running' || phase === 'Succeeded' || phase === 'Failed') {
                        try {
                            const logRes = await this.coreApi.readNamespacedPodLog({
                                name: pod.metadata.name,
                                namespace: this.namespace,
                                container: 'builder-container'
                            });

                            // The log content is in the body as a plain string
                            const logText = logRes.body;

                            if (logText && typeof logText === 'string' && logText.length > lastLogLength) {
                                const newText = logText.substring(lastLogLength);
                                newText.split('\n').forEach(line => {
                                    if (line.trim()) handle.emitLog(line);
                                });
                                lastLogLength = logText.length;
                            }
                        } catch (logErr) {
                            console.error('[K8sProvider] Pod log fetch error:', logErr.message || logErr);
                        }
                    }

                    // Step 3: Exit if pod is done
                    if (phase === 'Succeeded') {
                        jobCompleted = true;
                        clearInterval(intervalId);
                        handle.emitComplete({ jobId: jobName });
                        setTimeout(() => this._cleanup(jobName), 15000);
                        return;
                    }
                    if (phase === 'Failed') {
                        jobCompleted = true;
                        clearInterval(intervalId);
                        handle.emitError(new Error('Build pod failed.'));
                        setTimeout(() => this._cleanup(jobName), 15000);
                        return;
                    }
                }
            } catch (err) {
                console.error('[K8sProvider] Poll error:', err.message || err);
            }
        };

        // Run immediately, then every 3 seconds
        poll();
        intervalId = setInterval(poll, 3000);

        handle.onCancel(() => {
            clearInterval(intervalId);
            jobCompleted = true;
        });
    }

    async _cleanup(jobName) {
        try {
            await this.batchApi.deleteNamespacedJob({
                name: jobName,
                namespace: this.namespace,
                propagationPolicy: 'Background'
            });
            console.log(`[K8sProvider] Cleaned up job: ${jobName}`);
        } catch (err) {
            console.error(`[K8sProvider] Cleanup error for ${jobName}:`, err.message);
        }
    }
}

module.exports = K8sProvider;
