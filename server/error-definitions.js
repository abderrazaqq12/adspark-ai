/**
 * FlowScale Error Definitions
 * 
 * Comprehensive error catalog with categorization,
 * recovery actions, and user-friendly messages
 */

export const ERROR_DEFINITIONS = {
    // ==========================================
    // INPUT ERRORS
    // ==========================================

    'INPUT_MISSING_SOURCE': {
        category: 'INPUT_ERROR',
        message: 'No source file or URL provided',
        recovery_action: 'ABORT',
        max_retries: 0,
        user_action: 'Please provide a valid video source file or URL'
    },

    'INPUT_INVALID_FORMAT': {
        category: 'INPUT_ERROR',
        message: 'Unsupported video format',
        recovery_action: 'RETRY_WITH_FALLBACK',
        max_retries: 1,
        fallback: 'Convert to supported format using FFmpeg',
        user_action: 'Use MP4, WebM, MOV, or AVI format'
    },

    'INPUT_FILE_TOO_LARGE': {
        category: 'INPUT_ERROR',
        message: 'File exceeds maximum size limit',
        recovery_action: 'MANUAL_INTERVENTION',
        max_retries: 0,
        user_action: 'Reduce file size or split into smaller segments'
    },

    'INPUT_FILE_CORRUPTED': {
        category: 'INPUT_ERROR',
        message: 'Source file is corrupted or unreadable',
        recovery_action: 'ABORT',
        max_retries: 0,
        user_action: 'Please upload a different file'
    },

    // ==========================================
    // PLAN ERRORS
    // ==========================================

    'PLAN_MISSING_TIMELINE': {
        category: 'PLAN_ERROR',
        message: 'Execution plan has no timeline scenes',
        recovery_action: 'ABORT',
        max_retries: 0,
        user_action: 'Add at least one scene to the timeline'
    },

    'PLAN_INVALID_TRANSITION': {
        category: 'PLAN_ERROR',
        message: 'Unsupported transition effect in timeline',
        recovery_action: 'RETRY_WITH_FALLBACK',
        max_retries: 1,
        fallback: 'Use default fade transition instead',
        user_action: 'Choose a supported transition effect'
    },

    'PLAN_INVALID_DURATION': {
        category: 'PLAN_ERROR',
        message: 'Scene duration is invalid or exceeds limits',
        recovery_action: 'ABORT',
        max_retries: 0,
        user_action: 'Ensure scene duration is between 0.1s and 300s'
    },

    // ==========================================
    // EXECUTION ERRORS
    // ==========================================

    'EXECUTION_TIMEOUT': {
        category: 'EXECUTION_ERROR',
        message: 'Job exceeded maximum execution time',
        recovery_action: 'RETRY',
        max_retries: 1,
        retry_delay_ms: [5000],
        user_action: 'Simplify the video or reduce quality settings'
    },

    'EXECUTION_QUEUE_FULL': {
        category: 'EXECUTION_ERROR',
        message: 'Job queue is full, please try again later',
        recovery_action: 'RETRY',
        max_retries: 3,
        retry_delay_ms: [5000, 10000, 30000]  // Exponential backoff
    },

    'EXECUTION_CRASHED': {
        category: 'EXECUTION_ERROR',
        message: 'Job process crashed unexpectedly',
        recovery_action: 'RETRY',
        max_retries: 2,
        retry_delay_ms: [3000, 10000]
    },

    // ==========================================
    // FFMPEG ERRORS
    // ==========================================

    'FFMPEG_NOT_FOUND': {
        category: 'FFMPEG_ERROR',
        message: 'FFmpeg binary not available on server',
        recovery_action: 'MANUAL_INTERVENTION',
        max_retries: 0,
        admin_action: 'Install FFmpeg on the server'
    },

    'FFMPEG_ENCODING_FAILED': {
        category: 'FFMPEG_ERROR',
        message: 'Video encoding failed',
        recovery_action: 'RETRY_WITH_FALLBACK',
        max_retries: 2,
        fallback: 'Try H.264 codec with lower quality preset',
        retry_delay_ms: [2000, 5000]
    },

    'FFMPEG_INVALID_CODEC': {
        category: 'FFMPEG_ERROR',
        message: 'Requested codec not supported',
        recovery_action: 'RETRY_WITH_FALLBACK',
        max_retries: 1,
        fallback: 'Use libx264 (H.264) codec instead'
    },

    'FFMPEG_INCOMPATIBLE_FORMATS': {
        category: 'FFMPEG_ERROR',
        message: 'Input formats are incompatible for concatenation',
        recovery_action: 'RETRY_WITH_FALLBACK',
        max_retries: 1,
        fallback: 'Re-encode all inputs to matching format first'
    },

    'FFMPEG_AUDIO_SYNC_ERROR': {
        category: 'FFMPEG_ERROR',
        message: 'Audio/video synchronization failed',
        recovery_action: 'RETRY',
        max_retries: 2,
        retry_delay_ms: [2000, 5000]
    },

    // ==========================================
    // STORAGE ERRORS
    // ==========================================

    'STORAGE_DISK_FULL': {
        category: 'STORAGE_ERROR',
        message: 'Server disk space full',
        recovery_action: 'MANUAL_INTERVENTION',
        max_retries: 0,
        admin_action: 'Free up disk space on the server'
    },

    'STORAGE_DRIVE_UPLOAD_FAILED': {
        category: 'STORAGE_ERROR',
        message: 'Failed to upload to Google Drive',
        recovery_action: 'RETRY',
        max_retries: 3,
        retry_delay_ms: [2000, 5000, 10000]
    },

    'STORAGE_SUPABASE_FAILED': {
        category: 'STORAGE_ERROR',
        message: 'Supabase storage operation failed',
        recovery_action: 'RETRY',
        max_retries: 2,
        retry_delay_ms: [3000, 8000]
    },

    'STORAGE_WRITE_FAILED': {
        category: 'STORAGE_ERROR',
        message: 'Failed to write output file',
        recovery_action: 'RETRY',
        max_retries: 2,
        retry_delay_ms: [1000, 3000]
    },

    'STORAGE_READ_FAILED': {
        category: 'STORAGE_ERROR',
        message: 'Failed to read input file',
        recovery_action: 'RETRY',
        max_retries: 2,
        retry_delay_ms: [1000, 3000]
    },

    // ==========================================
    // AUTH ERRORS
    // ==========================================

    'AUTH_TOKEN_EXPIRED': {
        category: 'AUTH_ERROR',
        message: 'Authentication token expired',
        recovery_action: 'MANUAL_INTERVENTION',
        max_retries: 0,
        user_action: 'Please log in again'
    },

    'AUTH_INSUFFICIENT_PERMISSIONS': {
        category: 'AUTH_ERROR',
        message: 'Insufficient permissions for this operation',
        recovery_action: 'ABORT',
        max_retries: 0,
        user_action: 'Contact administrator for access'
    },

    'AUTH_INVALID_PROJECT': {
        category: 'AUTH_ERROR',
        message: 'Project not found or access denied',
        recovery_action: 'ABORT',
        max_retries: 0,
        user_action: 'Select a valid project you own'
    },

    // ==========================================
    // NETWORK ERRORS
    // ==========================================

    'NETWORK_DOWNLOAD_FAILED': {
        category: 'NETWORK_ERROR',
        message: 'Failed to download remote asset',
        recovery_action: 'RETRY',
        max_retries: 3,
        retry_delay_ms: [2000, 5000, 10000]
    },

    'NETWORK_TIMEOUT': {
        category: 'NETWORK_ERROR',
        message: 'Network request timed out',
        recovery_action: 'RETRY',
        max_retries: 2,
        retry_delay_ms: [3000, 8000]
    },

    'NETWORK_CONNECTION_REFUSED': {
        category: 'NETWORK_ERROR',
        message: 'Connection refused by remote server',
        recovery_action: 'RETRY',
        max_retries: 2,
        retry_delay_ms: [5000, 15000]
    },

    'NETWORK_INVALID_URL': {
        category: 'NETWORK_ERROR',
        message: 'Invalid or unreachable URL',
        recovery_action: 'ABORT',
        max_retries: 0,
        user_action: 'Verify the URL is correct and accessible'
    },

    // ==========================================
    // RESOURCE ERRORS
    // ==========================================

    'RESOURCE_OUT_OF_MEMORY': {
        category: 'RESOURCE_ERROR',
        message: 'Insufficient memory to process video',
        recovery_action: 'RETRY_WITH_FALLBACK',
        max_retries: 1,
        fallback: 'Process video in smaller chunks or reduce resolution'
    },

    'RESOURCE_QUOTA_EXCEEDED': {
        category: 'RESOURCE_ERROR',
        message: 'Monthly processing quota exceeded',
        recovery_action: 'MANUAL_INTERVENTION',
        max_retries: 0,
        user_action: 'Upgrade plan or wait for quota reset'
    },

    'RESOURCE_CPU_OVERLOAD': {
        category: 'RESOURCE_ERROR',
        message: 'Server CPU usage too high',
        recovery_action: 'RETRY',
        max_retries: 2,
        retry_delay_ms: [10000, 30000]  // Wait for load to decrease
    }
};

/**
 * Get error definition by code
 */
export function getErrorDefinition(errorCode) {
    return ERROR_DEFINITIONS[errorCode] || {
        category: 'EXECUTION_ERROR',
        message: 'An unexpected error occurred',
        recovery_action: 'RETRY',
        max_retries: 1
    };
}

/**
 * Get all error codes by category
 */
export function getErrorsByCategory(category) {
    return Object.entries(ERROR_DEFINITIONS)
        .filter(([_, def]) => def.category === category)
        .map(([code, def]) => ({ code, ...def }));
}
