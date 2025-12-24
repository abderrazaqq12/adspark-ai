/**
 * DECISION LAYER (Phase 4)
 * "User Intent → System Decision"
 */
import { getRecommendedEncoders } from './engine-utils.js';

/**
 * Calculates a definitive execution decision based on User Intent and System State.
 * This is the ONLY place where execution strategy is determined.
 */
export function decideExecution(intent, systemState) {
    const {
        primaryGoal = 'balanced',
        platform = 'generic',
        tool,
        priority = 'normal'
    } = intent;

    const {
        isGPU,
        load
    } = systemState;

    // 1. Engine Selection Decision
    // Rule: Always prefer GPU if available, fallback to CPU.
    // User cannot override this.
    const engineStrategy = isGPU ? 'gpu_accelerated' : 'cpu_fallback';
    const encoder = isGPU ? 'h264_nvenc' : 'libx264';

    // 2. Optimization Heuristics
    let preset = 'medium';
    let crf = 23;

    if (primaryGoal === 'quality') {
        preset = isGPU ? 'p6' : 'slow';
        crf = 18;
    } else if (primaryGoal === 'speed') {
        preset = isGPU ? 'p1' : 'ultrafast';
        crf = 28;
    } else {
        // Balanced
        preset = isGPU ? 'p4' : 'fast';
        crf = 23;
    }

    // 3. Platform Constraints (Hard Rules)
    let resolution = { width: 1080, height: 1920 }; // Default 9:16
    let fps = 30;
    let bitrate = '5M';

    if (platform === 'youtube' || platform === 'facebook') {
        resolution = { width: 1920, height: 1080 }; // 16:9
    } else if (platform === 'feed-square') {
        resolution = { width: 1080, height: 1080 }; // 1:1
    }

    if (primaryGoal === 'quality') {
        bitrate = '15M';
        fps = 60;
    }

    // 4. Concurrency & Safety (Load Shedding)
    // If system load is high, downgrade non-priority tasks
    let threads = 0; // Auto
    if (!isGPU && load > 0.8 && priority === 'low') {
        threads = 1; // Throttle to single thread
        preset = 'ultrafast'; // Force speed
    }

    // 5. Construct The Decision
    return {
        decisionId: `dec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        strategy: {
            engine: engineStrategy,
            encoder: encoder,
            hardware: isGPU ? 'nvidia-t4' : 'cpu-generic',
            mode: isGPU ? 'hardware' : 'software'
        },
        parameters: {
            resolution,
            fps,
            bitrate,
            crf,
            preset,
            threads
        },
        constraints: {
            maxDuration: tool === 'replicator' ? 35 : 300,
            watermark: tool === 'replicator' ? false : true, // Example rule
        },
        reasoning: [
            `Engine selected as ${engineStrategy} based on ${isGPU ? 'GPU availability' : 'CPU fallback'}`,
            `optimization set to ${preset} for ${primaryGoal} goal`,
            `Resolution enforce to ${resolution.width}x${resolution.height} for ${platform} platform`
        ]
    };
}
