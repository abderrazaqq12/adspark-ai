import { createClient } from '@supabase/supabase-js';

// Supabase client for cost tracking
let supabase = null;

// ============================================
// SECURITY: Backend-Only Secret Access
// ============================================
// NEVER use VITE_ prefixed vars for service role keys
// This prevents accidental frontend bundle inclusion
// ENV validator ensures these exist before server starts

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('[Supabase] ✅ Connected for analytics tracking');
    } catch (e) {
        console.error('[Supabase] ❌ Failed to initialize:', e.message);
        // ENV validator should have caught this, but double-check
        throw new Error('Supabase initialization failed - check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
} else {
    // This should never happen if ENV validator ran
    console.error('[Supabase] ❌ FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    throw new Error('Supabase configuration missing - ENV validator should have caught this');
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
