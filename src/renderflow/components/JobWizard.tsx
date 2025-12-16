import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RenderFlowApi, RenderFlowJob } from "../api";
import { AlertCircle, CheckCircle, Download, RotateCcw } from "lucide-react";
import { JobStatusBadge } from "./JobStatusBadge";
import { AnalyzeStep } from "./steps/AnalyzeStep";
import { StrategyStep } from "./steps/StrategyStep";
import { supabase } from "@/integrations/supabase/client";
import type { VideoAnalysis, CreativeBlueprint } from "@/lib/creative-scale/types";
import type { OptimizationGoal, RiskTolerance, DetectedProblem } from "@/lib/creative-scale/brain-v2-types";

// 5-STEP WIZARD: Input → Analyze → Strategy → Review → Execute
type WizardStep = 1 | 2 | 3 | 4 | 5;
type PlatformType = 'tiktok' | 'reels' | 'snapchat' | 'youtube' | 'facebook' | 'general';
type FunnelStageType = 'cold' | 'warm' | 'retargeting';

export function JobWizard() {
    const [step, setStep] = useState<WizardStep>(1);
    
    // Step 1: Input
    const [sourceUrl, setSourceUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    
    // Step 2: Analyze
    const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Step 3: Strategy
    const [blueprint, setBlueprint] = useState<CreativeBlueprint | null>(null);
    const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
    const [brainV2State, setBrainV2State] = useState({
        optimizationGoal: 'retention' as OptimizationGoal,
        riskTolerance: 'medium' as RiskTolerance,
        platform: 'tiktok' as PlatformType,
        funnelStage: 'cold' as FunnelStageType,
        detectedProblems: [] as DetectedProblem[]
    });
    const [variations, setVariations] = useState(1);
    
    // Step 5: Execution
    const [jobs, setJobs] = useState<RenderFlowJob[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // Derived state
    const allDone = jobs.length > 0 && jobs.every(j => j.state === 'done' || j.state === 'failed');
    const anyFailed = jobs.some(j => j.state === 'failed');

    // STEP 1: Handle input validation
    const handleStep1Continue = async () => {
        setUploadError(null);
        
        if (sourceUrl.trim()) {
            setStep(2);
            return;
        }
        
        if (!file) {
            setUploadError("Provide a source URL or select a file");
            return;
        }
        
        setUploading(true);
        try {
            const res = await RenderFlowApi.uploadAsset(file);
            setSourceUrl(res.url);
            setStep(2);
        } catch (e: any) {
            setUploadError(e.message);
        } finally {
            setUploading(false);
        }
    };

    // STEP 2: AI Analysis
    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const { data, error } = await supabase.functions.invoke('creative-scale-analyze', {
                body: { 
                    video_url: sourceUrl,
                    video_id: `renderflow_${Date.now()}`
                }
            });
            
            if (error) throw error;
            if (data?.analysis) {
                setAnalysis(data.analysis);
                // Extract detected problems if available
                if (data.detectedProblems) {
                    setBrainV2State(prev => ({ ...prev, detectedProblems: data.detectedProblems }));
                }
            }
        } catch (e: any) {
            console.error('Analysis failed:', e);
            // Create mock analysis for demo if edge function fails
            setAnalysis(createMockAnalysis(sourceUrl));
        } finally {
            setIsAnalyzing(false);
        }
    };

    // STEP 3: Strategy Generation
    const handleGenerateStrategy = async () => {
        if (!analysis) return;
        setIsGeneratingStrategy(true);
        try {
            const { data, error } = await supabase.functions.invoke('creative-scale-strategize', {
                body: { 
                    analysis,
                    target_framework: null,
                    variation_count: variations,
                    optimization_goal: brainV2State.optimizationGoal,
                    risk_tolerance: brainV2State.riskTolerance,
                    platform: brainV2State.platform,
                    funnel_stage: brainV2State.funnelStage
                }
            });
            
            if (error) throw error;
            if (data?.blueprint) {
                setBlueprint(data.blueprint);
                if (data.detectedProblems) {
                    setBrainV2State(prev => ({ ...prev, detectedProblems: data.detectedProblems }));
                }
            }
        } catch (e: any) {
            console.error('Strategy generation failed:', e);
            // Create mock blueprint for demo
            setBlueprint(createMockBlueprint(analysis));
        } finally {
            setIsGeneratingStrategy(false);
        }
    };

    // STEP 4: Submit job
    const handleStartRendering = async () => {
        setSubmitError(null);
        setIsSubmitting(true);
        
        try {
            const res = await RenderFlowApi.submitJob(
                `proj_${Date.now()}`,
                sourceUrl,
                variations
            );
            
            const ids = res.ids || [];
            if (ids.length === 0) {
                throw new Error("Backend returned empty job IDs");
            }
            
            const initialJobs: RenderFlowJob[] = ids.map((id: string) => ({
                id,
                variation_id: '',
                project_id: '',
                state: 'queued' as const,
                progress_pct: 0,
                created_at: new Date().toISOString()
            }));
            
            setJobs(initialJobs);
            setStep(5);
        } catch (e: any) {
            setSubmitError(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // STEP 5: Polling
    useEffect(() => {
        if (step !== 5 || jobs.length === 0) return;
        if (allDone) return;

        const poll = async () => {
            const updatedJobs = await Promise.all(
                jobs.map(async (job) => {
                    if (job.state === 'done' || job.state === 'failed') return job;
                    try {
                        return await RenderFlowApi.getJobStatus(job.id);
                    } catch {
                        return job;
                    }
                })
            );
            setJobs(updatedJobs);
        };

        pollRef.current = setInterval(poll, 1000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [step, jobs, allDone]);

    // Reset wizard
    const handleReset = () => {
        setStep(1);
        setSourceUrl("");
        setFile(null);
        setUploadError(null);
        setAnalysis(null);
        setBlueprint(null);
        setVariations(1);
        setJobs([]);
        setSubmitError(null);
        setBrainV2State({
            optimizationGoal: 'retention',
            riskTolerance: 'medium',
            platform: 'tiktok',
            funnelStage: 'cold',
            detectedProblems: []
        });
        if (pollRef.current) clearInterval(pollRef.current);
    };

    return (
        <Card className="border-2 border-border">
            <CardHeader className="border-b border-border">
                <CardTitle className="flex justify-between items-center">
                    <span className="text-lg font-semibold">RenderFlow Wizard</span>
                    <span className="text-sm font-mono text-muted-foreground">Step {step} of 5</span>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-6">

                {/* STEP 1: INPUT */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Option A: Source URL</Label>
                            <Input 
                                value={sourceUrl} 
                                onChange={e => { setSourceUrl(e.target.value); setUploadError(null); }} 
                                placeholder="https://..."
                                className="font-mono text-sm"
                                disabled={uploading}
                            />
                        </div>
                        
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border"></span>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-background px-3 text-xs uppercase text-muted-foreground tracking-wide">
                                    Or Upload File
                                </span>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Option B: Select File</Label>
                            <Input 
                                type="file" 
                                accept="video/*"
                                onChange={e => { setFile(e.target.files?.[0] || null); setUploadError(null); }}
                                disabled={uploading}
                            />
                        </div>
                        
                        {uploadError && (
                            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive font-mono">
                                {uploadError}
                            </div>
                        )}
                        
                        <Button 
                            onClick={handleStep1Continue} 
                            disabled={uploading} 
                            className="w-full"
                        >
                            {uploading ? "Uploading..." : "Continue to Analyze"}
                        </Button>
                    </div>
                )}

                {/* STEP 2: ANALYZE */}
                {step === 2 && (
                    <AnalyzeStep
                        sourceUrl={sourceUrl}
                        analysis={analysis}
                        isAnalyzing={isAnalyzing}
                        onAnalyze={handleAnalyze}
                        onContinue={() => setStep(3)}
                        onBack={() => setStep(1)}
                    />
                )}

                {/* STEP 3: STRATEGY */}
                {step === 3 && analysis && (
                    <StrategyStep
                        analysis={analysis}
                        blueprint={blueprint}
                        brainV2State={brainV2State}
                        variationCount={variations}
                        isGenerating={isGeneratingStrategy}
                        onSetGoal={(goal) => setBrainV2State(prev => ({ ...prev, optimizationGoal: goal }))}
                        onSetRisk={(risk) => setBrainV2State(prev => ({ ...prev, riskTolerance: risk }))}
                        onSetPlatform={(platform) => setBrainV2State(prev => ({ ...prev, platform }))}
                        onSetFunnelStage={(stage) => setBrainV2State(prev => ({ ...prev, funnelStage: stage }))}
                        onSetVariationCount={setVariations}
                        onGenerate={handleGenerateStrategy}
                        onContinue={() => setStep(4)}
                        onBack={() => setStep(2)}
                    />
                )}

                {/* STEP 4: REVIEW */}
                {step === 4 && (
                    <div className="space-y-4">
                        <div className="space-y-3 p-4 bg-muted/50 rounded border border-border">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Source:</span>
                                <span className="font-mono truncate max-w-[250px]">{sourceUrl}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Variations:</span>
                                <span className="font-mono">{variations}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Platform:</span>
                                <span className="font-mono capitalize">{brainV2State.platform}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Goal:</span>
                                <span className="font-mono capitalize">{brainV2State.optimizationGoal}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Framework:</span>
                                <span className="font-mono">{blueprint?.framework || 'Auto'}</span>
                            </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground text-center">
                            Verify configuration before proceeding.
                        </p>
                        
                        {submitError && (
                            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive font-mono">
                                {submitError}
                            </div>
                        )}
                        
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep(3)} className="flex-1" disabled={isSubmitting}>
                                Back
                            </Button>
                            <Button onClick={handleStartRendering} className="flex-1" disabled={isSubmitting}>
                                {isSubmitting ? "Submitting..." : "Start Rendering"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 5: EXECUTION */}
                {step === 5 && (
                    <div className="space-y-4">
                        <div className="text-xs text-muted-foreground text-center uppercase tracking-wide">
                            {allDone ? "Execution Complete" : "Executing — Polling Backend"}
                        </div>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {jobs.map(job => (
                                <div key={job.id} className="p-3 border border-border rounded bg-muted/30 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono text-xs">{job.id}</span>
                                        <JobStatusBadge state={job.state} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Progress value={job.progress_pct} className="h-2 flex-1" />
                                        <span className="text-xs font-mono w-10 text-right">{job.progress_pct}%</span>
                                    </div>
                                    {job.error && (
                                        <div className="text-xs text-destructive font-mono flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {job.error.message}
                                        </div>
                                    )}
                                    {job.state === 'done' && job.output && (
                                        <a 
                                            href={job.output.output_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                        >
                                            <Download size={12} /> Download ({(job.output.file_size / 1024 / 1024).toFixed(2)} MB)
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {allDone && (
                            <div className={`p-3 rounded border text-center ${anyFailed ? 'bg-destructive/10 border-destructive/30' : 'bg-green-500/10 border-green-500/30'}`}>
                                <div className="flex items-center justify-center gap-2">
                                    {anyFailed ? (
                                        <>
                                            <AlertCircle className="h-5 w-5 text-destructive" />
                                            <span className="text-sm">Batch finished with errors</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <span className="text-sm">All jobs completed</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {!allDone && (
                            <p className="text-xs text-muted-foreground text-center">
                                Polling every 1000ms. Do not close window.
                            </p>
                        )}
                        
                        {allDone && (
                            <Button variant="outline" onClick={handleReset} className="w-full">
                                <RotateCcw size={14} className="mr-2" />
                                Start New Pipeline
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Mock analysis for demo when edge function unavailable
function createMockAnalysis(sourceUrl: string): VideoAnalysis {
    return {
        id: `analysis_${Date.now()}`,
        source_video_id: sourceUrl,
        analyzed_at: new Date().toISOString(),
        metadata: {
            duration_ms: 15000,
            aspect_ratio: '9:16',
            resolution: '1080x1920',
            fps: 30
        },
        segments: [
            { id: 's1', type: 'hook', start_ms: 0, end_ms: 3000, transcript: 'Opening hook', visual_tags: ['face'], pacing_score: 0.8, clarity_score: 0.7, attention_score: 0.85 },
            { id: 's2', type: 'problem', start_ms: 3000, end_ms: 6000, transcript: 'Problem statement', visual_tags: ['text'], pacing_score: 0.6, clarity_score: 0.8, attention_score: 0.7 },
            { id: 's3', type: 'solution', start_ms: 6000, end_ms: 10000, transcript: 'Solution reveal', visual_tags: ['product'], pacing_score: 0.7, clarity_score: 0.75, attention_score: 0.75 },
            { id: 's4', type: 'cta', start_ms: 10000, end_ms: 15000, transcript: 'Call to action', visual_tags: ['text'], pacing_score: 0.9, clarity_score: 0.85, attention_score: 0.8 }
        ],
        audio: { has_voiceover: true, has_music: true, music_energy: 'medium', voice_tone: 'friendly', silence_ratio: 0.1 },
        overall_scores: { hook_strength: 0.85, message_clarity: 0.75, pacing_consistency: 0.7, cta_effectiveness: 0.8 },
        detected_style: 'ugc',
        detected_language: 'en'
    };
}

function createMockBlueprint(analysis: VideoAnalysis): CreativeBlueprint {
    return {
        id: `blueprint_${Date.now()}`,
        source_analysis_id: analysis.id,
        created_at: new Date().toISOString(),
        framework: 'PAS',
        framework_rationale: 'Problem-Agitate-Solution framework detected based on segment structure',
        objective: { primary_goal: 'Drive conversions', target_emotion: 'Urgency', key_message: 'Solve your problem today' },
        strategic_insights: ['Strong hook detected', 'CTA could be more urgent', 'Consider faster pacing in middle'],
        variation_ideas: [
            { id: 'v1', action: 'emphasize_segment', target_segment_type: 'hook', intent: 'Strengthen opening', priority: 'high', reasoning: 'Hook determines first 3 seconds retention' },
            { id: 'v2', action: 'compress_segment', target_segment_type: 'problem', intent: 'Tighten pacing', priority: 'medium', reasoning: 'Problem section slightly slow' }
        ],
        recommended_duration_range: { min_ms: 12000, max_ms: 18000 },
        target_formats: ['9:16', '1:1']
    };
}
