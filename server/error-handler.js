/**
 * FlowScale Error Handler
 * 
 * Deterministic error handling with:
 * - Automatic categorization
 * - Retry logic with exponential backoff
 * - State persistence
 * - Recovery action execution
 */

import db from './local-db.js';
import { ERROR_DEFINITIONS, getErrorDefinition } from './error-definitions.js';
import crypto from 'crypto';

class ErrorHandler {
    // ... (keep handle/categorizeError as is, handled by partial replacement if possible, but I'll replace the whole class methods that need change)

    /**
     * Handle an error with automatic categorization and recovery
     * @param {Error} error - The error that occurred
     * @param {object} context - Error context (projectId, jobId, userId, stage)
     * @returns {Promise<{error: object, decision: object}>}
     */
    async handle(error, context) {
        const { projectId, jobId, userId, stage } = context;

        // Categorize error
        const errorInfo = this.categorizeError(error, stage);

        // Persist to database
        const errorRecord = await this.persistError({
            ...errorInfo,
            projectId,
            jobId,
            userId,
            stage
        });

        // Decide recovery action
        const decision = await this.decideRecovery(errorInfo, errorRecord, jobId);

        console.log(`[ErrorHandler] ${errorInfo.error_code}: ${errorInfo.message}`);
        console.log(`[ErrorHandler] Recovery: ${decision.action} (${decision.message})`);

        return {
            error: errorRecord,
            decision
        };
    }

    /**
     * Categorize error by matching patterns
     */
    categorizeError(error, stage) {
        const errorString = JSON.stringify({
            message: error.message,
            code: error.code,
            stderr: error.stderr,
            stdout: error.stdout
        });

        // Try to match known error patterns
        for (const [code, definition] of Object.entries(ERROR_DEFINITIONS)) {
            if (this.matchesPattern(errorString, code, stage)) {
                return {
                    error_code: code,
                    category: definition.category,
                    message: definition.message,
                    recovery_action: definition.recovery_action,
                    max_retries: definition.max_retries,
                    technical_details: error.message || error.toString(),
                    stack_trace: error.stack,
                    ffmpeg_stderr: error.stderr || null
                };
            }
        }

        // Fallback categorization based on stage
        return this.fallbackCategorization(error, stage);
    }

    /**
     * Match error against known patterns
     */
    matchesPattern(errorString, errorCode, stage) {
        const patterns = {
            // Input patterns
            'INPUT_MISSING_SOURCE': /no source|missing.*file|source.*required|source.*undefined/i,
            'INPUT_INVALID_FORMAT': /unsupported.*format|invalid.*format|unknown.*codec/i,
            'INPUT_FILE_TOO_LARGE': /file too large|exceeds.*size|EFBIG/i,
            'INPUT_FILE_CORRUPTED': /corrupted|invalid.*header|premature.*end/i,

            // Plan patterns
            'PLAN_MISSING_TIMELINE': /no timeline|timeline.*empty|missing.*scenes/i,
            'PLAN_INVALID_TRANSITION': /invalid.*transition|unsupported.*effect/i,

            // Execution patterns
            'EXECUTION_TIMEOUT': /timeout|timed out|ETIMEDOUT/i,
            'EXECUTION_QUEUE_FULL': /queue full|too many.*jobs/i,
            'EXECUTION_CRASHED': /segmentation fault|core dumped|SIGSEGV/i,

            // FFmpeg patterns
            'FFMPEG_NOT_FOUND': /ffmpeg.*not found|command not found.*ffmpeg|ENOENT.*ffmpeg/i,
            'FFMPEG_ENCODING_FAILED': /encoding failed|encoder.*error|conversion failed/i,
            'FFMPEG_INVALID_CODEC': /unknown codec|codec.*not found|unsupported codec/i,
            'FFMPEG_INCOMPATIBLE_FORMATS': /incompatible.*format|cannot.*concatenate/i,
            'FFMPEG_AUDIO_SYNC_ERROR': /audio.*sync|pts.*dts|timestamp/i,

            // Storage patterns
            'STORAGE_DISK_FULL': /no space|disk full|ENOSPC/i,
            'STORAGE_DRIVE_UPLOAD_FAILED': /drive.*upload.*failed|upload.*error/i,
            'STORAGE_SUPABASE_FAILED': /supabase.*error|storage.*failed/i,
            'STORAGE_WRITE_FAILED': /write.*failed|EACCES|permission denied.*write/i,
            'STORAGE_READ_FAILED': /read.*failed|ENOENT|file not found/i,

            // Auth patterns
            'AUTH_TOKEN_EXPIRED': /token.*expired|unauthorized|401/i,
            'AUTH_INSUFFICIENT_PERMISSIONS': /permission.*denied|forbidden|403/i,
            'AUTH_INVALID_PROJECT': /project.*not found|invalid.*project/i,

            // Network patterns
            'NETWORK_DOWNLOAD_FAILED': /download.*failed|fetch.*failed/i,
            'NETWORK_TIMEOUT': /ETIMEDOUT|request timeout/i,
            'NETWORK_CONNECTION_REFUSED': /ECONNREFUSED|connection refused/i,
            'NETWORK_INVALID_URL': /invalid.*url|malformed.*url/i,

            // Resource patterns
            'RESOURCE_OUT_OF_MEMORY': /out of memory|ENOMEM|memory.*exhausted/i,
            'RESOURCE_QUOTA_EXCEEDED': /quota.*exceeded|limit.*reached/i,
            'RESOURCE_CPU_OVERLOAD': /cpu.*overload|too many.*processes/i
        };

        const pattern = patterns[errorCode];
        return pattern ? pattern.test(errorString) : false;
    }

    /**
     * Fallback categorization when no pattern matches
     */
    fallbackCategorization(error, stage) {
        const stageCategories = {
            'validation': 'INPUT_ERROR',
            'plan_validation': 'PLAN_ERROR',
            'download': 'NETWORK_ERROR',
            'ffmpeg': 'FFMPEG_ERROR',
            'encode': 'FFMPEG_ERROR',
            'upload': 'STORAGE_ERROR',
            'auth': 'AUTH_ERROR',
            'storage': 'STORAGE_ERROR'
        };

        const category = stageCategories[stage] || 'EXECUTION_ERROR';

        return {
            error_code: `${category}_UNKNOWN`,
            category,
            message: `Error during ${stage}: ${error.message || 'Unknown error'}`,
            recovery_action: 'RETRY',
            max_retries: 1,
            technical_details: error.message || error.toString(),
            stack_trace: error.stack,
            ffmpeg_stderr: error.stderr || null
        };
    }

    /**
     * Persist error to database
     */
    async persistError(errorData) {
        try {
            const stmt = db.prepare(`
                INSERT INTO execution_errors (
                    project_id, job_id, category, message, stack, resolved, created_at
                ) VALUES (?, ?, ?, ?, ?, 0, ?)
            `);

            // Note: Schema simplified in local-db.js compared to Supabase full schema usage here
            // Mapping what I defined: category, message, stack, resolved
            // I should have defined error_code, stage etc. in local-db.js if I want full parity.
            // For now mapping essentials.

            const now = new Date().toISOString();
            stmt.run(
                errorData.projectId,
                errorData.jobId,
                errorData.category,
                `${errorData.error_code}: ${errorData.message}`,
                errorData.stack_trace,
                now
            );

            return {
                ...errorData,
                created_at: now
            };
        } catch (err) {
            console.error('[ErrorHandler] Exception persisting error:', err);
            return {
                id: crypto.randomBytes(16).toString('hex'),
                ...errorData,
                created_at: new Date().toISOString()
            };
        }
    }

    /**
     * Decide recovery action
     */
    async decideRecovery(errorInfo, errorRecord, jobId) {
        const action = errorInfo.recovery_action;
        const definition = getErrorDefinition(errorInfo.error_code);

        // Get current retry count from execution state
        const retryCount = await this.getRetryCount(jobId);
        const maxRetries = errorInfo.max_retries;

        if (action === 'RETRY' && retryCount < maxRetries) {
            const delayMs = this.calculateBackoff(retryCount, definition.retry_delay_ms);
            return {
                action: 'RETRY',
                shouldRetry: true,
                delayMs,
                message: `Will retry in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})`
            };
        }

        if (action === 'RETRY_WITH_FALLBACK' && retryCount < maxRetries) {
            return {
                action: 'RETRY_WITH_FALLBACK',
                shouldRetry: true,
                fallback: definition.fallback,
                message: `Retrying with fallback: ${definition.fallback}`
            };
        }

        if (action === 'MANUAL_INTERVENTION') {
            return {
                action: 'MANUAL_INTERVENTION',
                shouldRetry: false,
                message: definition.user_action || definition.admin_action || 'Manual intervention required'
            };
        }

        return {
            action: 'ABORT',
            shouldRetry: false,
            message: definition.user_action || 'Cannot recover automatically'
        };
    }

    /**
     * Get retry count for a job
     */
    async getRetryCount(jobId) {
        try {
            const row = db.prepare('SELECT retry_count FROM execution_state WHERE job_id = ?').get(jobId);
            return row ? row.retry_count : 0;
        } catch {
            return 0;
        }
    }

    /**
     * Calculate backoff delay
     */
    calculateBackoff(retryCount, customDelays) {
        if (customDelays && customDelays[retryCount]) {
            return customDelays[retryCount];
        }

        // Default exponential backoff: 1s, 2s, 4s, 8s... (max 30s)
        return Math.min(1000 * Math.pow(2, retryCount), 30000);
    }

    /**
     * Schedule retry for a job
     */
    async scheduleRetry(jobId, delayMs) {
        const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

        try {
            // Upsert execution state
            const exists = db.prepare('SELECT 1 FROM execution_state WHERE job_id = ?').get(jobId);

            if (exists) {
                db.prepare(`
                    UPDATE execution_state 
                    SET status = 'paused', next_retry_at = ?, retry_count = retry_count + 1, updated_at = ?
                    WHERE job_id = ?
                `).run(nextRetryAt, new Date().toISOString(), jobId);
            } else {
                db.prepare(`
                    INSERT INTO execution_state (job_id, status, next_retry_at, retry_count, updated_at)
                    VALUES (?, 'paused', ?, 1, ?)
                `).run(jobId, nextRetryAt, new Date().toISOString());
            }

            console.log(`[ErrorHandler] Scheduled retry for job ${jobId} at ${nextRetryAt}`);
            return true;
        } catch (error) {
            console.error('[ErrorHandler] Failed to schedule retry:', error);
            return false;
        }
    }

    /**
     * Mark error as resolved
     */
    async resolveError(errorId, resolutionMethod) {
        try {
            db.prepare('UPDATE execution_errors SET resolved = 1 WHERE id = ?').run(errorId);
            console.log(`[ErrorHandler] Resolved error ${errorId} via ${resolutionMethod}`);
            return true;
        } catch (error) {
            console.error('[ErrorHandler] Failed to resolve error:', error);
            return false;
        }
    }
}


// Export singleton instance
export const errorHandler = new ErrorHandler();
