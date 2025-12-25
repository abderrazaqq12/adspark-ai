/**
 * UGC Error Normalizer
 * Ensures all errors follow FlowScale contract: { stage, engine, reason, retryable }
 * Raw errors like [object Object] are FORBIDDEN
 */

/**
 * Normalize any error into structured format
 * @param {Error|string|object} error - Raw error
 * @param {string} stage - Current execution stage
 * @param {string} engine - Engine that failed
 * @returns {object} Normalized error object
 */
export function normalizeError(error, stage = 'unknown', engine = 'unknown') {
    // Extract message from various error formats
    let reason = 'An unexpected error occurred';
    let retryable = false;

    if (typeof error === 'string') {
        reason = error;
    } else if (error instanceof Error) {
        reason = error.message || error.toString();
    } else if (error && typeof error === 'object') {
        // Handle [object Object] cases
        if (error.message) {
            reason = error.message;
        } else if (error.error) {
            reason = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
        } else if (error.reason) {
            reason = error.reason;
        } else {
            // Last resort: stringify but make it readable
            try {
                const str = JSON.stringify(error);
                reason = str !== '{}' ? str : 'Unknown error object';
            } catch (e) {
                reason = 'Error object could not be serialized';
            }
        }
    }

    // Determine retryability based on error type
    const retryablePatterns = [
        /timeout/i,
        /network/i,
        /connection/i,
        /temporary/i,
        /rate.?limit/i,
        /503/,
        /502/,
        /504/,
        /ECONNRESET/,
        /ETIMEDOUT/,
    ];

    retryable = retryablePatterns.some(pattern => pattern.test(reason));

    return {
        stage,
        engine,
        reason,
        retryable,
        timestamp: new Date().toISOString()
    };
}

/**
 * Create standardized error response
 */
export function errorResponse(res, statusCode, stage, engine, reason, retryable = false) {
    const normalized = {
        ok: false,
        error: {
            stage,
            engine,
            reason,
            retryable,
            timestamp: new Date().toISOString()
        }
    };

    console.error(`[UGC Error] Stage: ${stage} | Engine: ${engine} | ${reason}`);
    return res.status(statusCode).json(normalized);
}

/**
 * Wrap async handler with error normalization
 */
export function withErrorHandling(stage, engine, handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            const normalized = normalizeError(error, stage, engine);
            console.error(`[UGC Error] ${JSON.stringify(normalized)}`);
            res.status(500).json({ ok: false, error: normalized });
        }
    };
}
