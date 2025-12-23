/**
 * FlowScale Analytics Collector
 * 
 * Backfills analytics from existing database data.
 * Queries pipeline_jobs, file_assets, cost_transactions for real metrics.
 * 
 * NO MOCK DATA - All analytics come from actual system activity.
 */

import { Router } from 'express';
import { supabase } from './supabase.js';

const router = Router();

/**
 * GET /api/analytics/summary - Aggregate analytics summary
 */
router.get('/summary', async (req, res) => {
    try {
        const timeRange = req.query.range || '30d'; // Default 30 days
        const startDate = getStartDate(timeRange);

        // Parallel queries for efficiency
        const [contentGenerated, engineUsage, costData, successRates] = await Promise.all([
            getContentGenerated(startDate),
            getEngineUsage(startDate),
            getCostData(startDate),
            getSuccessRates(startDate)
        ]);

        res.json({
            status: 'ok',
            data: {
                timeRange,
                stats: {
                    contentGenerated,
                    engineUsage,
                    cost: costData,
                    successRate: successRates
                },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[Analytics] Error generating summary:', error);
        res.status(500).json({
            status: 'error',
            error: {
                code: 'ANALYTICS_ERROR',
                message: 'Failed to generate analytics summary',
                details: error.message
            }
        });
    }
});

/**
 * GET /api/analytics/content - Content generation breakdown
 */
router.get('/content', async (req, res) => {
    try {
        const startDate = getStartDate(req.query.range || '30d');
        const contentGenerated = await getContentGenerated(startDate);

        res.json({
            status: 'ok',
            data: contentGenerated
        });
    } catch (error) {
        console.error('[Analytics] Error fetching content data:', error);
        res.status(500).json({
            status: 'error',
            error: {
                code: 'ANALYTICS_ERROR',
                message: 'Failed to fetch content analytics',
                details: error.message
            }
        });
    }
});

/**
 * GET /api/analytics/cost - Cost breakdown
 */
router.get('/cost', async (req, res) => {
    try {
        const startDate = getStartDate(req.query.range || '30d');
        const costData = await getCostData(startDate);

        res.json({
            status: 'ok',
            data: costData
        });
    } catch (error) {
        console.error('[Analytics] Error fetching cost data:', error);
        res.status(500).json({
            status: 'error',
            error: {
                code: 'ANALYTICS_ERROR',
                message: 'Failed to fetch cost analytics',
                details: error.message
            }
        });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getStartDate(range) {
    const now = new Date();
    switch (range) {
        case '24h':
        case '1d':
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case '7d':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30d':
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case '90d':
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        default:
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
}

/**
 * Get content generated counts from database
 */
async function getContentGenerated(startDate) {
    try {
        // Query file_assets for output counts
        const { data: files, error: filesError } = await supabase
            .from('file_assets')
            .select('file_type, created_at')
            .gte('created_at', startDate.toISOString())
            .eq('status', 'active');

        if (filesError) {
            console.warn('[Analytics] Files query error:', filesError);
        }

        // Query pipeline_jobs for job completions
        const { data: jobs, error: jobsError } = await supabase
            .from('pipeline_jobs')
            .select('pipeline_type, status, created_at')
            .gte('created_at', startDate.toISOString());

        if (jobsError) {
            console.warn('[Analytics] Jobs query error:', jobsError);
        }

        // Count by type
        const counts = {
            videos: 0,
            images: 0,
            audio: 0,
            text: 0,
            total: 0
        };

        // Count from files
        (files || []).forEach(file => {
            const type = file.file_type?.toLowerCase() || '';
            if (type.includes('video') || type.includes('mp4')) counts.videos++;
            else if (type.includes('image') || type.includes('png') || type.includes('jpg')) counts.images++;
            else if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) counts.audio++;
            else if (type.includes('text') || type.includes('json')) counts.text++;
            counts.total++;
        });

        // Count from jobs if files table is empty
        if (counts.total === 0 && jobs && jobs.length > 0) {
            jobs.forEach(job => {
                if (job.status === 'completed' || job.status === 'success') {
                    const type = job.pipeline_type?.toLowerCase() || '';
                    if (type.includes('video')) counts.videos++;
                    else if (type.includes('image')) counts.images++;
                    else if (type.includes('audio')) counts.audio++;
                    else counts.text++;
                    counts.total++;
                }
            });
        }

        return counts;
    } catch (error) {
        console.error('[Analytics] Error in getContentGenerated:', error);
        return { videos: 0, images: 0, audio: 0, text: 0, total: 0 };
    }
}

/**
 * Get engine usage distribution
 */
async function getEngineUsage(startDate) {
    try {
        const { data: jobs, error } = await supabase
            .from('pipeline_jobs')
            .select('engine_used, status')
            .gte('created_at', startDate.toISOString());

        if (error) {
            console.warn('[Analytics] Engine usage query error:', error);
            return {};
        }

        const engineCounts = {};
        (jobs || []).forEach(job => {
            const engine = job.engine_used || 'unknown';
            if (!engineCounts[engine]) {
                engineCounts[engine] = { total: 0, success: 0, failed: 0 };
            }
            engineCounts[engine].total++;
            if (job.status === 'completed' || job.status === 'success') {
                engineCounts[engine].success++;
            } else if (job.status === 'failed' || job.status === 'error') {
                engineCounts[engine].failed++;
            }
        });

        return engineCounts;
    } catch (error) {
        console.error('[Analytics] Error in getEngineUsage:', error);
        return {};
    }
}

/**
 * Get cost data from cost_transactions
 */
async function getCostData(startDate) {
    try {
        const { data: costs, error } = await supabase
            .from('cost_transactions')
            .select('cost_usd, operation_type, engine_name, created_at')
            .gte('created_at', startDate.toISOString());

        if (error) {
            console.warn('[Analytics] Cost query error:', error);
            return { total: 0, byType: {}, byEngine: {} };
        }

        let total = 0;
        const byType = {};
        const byEngine = {};

        (costs || []).forEach(cost => {
            const amount = cost.cost_usd || 0;
            total += amount;

            const type = cost.operation_type || 'unknown';
            byType[type] = (byType[type] || 0) + amount;

            const engine = cost.engine_name || 'unknown';
            byEngine[engine] = (byEngine[engine] || 0) + amount;
        });

        return {
            total: Number(total.toFixed(4)),
            byType,
            byEngine,
            count: (costs || []).length
        };
    } catch (error) {
        console.error('[Analytics] Error in getCostData:', error);
        return { total: 0, byType: {}, byEngine: {}, count: 0 };
    }
}

/**
 * Get success/failure rates
 */
async function getSuccessRates(startDate) {
    try {
        const { data: jobs, error } = await supabase
            .from('pipeline_jobs')
            .select('status')
            .gte('created_at', startDate.toISOString());

        if (error) {
            console.warn('[Analytics] Success rate query error:', error);
            return { successRate: 0, total: 0, successful: 0, failed: 0 };
        }

        let successful = 0;
        let failed = 0;
        const total = (jobs || []).length;

        (jobs || []).forEach(job => {
            if (job.status === 'completed' || job.status === 'success') {
                successful++;
            } else if (job.status === 'failed' || job.status === 'error') {
                failed++;
            }
        });

        const successRate = total > 0 ? (successful / total) * 100 : 0;

        return {
            successRate: Number(successRate.toFixed(2)),
            total,
            successful,
            failed
        };
    } catch (error) {
        console.error('[Analytics] Error in getSuccessRates:', error);
        return { successRate: 0, total: 0, successful: 0, failed: 0 };
    }
}

export { router as analyticsRouter };
