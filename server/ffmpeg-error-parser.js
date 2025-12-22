/**
 * FFmpeg Error Parser
 * 
 * Parses FFmpeg stderr output to extract meaningful errors
 */

/**
 * Parse FFmpeg stderr and extract error information
 * @param {string} stderr - FFmpeg stderr output
 * @returns {object} Parsed error info
 */
export function parseFFmpegError(stderr) {
    if (!stderr) {
        return {
            category: 'FFMPEG_ERROR',
            message: 'FFmpeg failed with no output',
            details: null
        };
    }

    const stderrLower = stderr.toLowerCase();

    // Codec errors
    if (stderrLower.includes('unknown codec') || stderrLower.includes('codec not found')) {
        const codecMatch = stderr.match(/codec[:\s]+['"]?([a-z0-9_]+)/i);
        return {
            category: 'FFMPEG_ERROR',
            code: 'FFMPEG_INVALID_CODEC',
            message: 'Requested codec not supported',
            details: codecMatch ? `Codec: ${codecMatch[1]}` : null
        };
    }

    // Encoding errors
    if (stderrLower.includes('encoding failed') || stderrLower.includes('encoder') && stderrLower.includes('error')) {
        return {
            category: 'FFMPEG_ERROR',
            code: 'FFMPEG_ENCODING_FAILED',
            message: 'Video encoding failed',
            details: extractLastError(stderr)
        };
    }

    // Format errors
    if (stderrLower.includes('invalid data') || stderrLower.includes('invalid file') || stderrLower.includes('moov atom not found')) {
        return {
            category: 'INPUT_ERROR',
            code: 'INPUT_FILE_CORRUPTED',
            message: 'Source file is corrupted or invalid',
            details: extractLastError(stderr)
        };
    }

    // Format incompatibility
    if (stderrLower.includes('could not write header') || stderrLower.includes('incompatible')) {
        return {
            category: 'FFMPEG_ERROR',
            code: 'FFMPEG_INCOMPATIBLE_FORMATS',
            message: 'Input formats are incompatible',
            details: extractLastError(stderr)
        };
    }

    // Audio sync errors
    if (stderrLower.includes('pts') && (stderrLower.includes('dts') || stderrLower.includes('timestamp'))) {
        return {
            category: 'FFMPEG_ERROR',
            code: 'FFMPEG_AUDIO_SYNC_ERROR',
            message: 'Audio/video synchronization failed',
            details: 'Timestamp mismatch detected'
        };
    }

    // Permission errors
    if (stderrLower.includes('permission denied') || stderrLower.includes('access denied')) {
        return {
            category: 'STORAGE_ERROR',
            code: 'STORAGE_WRITE_FAILED',
            message: 'Permission denied writing output file',
            details: extractLastError(stderr)
        };
    }

    // Disk space errors
    if (stderrLower.includes('no space') || stderrLower.includes('disk full')) {
        return {
            category: 'STORAGE_ERROR',
            code: 'STORAGE_DISK_FULL',
            message: 'Server disk space full',
            details: null
        };
    }

    // Memory errors
    if (stderrLower.includes('out of memory') || stderrLower.includes('cannot allocate')) {
        return {
            category: 'RESOURCE_ERROR',
            code: 'RESOURCE_OUT_OF_MEMORY',
            message: 'Insufficient memory to process video',
            details: extractLastError(stderr)
        };
    }

    // Generic FFmpeg error
    return {
        category: 'FFMPEG_ERROR',
        code: 'FFMPEG_ERROR_UNKNOWN',
        message: 'FFmpeg processing failed',
        details: extractLastError(stderr)
    };
}

/**
 * Extract the last meaningful error line from stderr
 */
function extractLastError(stderr) {
    const lines = stderr.split('\n').filter(l => l.trim());

    // Look for lines starting with error indicators
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].toLowerCase();
        if (line.includes('error') || line.includes('failed') || line.includes('invalid')) {
            return lines[i].trim();
        }
    }

    // Return last non-empty line
    return lines[lines.length - 1] || 'Unknown FFmpeg error';
}

/**
 * Enhance error with FFmpeg-specific information
 * @param {Error} error - Original error
 * @param {string} stderr - FFmpeg stderr
 * @returns {Error} Enhanced error
 */
export function enhanceFFmpegError(error, stderr) {
    const parsed = parseFFmpegError(stderr);

    error.ffmpegParsed = parsed;
    error.stderr = stderr;
    error.message = `${parsed.message}${parsed.details ? ': ' + parsed.details : ''}`;

    return error;
}
