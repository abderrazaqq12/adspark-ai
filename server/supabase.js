import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supab ase client for cost tracking
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('[Supabase] Connected for analytics tracking');
} else {
    console.warn('[Supabase] Not configured - analytics will not be tracked');
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
