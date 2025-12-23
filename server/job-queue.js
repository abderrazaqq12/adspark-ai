import { detectEngineCapabilities } from './engine-utils.js';

/**
 * JOB QUEUE MANAGER - Phase 2B
 * Handles prioritization, concurrency control and overload protection.
 */

export class JobQueueManager {
    constructor(app) {
        this.app = app;
        this.jobs = new Map(); // All jobs (in-memory persistent for current session)
        this.pendingQueue = []; // Array of { jobId, priority, addedAt }
        this.currentJobs = new Set(); // Currently running job IDs
        this.maxQueueDepth = 100;
        this.concurrency = {
            gpu: 1, // Default to 1 per GPU detected
            cpu: 1  // Default to 1 for CPU fallback
        };

        this.status = {
            overloaded: false,
            lastProcessed: null
        };
    }

    initialize() {
        const caps = detectEngineCapabilities();
        this.concurrency.gpu = caps.gpu.count || 1;
        // We limit CPU to 1 to keep server responsive, or more if many cores
        this.concurrency.cpu = Math.max(1, Math.floor(caps.cpu.cores / 4));

        console.log(`[Queue] Initialized: GPU Concurrency=${this.concurrency.gpu}, CPU Concurrency=${this.concurrency.cpu}`);
    }

    addJob(jobId, jobData, priority = 'normal') {
        if (this.pendingQueue.length >= this.maxQueueDepth) {
            throw new Error('QUEUE_OVERFLOW: Server is currently overloaded. Please try again later.');
        }

        this.jobs.set(jobId, jobData);
        this.pendingQueue.push({
            id: jobId,
            priority: this.getPriorityValue(priority),
            addedAt: Date.now()
        });

        // Sort queue by priority (desc) then by addedAt (asc)
        this.sortQueue();

        console.log(`[Queue] Job ${jobId} added. Position: ${this.pendingQueue.findIndex(p => p.id === jobId) + 1}/${this.pendingQueue.length}`);
    }

    getPriorityValue(p) {
        const map = { 'high': 100, 'normal': 50, 'low': 10 };
        return map[p] || 50;
    }

    sortQueue() {
        this.pendingQueue.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return a.addedAt - b.addedAt;
        });
    }

    getNextJob() {
        // Determine active slot availability
        const caps = detectEngineCapabilities();
        const activeCount = this.currentJobs.size;
        const maxActive = caps.gpu.available ? this.concurrency.gpu : this.concurrency.cpu;

        if (activeCount >= maxActive) {
            return null;
        }

        if (this.pendingQueue.length === 0) {
            return null;
        }

        const next = this.pendingQueue.shift();
        this.currentJobs.add(next.id);
        return next.id;
    }

    completeJob(jobId) {
        this.currentJobs.delete(jobId);
        this.status.lastProcessed = Date.now();
    }

    getStats() {
        const caps = detectEngineCapabilities();
        const jobArray = Array.from(this.jobs.values());

        return {
            active: this.currentJobs.size,
            waiting: this.pendingQueue.length,
            capacity: caps.gpu.available ? this.concurrency.gpu : this.concurrency.cpu,
            totalJobs: this.jobs.size,
            completed: jobArray.filter(j => j.status === 'done').length,
            failed: jobArray.filter(j => j.status === 'error').length,
            overloaded: this.pendingQueue.length >= this.maxQueueDepth * 0.9,
            estimatedWaitTimeSec: this.calculateWaitTime()
        };
    }

    calculateWaitTime() {
        if (this.pendingQueue.length === 0) return 0;

        // Average render time is ~45s (placeholder)
        const avgTimePerJob = 45;
        const caps = detectEngineCapabilities();
        const throughputPerSec = (caps.gpu.available ? this.concurrency.gpu : this.concurrency.cpu) / avgTimePerJob;

        return Math.ceil(this.pendingQueue.length / (throughputPerSec || 1));
    }

    getJob(jobId) {
        return this.jobs.get(jobId);
    }
}
