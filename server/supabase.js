import { createClient } from '@supabase/supabase-js';

// Supabase client for cost tracking
let supabase = null;

// Check for VITE_ prefixed or standard env vars (Docker passes standard, Vite passes VITE_)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('[Supabase] Connected for analytics tracking');
    } catch (e) {
        console.error('[Supabase] Failed to initialize:', e.message);
    }
} else {
    console.warn('[Supabase] Not configured - analytics will not be tracked (Missing URL or Service Role Key)');
}

// Cost tracking helper
async function trackCost(params) {
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('cost_transactions')
            .insert({
                user_id: params.userId || null,
                project_id: params.projectId || null,
                pipeline_stage: params.stage || 'video_generation',
                engine_name: params.engine || 'server_ffmpeg',
                operation_type: params.operationType || 'video_generation',
                cost_usd: params.cost || 0.01, // Default minimal cost for FFmpeg
                metadata: params.metadata || {}
            });

        if (error) {
            console.warn('[Cost Tracking] Failed:', error.message);
        } else {
            console.log(`[Cost Tracking] Logged $${params.cost || 0.01} for ${params.engine || 'server_ffmpeg'}`);
        }
    } catch (err) {
        console.warn('[Cost Tracking] Error:', err.message);
    }
}

export { supabase, trackCost };
