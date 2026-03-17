class DeploymentHandle {
    constructor(jobId) {
        this.jobId = jobId;
        this.logCallbacks = [];
        this.completeCallbacks = [];
        this.errorCallbacks = [];
        this.cancelCallbacks = [];
        this.isCancelled = false;
    }

    onLog(callback) {
        this.logCallbacks.push(callback);
    }

    onComplete(callback) {
        this.completeCallbacks.push(callback);
    }

    onError(callback) {
        this.errorCallbacks.push(callback);
    }

    onCancel(callback) {
        this.cancelCallbacks.push(callback);
    }

    emitLog(log) {
        if (this.isCancelled) return;
        this.logCallbacks.forEach(cb => cb(log));
    }

    emitComplete(data) {
        if (this.isCancelled) return;
        this.completeCallbacks.forEach(cb => cb(data));
    }

    emitError(error) {
        if (this.isCancelled) return;
        this.errorCallbacks.forEach(cb => cb(error));
    }

    cancel() {
        this.isCancelled = true;
        this.cancelCallbacks.forEach(cb => cb());
        // Logic to stop the actual process will be handled by the provider
    }
}

module.exports = DeploymentHandle;
