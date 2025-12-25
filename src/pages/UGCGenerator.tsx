/**
 * UGC Generator Page
 * Main page for UGC Video Factory - styled to match FlowScale UI
 */

import React, { useState, useCallback } from 'react';
import { Video, Sparkles, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// UGC Components
import {
    ProductSection,
    AvatarSection,
    ScriptSection,
    VoicePreview,
    BatchSettingsSection,
    ProgressDisplay,
    ResultsGrid,
} from '@/components/ugc';

// UGC Types
import type {
    UGCProductConfig,
    UGCAvatarConfig,
    UGCScriptConfig,
    UGCBatchSettings,
    UGCBatchJob,
    UGCJobStatus,
    UGCVideoVariant,
} from '@/types/ugc';

import {
    DEFAULT_UGC_BATCH_SETTINGS,
    DEFAULT_UGC_SCRIPT_CONFIG,
    DEFAULT_UGC_AVATAR_SETTINGS,
} from '@/types/ugc';

// Services
import { saveElevenLabsApiKey, getSavedElevenLabsApiKey } from '@/services/ugc/voicePreview';

export default function UGCGenerator() {
    const { toast } = useToast();

    // Product State
    const [product, setProduct] = useState<UGCProductConfig>({
        images: [],
        imagePreviews: [],
        name: '',
        benefit: '',
    });

    // Avatar State
    const [avatar, setAvatar] = useState<UGCAvatarConfig>({
        type: 'auto',
        ...DEFAULT_UGC_AVATAR_SETTINGS,
    });

    // Script State
    const [script, setScript] = useState<UGCScriptConfig>(DEFAULT_UGC_SCRIPT_CONFIG);

    // Voice State
    const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>();
    const [elevenLabsApiKey, setElevenLabsApiKey] = useState<string>(
        getSavedElevenLabsApiKey() || ''
    );

    // Batch Settings State
    const [batchSettings, setBatchSettings] = useState<UGCBatchSettings>(DEFAULT_UGC_BATCH_SETTINGS);

    // Generation State
    const [jobStatus, setJobStatus] = useState<UGCJobStatus>('IDLE');
    const [progress, setProgress] = useState(0);
    const [currentStage, setCurrentStage] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [variants, setVariants] = useState<UGCVideoVariant[]>([]);

    // Handle API Key Change
    const handleApiKeyChange = useCallback((key: string) => {
        setElevenLabsApiKey(key);
        if (key) {
            saveElevenLabsApiKey(key);
        }
    }, []);

    // Check if form is valid for generation
    const isFormValid = () => {
        // Must have product name and benefit
        if (!product.name.trim() || !product.benefit.trim()) return false;

        // Must have at least one product image
        if (product.images.length === 0) return false;

        // Must have avatar configured
        if (avatar.type === 'auto' && (!avatar.generatedAvatars || avatar.generatedAvatars.length === 0)) {
            // Auto mode without generated avatars - still allow (will generate on submit)
        }
        if (avatar.type === 'upload' && !avatar.imageFile) return false;

        // Script validation based on mode
        if (script.mode === 'MANUAL' && (!script.manualScripts || script.manualScripts.length === 0)) {
            return false;
        }
        if (script.mode === 'UPLOAD' && (!script.uploadedFiles || script.uploadedFiles.length === 0)) {
            return false;
        }

        return true;
    };

    // Handle Generate
    const handleGenerate = async () => {
        if (!isFormValid()) {
            toast({
                title: 'Incomplete Configuration',
                description: 'Please fill in all required fields before generating.',
                variant: 'destructive',
            });
            return;
        }

        setJobStatus('PROCESSING');
        setProgress(0);
        setError(undefined);
        setVariants([]);

        try {
            // Simulate generation process for now
            // In production, this would call the VPS backend
            const stages = [
                'Script Generation',
                'Avatar Generation',
                'Voice Generation',
                'Scene Planning',
                'Rendering',
                'Finalizing',
            ];

            for (let i = 0; i < stages.length; i++) {
                setCurrentStage(stages[i]);
                setProgress(((i + 1) / stages.length) * 100);

                // Simulate processing time
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Create mock variants
            const mockVariants: UGCVideoVariant[] = Array.from(
                { length: batchSettings.videoCount },
                (_, i) => ({
                    id: `variant-${Date.now()}-${i}`,
                    variantNumber: i + 1,
                    status: 'DONE' as UGCJobStatus,
                    hookText: `Hook variation ${i + 1} for ${product.name}`,
                    ctaText: 'Shop Now!',
                    createdAt: new Date(),
                    completedAt: new Date(),
                    // In production, these would be real URLs
                    thumbnailUrl: `https://picsum.photos/seed/${i}/270/480`,
                })
            );

            setVariants(mockVariants);
            setJobStatus('DONE');
            setProgress(100);

            toast({
                title: 'Generation Complete! 🎉',
                description: `Successfully generated ${batchSettings.videoCount} UGC videos.`,
            });
        } catch (err: any) {
            setJobStatus('FAILED');
            setError(err.message || 'Generation failed. Please try again.');
            toast({
                title: 'Generation Failed',
                description: err.message || 'An error occurred during generation.',
                variant: 'destructive',
            });
        }
    };

    // Handle Download
    const handleDownload = (variant: UGCVideoVariant) => {
        if (variant.outputUrl) {
            const link = document.createElement('a');
            link.href = variant.outputUrl;
            link.download = `ugc-video-${variant.variantNumber}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            toast({
                title: 'Download Not Available',
                description: 'Video is still processing or not available.',
                variant: 'destructive',
            });
        }
    };

    // Reset form
    const handleReset = () => {
        setProduct({ images: [], imagePreviews: [], name: '', benefit: '' });
        setAvatar({ type: 'auto', ...DEFAULT_UGC_AVATAR_SETTINGS });
        setScript(DEFAULT_UGC_SCRIPT_CONFIG);
        setSelectedVoiceId(undefined);
        setBatchSettings(DEFAULT_UGC_BATCH_SETTINGS);
        setJobStatus('IDLE');
        setProgress(0);
        setError(undefined);
        setVariants([]);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-border bg-background/50 backdrop-blur-sm">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold">UGC Generator</h1>
                                <p className="text-sm text-muted-foreground">AI Video Factory</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Batch Settings Compact */}
                            <BatchSettingsSection
                                settings={batchSettings}
                                onChange={setBatchSettings}
                                compact
                            />

                            {/* Reset Button */}
                            {(jobStatus === 'DONE' || jobStatus === 'FAILED') && (
                                <Button variant="outline" size="sm" onClick={handleReset}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Reset
                                </Button>
                            )}

                            {/* Generate Button */}
                            <Button
                                onClick={handleGenerate}
                                disabled={jobStatus === 'PROCESSING' || jobStatus === 'RENDERING'}
                                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                            >
                                {jobStatus === 'PROCESSING' || jobStatus === 'RENDERING' ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate {batchSettings.videoCount} Videos
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Product & Avatar */}
                        <div className="space-y-6">
                            <ProductSection product={product} onChange={setProduct} />
                            <AvatarSection avatar={avatar} onChange={setAvatar} />
                        </div>

                        {/* Middle Column - Script & Voice */}
                        <div className="space-y-6">
                            <ScriptSection
                                script={script}
                                onChange={setScript}
                                videoCount={batchSettings.videoCount}
                                elevenLabsApiKey={elevenLabsApiKey}
                                onApiKeyChange={handleApiKeyChange}
                            />
                            <VoicePreview
                                language={avatar.language || 'ENGLISH'}
                                gender={avatar.gender || 'ALL'}
                                selectedVoiceId={selectedVoiceId}
                                onSelectVoice={setSelectedVoiceId}
                                apiKey={elevenLabsApiKey}
                            />
                        </div>

                        {/* Right Column - Settings & Progress & Results */}
                        <div className="space-y-6">
                            <BatchSettingsSection
                                settings={batchSettings}
                                onChange={setBatchSettings}
                            />

                            {(jobStatus !== 'IDLE' || variants.length > 0) && (
                                <ProgressDisplay
                                    status={jobStatus}
                                    progress={progress}
                                    currentStage={currentStage}
                                    error={error}
                                />
                            )}
                        </div>
                    </div>

                    {/* Results Grid - Full Width */}
                    {variants.length > 0 && (
                        <div className="mt-6">
                            <ResultsGrid
                                variants={variants}
                                onDownload={handleDownload}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
