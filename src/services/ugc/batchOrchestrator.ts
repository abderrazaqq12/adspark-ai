/**
 * UGC Batch Orchestrator Service
 * Manages batch job creation, status tracking, and VPS worker coordination
 */

import type { UGCJobStatus, UGCBatchJob, UGCVideoVariant, UGCGeneratedAvatar, UGCLanguage } from '@/types/ugc';
import type { GeneratedScript } from './scriptEngine';

export interface BatchJobConfig {
    videoCount: number;
    productName: string;
    productBenefit: string;
    productImages: string[];
    language: UGCLanguage;
    avatars: UGCGeneratedAvatar[];
    scripts: GeneratedScript[];
    voiceId: string;
    elevenLabsApiKey?: string;
}

export interface BatchJobResult {
    batchId: string;
    status: UGCJobStatus;
    progress: number;
    currentStage: string;
    videos: UGCVideoVariant[];
    error?: string;
}

/**
 * Create a new batch job on the VPS
 */
export async function createBatchJob(config: BatchJobConfig): Promise<BatchJobResult> {
    try {
        const response = await fetch('/api/ugc/create-batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoCount: config.videoCount,
                productName: config.productName,
                productBenefit: config.productBenefit,
                productImages: config.productImages,
                language: config.language,
                avatars: config.avatars.map(a => ({
                    id: a.id,
                    imageUrl: a.imageUrl,
                    gender: a.gender,
                })),
                scripts: config.scripts.map(s => ({
                    id: s.id,
                    text: s.text,
                    framework: s.framework,
                    hook: s.hook,
                    cta: s.cta,
                })),
                voiceId: config.voiceId,
                elevenLabsApiKey: config.elevenLabsApiKey,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create batch job');
        }

        return await response.json();
    } catch (error: any) {
        console.error('Batch creation failed:', error);
        throw error;
    }
}

/**
 * Get batch job status from VPS
 */
export async function getBatchStatus(batchId: string): Promise<BatchJobResult> {
    try {
        const response = await fetch(`/api/ugc/batch-status?batchId=${batchId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get batch status');
        }

        return await response.json();
    } catch (error: any) {
        console.error('Batch status check failed:', error);
        throw error;
    }
}

/**
 * Poll batch status until completion
 */
export async function pollBatchUntilComplete(
    batchId: string,
    onProgress: (result: BatchJobResult) => void,
    pollIntervalMs: number = 2000,
    maxPolls: number = 300 // 10 minutes max
): Promise<BatchJobResult> {
    let polls = 0;

    while (polls < maxPolls) {
        const result = await getBatchStatus(batchId);
        onProgress(result);

        if (result.status === 'DONE' || result.status === 'FAILED') {
            return result;
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        polls++;
    }

    throw new Error('Batch job timed out');
}

/**
 * Retry a failed video in a batch
 */
export async function retryFailedVideo(batchId: string, videoId: string): Promise<void> {
    try {
        const response = await fetch('/api/ugc/retry-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ batchId, videoId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to retry video');
        }
    } catch (error: any) {
        console.error('Video retry failed:', error);
        throw error;
    }
}

/**
 * Cancel a running batch job
 */
export async function cancelBatch(batchId: string): Promise<void> {
    try {
        const response = await fetch('/api/ugc/cancel-batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ batchId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to cancel batch');
        }
    } catch (error: any) {
        console.error('Batch cancellation failed:', error);
        throw error;
    }
}

/**
 * Create video variants for local simulation (when backend unavailable)
 */
export function createSimulatedVariants(config: BatchJobConfig): UGCVideoVariant[] {
    const variants: UGCVideoVariant[] = [];

    for (let i = 0; i < config.videoCount; i++) {
        const avatar = config.avatars[i % config.avatars.length];
        const script = config.scripts[i];

        variants.push({
            id: `variant-${Date.now()}-${i}`,
            variantNumber: i + 1,
            status: 'PROCESSING',
            avatarId: avatar?.id,
            scriptId: script?.id,
            hookText: script?.hook,
            ctaText: script?.cta,
            framework: script?.framework,
            createdAt: new Date(),
        });
    }

    return variants;
}

/**
 * Simulate batch processing for demo mode
 */
export async function simulateBatchProcessing(
    variants: UGCVideoVariant[],
    onProgress: (progress: number, stage: string, updatedVariants: UGCVideoVariant[]) => void
): Promise<UGCVideoVariant[]> {
    const stages = [
        'Generating Scripts',
        'Generating Voices',
        'Generating Avatars',
        'Composing Scenes',
        'Rendering Videos',
        'Finalizing',
    ];

    const totalSteps = stages.length * variants.length;
    let currentStep = 0;

    for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
        const stage = stages[stageIndex];

        for (let i = 0; i < variants.length; i++) {
            currentStep++;
            const progress = (currentStep / totalSteps) * 100;

            // Update variant status
            if (stageIndex === stages.length - 1) {
                variants[i] = {
                    ...variants[i],
                    status: 'DONE',
                    completedAt: new Date(),
                    thumbnailUrl: `https://picsum.photos/seed/${variants[i].id}/270/480`,
                    outputUrl: undefined, // Would be real URL from VPS
                };
            }

            onProgress(progress, stage, [...variants]);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return variants;
}
