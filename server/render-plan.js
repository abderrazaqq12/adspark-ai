import { getRecommendedEncoders } from './engine-utils.js';

/**
 * RENDER PLAN COMPILER - Phase 2B
 * The Single Source of Truth for FFmpeg execution.
 */

const COST_UNITS = {
    CPU_PER_MIN: 10,
    GPU_PER_MIN: 5,
    AI_TRANSCRIPTION_PER_MIN: 20,
    AI_GENERATION_PER_MIN: 100
};

export function compileRenderPlan(jobRequest) {
    const {
        type,
        input,
        priority = 'normal'
    } = jobRequest;

    const caps = getRecommendedEncoders();

    // 1. Determine Dimensions & Framerate
    const resolution = input.resolution || { width: 1080, height: 1920 }; // Default 9:16
    const fps = input.fps || 30;

    // 2. Calculate Expected Duration
    let durationSec = 0;
    if (type === 'execute' && input.trim) {
        durationSec = (input.trim.end || 0) - (input.trim.start || 0);
    } else if (type === 'execute-plan' && input.plan?.validation?.total_duration_ms) {
        durationSec = input.plan.validation.total_duration_ms / 1000;
    } else if (type === 'complex' && input.maxDuration) {
        durationSec = input.maxDuration;
    } else if (input.duration) {
        durationSec = input.duration;
    }

    if (durationSec <= 0) durationSec = 30; // Default fallback

    // 3. Encoder Selection
    const encoder = caps.h264;
    const isGPU = caps.isGPU;

    // 4. Extract Overlays & Subtitles
    const overlays = {
        text: input.textOverlays || [],
        images: input.imageOverlays || [],
        watermark: input.watermark || null
    };

    const subtitles = input.subtitles || null;

    // 5. Filter Strategy
    const filters = [];

    // Scaling/Padding to fit target resolution
    // We want to force the exact resolution for determinism
    filters.push(`scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease`);
    filters.push(`pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`);
    filters.push(`setsar=1`);

    // 6. Audio Strategy
    const audio = {
        normalization: input.audio?.normalization ?? true,
        mix: input.audio?.mix ?? true,
        channels: 2,
        sampleRate: 44100,
        backgroundMusic: input.backgroundMusic || null,
        voiceover: input.voiceover || null
    };

    // 7. Estimation
    // Rule: GPU is ~5x faster than real-time for 1080p, CPU is ~1.5x
    const speedFactor = isGPU ? 5.0 : 1.5;
    const estimatedRenderTimeSec = Math.ceil(durationSec / speedFactor) + 5; // +5s buffer

    // 8. Cost Calculation
    const costPerMin = isGPU ? COST_UNITS.GPU_PER_MIN : COST_UNITS.CPU_PER_MIN;
    const estimatedCost = (durationSec / 60) * costPerMin;

    // 9. The Immutable Render Plan
    const plan = {
        version: '2B-2',
        id: `plan_${Date.now()}`,
        jobType: type,
        execution: {
            encoder,
            isGPU,
            resolution,
            fps,
            durationSec,
            threads: isGPU ? 0 : 2, // 0 means auto for many encoders
        },
        videoFilters: filters,
        overlays,
        subtitles,
        audioStrategy: audio,
        estimation: {
            renderTimeSec: estimatedRenderTimeSec,
            costUnits: parseFloat(estimatedCost.toFixed(2)),
            priority
        },
        determinism: {
            pixelFormat: 'yuv420p',
            colorspace: 'bt709',
            crf: 23,
            preset: isGPU ? 'p4' : 'fast'
        },
        createdAt: new Date().toISOString()
    };

    return plan;
}
