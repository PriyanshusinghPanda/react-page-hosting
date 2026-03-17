class LogService {
    constructor() {
        this.jobLogs = new Map();
    }

    /**
     * @param {string} jobId 
     * @param {string} log 
     */
    appendLog(jobId, log) {
        if (!this.jobLogs.has(jobId)) {
            this.jobLogs.set(jobId, []);
        }
        this.jobLogs.get(jobId).push({
            timestamp: new Date(),
            message: log
        });
        
        // In a real system, we might push to a WebSocket or Redis Pub/Sub here
        console.log(`[Job ${jobId}]: ${log}`);
    }

    /**
     * @param {string} jobId 
     */
    getLogs(jobId) {
        return this.jobLogs.get(jobId) || [];
    }

    /**
     * @param {string} jobId 
     */
    clearLogs(jobId) {
        this.jobLogs.delete(jobId);
    }
}

// Singleton instance
module.exports = new LogService();
