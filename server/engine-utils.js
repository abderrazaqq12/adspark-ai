import { execSync } from 'child_process';
import os from 'os';

/**
 * ENGINE UTILS - Phase 2B
 * Handles hardware detection and encoder selection logic.
 */

let engineCache = null;
let lastCheck = 0;
const CACHE_TTL = 300000; // 5 minutes

export function detectEngineCapabilities() {
    const now = Date.now();
    if (engineCache && (now - lastCheck) < CACHE_TTL) {
        return engineCache;
    }

    const capabilities = {
        ffmpeg: {
            available: false,
            version: null
        },
        gpu: {
            available: false,
            vendor: null,
            count: 0,
            encoders: []
        },
        cpu: {
            cores: os.cpus().length,
            arch: os.arch(),
            encoders: ['libx264', 'libx265']
        },
        bestEncoder: 'libx264',
        bestHevcEncoder: 'libx265'
    };

    try {
        // 1. Check FFmpeg
        const versionOutput = execSync('ffmpeg -version 2>&1', { encoding: 'utf-8' });
        const match = versionOutput.match(/ffmpeg version (\S+)/);
        capabilities.ffmpeg.available = true;
        capabilities.ffmpeg.version = match ? match[1] : 'unknown';

        // 2. Check Encoders
        const encodersOutput = execSync('ffmpeg -encoders 2>&1', { encoding: 'utf-8' });

        // NVIDIA NVENC
        if (encodersOutput.includes('h264_nvenc')) capabilities.gpu.encoders.push('h264_nvenc');
        if (encodersOutput.includes('hevc_nvenc')) capabilities.gpu.encoders.push('hevc_nvenc');

        // Intel QuickSync
        if (encodersOutput.includes('h264_qsv')) capabilities.gpu.encoders.push('h264_qsv');
        if (encodersOutput.includes('hevc_qsv')) capabilities.gpu.encoders.push('hevc_qsv');

        // VAAPI (Generic Linux)
        if (encodersOutput.includes('h264_vaapi')) capabilities.gpu.encoders.push('h264_vaapi');
        if (encodersOutput.includes('hevc_vaapi')) capabilities.gpu.encoders.push('hevc_vaapi');

        // 3. Detect Hardware via nvidia-smi (if NVIDIA present)
        try {
            execSync('nvidia-smi -L', { stdio: 'ignore' });
            capabilities.gpu.available = true;
            capabilities.gpu.vendor = 'nvidia';
            const gpuCount = execSync('nvidia-smi -L | wc -l', { encoding: 'utf-8' }).trim();
            capabilities.gpu.count = parseInt(gpuCount) || 1;
        } catch (e) {
            // No NVIDIA SMI, maybe others in future
        }

        // 4. Select Best Encoder
        if (capabilities.gpu.encoders.includes('h264_nvenc')) {
            capabilities.bestEncoder = 'h264_nvenc';
        } else if (capabilities.gpu.encoders.includes('h264_vaapi')) {
            capabilities.bestEncoder = 'h264_vaapi';
        } else if (capabilities.gpu.encoders.includes('h264_qsv')) {
            capabilities.bestEncoder = 'h264_qsv';
        }

        if (capabilities.gpu.encoders.includes('hevc_nvenc')) {
            capabilities.bestHevcEncoder = 'hevc_nvenc';
        } else if (capabilities.gpu.encoders.includes('hevc_vaapi')) {
            capabilities.bestHevcEncoder = 'hevc_vaapi';
        }

    } catch (err) {
        console.error('[EngineUtils] Detection failed:', err.message);
    }

    engineCache = capabilities;
    lastCheck = now;
    return capabilities;
}

/**
 * Returns prioritized encoder list based on current hardware
 */
export function getRecommendedEncoders() {
    const caps = detectEngineCapabilities();
    return {
        h264: caps.bestEncoder,
        hevc: caps.bestHevcEncoder,
        isGPU: caps.bestEncoder !== 'libx264'
    };
}
