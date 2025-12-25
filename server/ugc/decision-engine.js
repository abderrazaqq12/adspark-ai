/**
 * UGC Decision Engine
 * System decides execution parameters - UI only collects intent
 * No direct UI control of execution
 */

/**
 * Avatar Engine Configuration
 * Defines the fallback chain for avatar generation
 */
const AVATAR_ENGINE_STACK = {
    primary: 'nanobana',
    fallback: 'sdxl_personas',
    qualityGuard: 'insightface',
    animator: 'liveportrait',
    animatorFallback: 'sadtalker',
    assembler: 'ffmpeg'
};

/**
 * Engine availability status (checked at runtime)
 * Set to false when API is not configured
 */
const ENGINE_STATUS = {
    nanobana: { available: false, reason: 'API not configured' },
    sdxl_personas: { available: false, reason: 'API not configured' },
    insightface: { available: false, reason: 'Model not loaded' },
    liveportrait: { available: false, reason: 'API not configured' },
    sadtalker: { available: false, reason: 'API not configured' },
    ffmpeg: { available: true, reason: null }, // Always available on VPS
    elevenlabs: { available: false, reason: 'API key required' }, // Requires user API key
    dicebear: { available: true, reason: null }, // Fallback placeholder
};

/**
 * Market-specific voice configurations
 */
const MARKET_VOICE_CONFIG = {
    SAUDI_ARABIA: {
        language: 'ARABIC',
        voicePresets: ['ar-daniel', 'ar-brian', 'ar-sarah', 'ar-lily'],
        defaultVoice: 'ar-daniel'
    },
    PANAMA: {
        language: 'SPANISH',
        voicePresets: ['es-george', 'es-liam', 'es-laura', 'es-matilda'],
        defaultVoice: 'es-george'
    },
    USA: {
        language: 'ENGLISH',
        voicePresets: ['en-adam', 'en-josh', 'en-rachel', 'en-emily'],
        defaultVoice: 'en-adam'
    }
};

/**
 * Marketing framework rotation config
 */
const FRAMEWORK_ROTATION = ['PAS', 'AIDA', 'TESTIMONIAL', 'PROBLEM_FIRST'];

/**
 * Make avatar generation decision based on intent
 * @param {object} intent - User intent { market, language, gender, productCategory }
 * @returns {object} Decision with engine selection and fallback chain
 */
export function decideAvatarGeneration(intent) {
    const { market = 'SAUDI_ARABIA', language = 'ARABIC', gender = 'ALL', productCategory = 'general' } = intent;

    // Build decision trace
    const trace = {
        intent: { market, language, gender, productCategory },
        decision: null,
        engineChain: [],
        fallbacksTriggered: [],
        timestamp: new Date().toISOString()
    };

    // Check primary engine
    if (ENGINE_STATUS.nanobana.available) {
        trace.engineChain.push({ engine: 'nanobana', status: 'selected', reason: 'Primary engine available' });
        trace.decision = 'nanobana';
    } else {
        trace.fallbacksTriggered.push({ from: 'nanobana', reason: ENGINE_STATUS.nanobana.reason });

        // Try SDXL fallback
        if (ENGINE_STATUS.sdxl_personas.available) {
            trace.engineChain.push({ engine: 'sdxl_personas', status: 'selected', reason: 'Fallback after Nanobana unavailable' });
            trace.decision = 'sdxl_personas';
        } else {
            trace.fallbacksTriggered.push({ from: 'sdxl_personas', reason: ENGINE_STATUS.sdxl_personas.reason });

            // Ultimate fallback: DiceBear placeholder
            trace.engineChain.push({ engine: 'dicebear', status: 'selected', reason: 'All AI engines unavailable - using placeholder' });
            trace.decision = 'dicebear';
        }
    }

    // Quality guard status
    trace.qualityGuard = {
        engine: 'insightface',
        enabled: ENGINE_STATUS.insightface.available,
        bypassReason: ENGINE_STATUS.insightface.available ? null : ENGINE_STATUS.insightface.reason
    };

    return {
        engine: trace.decision,
        qualityGuardEnabled: ENGINE_STATUS.insightface.available,
        animationEngine: ENGINE_STATUS.liveportrait.available ? 'liveportrait' :
            ENGINE_STATUS.sadtalker.available ? 'sadtalker' : null,
        assembler: 'ffmpeg',
        trace
    };
}

/**
 * Make script generation decision
 * @param {object} intent - { productName, productBenefit, language, videoCount }
 * @returns {object} Decision with framework assignments
 */
export function decideScriptGeneration(intent) {
    const { videoCount = 5, language = 'ARABIC' } = intent;

    const trace = {
        intent,
        frameworkAssignments: [],
        timestamp: new Date().toISOString()
    };

    // Rotate through frameworks
    for (let i = 0; i < videoCount; i++) {
        const framework = FRAMEWORK_ROTATION[i % FRAMEWORK_ROTATION.length];
        trace.frameworkAssignments.push({
            videoNumber: i + 1,
            framework,
            reason: `Rotation index ${i % FRAMEWORK_ROTATION.length}`
        });
    }

    return {
        frameworks: trace.frameworkAssignments.map(a => a.framework),
        trace
    };
}

/**
 * Make voice generation decision
 * @param {object} intent - { market, language, apiKey }
 * @returns {object} Decision with voice selection
 */
export function decideVoiceGeneration(intent) {
    const { market = 'SAUDI_ARABIA', apiKey } = intent;

    const marketConfig = MARKET_VOICE_CONFIG[market] || MARKET_VOICE_CONFIG.SAUDI_ARABIA;

    const trace = {
        intent,
        marketConfig,
        engineAvailable: false,
        timestamp: new Date().toISOString()
    };

    // Check if ElevenLabs is usable
    if (apiKey) {
        trace.engineAvailable = true;
        trace.engine = 'elevenlabs';
        trace.defaultVoice = marketConfig.defaultVoice;
    } else {
        trace.engine = null;
        trace.reason = 'No ElevenLabs API key provided';
    }

    return {
        engine: trace.engine,
        defaultVoice: marketConfig.defaultVoice,
        voicePresets: marketConfig.voicePresets,
        trace
    };
}

/**
 * Get current engine status report
 */
export function getEngineStatusReport() {
    return {
        engines: ENGINE_STATUS,
        avatarStack: AVATAR_ENGINE_STACK,
        timestamp: new Date().toISOString()
    };
}

/**
 * Update engine availability (called when API becomes available/unavailable)
 */
export function setEngineStatus(engine, available, reason = null) {
    if (ENGINE_STATUS[engine]) {
        ENGINE_STATUS[engine] = { available, reason };
        console.log(`[UGC Decision] Engine ${engine} status updated: ${available ? 'AVAILABLE' : 'UNAVAILABLE'} ${reason ? `(${reason})` : ''}`);
    }
}
