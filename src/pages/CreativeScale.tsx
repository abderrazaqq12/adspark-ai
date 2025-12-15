/**
 * Creative Scale - Refactored UI
 * Vertical step sidebar with strict progressive disclosure
 * SERVER-ONLY RENDERING - No browser FFmpeg
 * 
 * Steps: 1.Upload → 2.Analyze → 3.Strategy → 4.Execute → 5.Results
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCreativeScale } from '@/hooks/useCreativeScale';
import { executeWithFallback, ExecutionResult, EngineId, executionDebugLogger } from '@/lib/creative-scale/execution-engine';
import { validateVideoFile, sanitizeFilename, LIMITS } from '@/lib/creative-scale/validation';
import { createInitialProgressState, ExecutionProgressState } from '@/components/creative-scale/ExecutionProgressPanel';
import { StepSidebar, StepId } from '@/components/creative-scale/StepSidebar';
import { UploadStep } from '@/components/creative-scale/steps/UploadStep';
import { AnalyzeStep } from '@/components/creative-scale/steps/AnalyzeStep';
import { StrategyStep } from '@/components/creative-scale/steps/StrategyStep';
import { ExecuteStep } from '@/components/creative-scale/steps/ExecuteStep';
import { ResultsStep } from '@/components/creative-scale/steps/ResultsStep';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import { RenderingMode } from '@/lib/creative-scale/capability-router';
import { RenderDebugPanel, RenderDebugInfo } from '@/components/replicator/RenderDebugPanel';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from "@/components/ui/card";

// ============================================
// SESSION PERSISTENCE
// ============================================

const UI_STORAGE_KEY = 'creative_scale_ui_v2';

interface PersistedUIState {
  currentStep: StepId;
  completedSteps: StepId[];
}

function saveUIState(state: PersistedUIState): void {
  try { sessionStorage.setItem(UI_STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function loadUIState(): PersistedUIState | null {
  try {
    const stored = sessionStorage.getItem(UI_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) { return null; }
}

function clearUIState(): void {
  try { sessionStorage.removeItem(UI_STORAGE_KEY); } catch (e) { /* ignore */ }
}

// ============================================
// TYPES
// ============================================

interface UploadedVideo {
  id: string;
  file: File;
  url: string;
  storageUrl?: string;
  duration?: number;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  uploadProgress?: number;
  error?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CreativeScale() {
  // Navigation state
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);

  // Data state
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [executionResults, setExecutionResults] = useState<Map<string, ExecutionResult>>(new Map());
  const [variationCount, setVariationCount] = useState(3);
  const [executionProgress, setExecutionProgress] = useState<ExecutionProgressState>(createInitialProgressState(0));
  const [isUploading, setIsUploading] = useState(false);

  // Advanced Mode State
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [renderingMode, setRenderingMode] = useState<RenderingMode>('auto');
  const [debugInfo, setDebugInfo] = useState<RenderDebugInfo | null>(null);


  // Hook
  const {
    isAnalyzing,
    isGeneratingBlueprint,
    isCompiling,
    isRouting,
    error,
    currentAnalysis,
    currentBlueprint,
    currentPlans,
    brainV2State,
    setBrainV2Options,
    analyzeVideo,
    generateBlueprint,
    generateBrainV2Strategy,
    compileAllVariations,
    reset: resetHook
  } = useCreativeScale();

  // Restore state on mount
  useEffect(() => {
    const savedUI = loadUIState();
    if (savedUI) {
      setCurrentStep(savedUI.currentStep);
      setCompletedSteps(savedUI.completedSteps);
    }
  }, []);

  // Persist state
  useEffect(() => {
    saveUIState({ currentStep, completedSteps });
  }, [currentStep, completedSteps]);

  // ============================================
  // STEP NAVIGATION
  // ============================================

  const goToStep = useCallback((step: StepId) => {
    if (step <= currentStep || completedSteps.includes(step)) {
      setCurrentStep(step);
    }
  }, [currentStep, completedSteps]);

  const completeStep = useCallback((step: StepId) => {
    setCompletedSteps(prev => {
      if (prev.includes(step)) return prev;
      return [...prev, step];
    });
  }, []);

  // ============================================
  // STEP 1: UPLOAD
  // ============================================

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newVideos: UploadedVideo[] = [];

    for (const file of Array.from(files)) {
      const safeFilename = sanitizeFilename(file.name);
      const validation = validateVideoFile(file);

      if (!validation.valid) {
        toast.error(`${safeFilename}: ${validation.error}`);
        continue;
      }

      if (uploadedVideos.length + newVideos.length >= LIMITS.MAX_VIDEOS) {
        toast.error(`Maximum ${LIMITS.MAX_VIDEOS} videos allowed`);
        break;
      }

      const url = URL.createObjectURL(file);
      const safeFile = new File([file], safeFilename, { type: file.type });
      const videoId = `video_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      newVideos.push({
        id: videoId,
        file: safeFile,
        url,
        status: 'pending'
      });
    }

    // Validate duration
    for (const video of newVideos) {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          video.status = 'error';
          video.error = 'Video load timeout';
          resolve();
        }, 10000);

        videoEl.onloadedmetadata = () => {
          clearTimeout(timeout);
          video.duration = videoEl.duration;
          if (videoEl.duration > LIMITS.MAX_DURATION_SEC) {
            video.status = 'error';
            video.error = `Duration exceeds ${LIMITS.MAX_DURATION_SEC}s`;
          } else {
            video.status = 'uploading';
          }
          resolve();
        };
        videoEl.onerror = () => {
          clearTimeout(timeout);
          video.status = 'error';
          video.error = 'Failed to load video';
          resolve();
        };
        videoEl.src = video.url;
      });
    }

    setUploadedVideos(prev => [...prev, ...newVideos]);

    // Upload to storage
    const uploadingVideos = newVideos.filter(v => v.status === 'uploading');

    for (const video of uploadingVideos) {
      try {
        const fileExt = video.file.name.split('.').pop() || 'mp4';
        const filePath = `creative-scale/${video.id}/video.${fileExt}`;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/videos/${filePath}`;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setUploadedVideos(prev => prev.map(v =>
                v.id === video.id ? { ...v, uploadProgress: progress } : v
              ));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Upload failed')));

          xhr.open('POST', uploadUrl);
          xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
          xhr.setRequestHeader('x-upsert', 'true');
          xhr.send(video.file);
        });

        const { data: urlData } = supabase.storage
          .from('videos')
          .getPublicUrl(filePath);

        setUploadedVideos(prev => prev.map(v =>
          v.id === video.id
            ? { ...v, status: 'ready' as const, storageUrl: urlData.publicUrl, uploadProgress: 100 }
            : v
        ));

      } catch (err) {
        console.error('[CreativeScale] Storage upload failed:', err);
        setUploadedVideos(prev => prev.map(v =>
          v.id === video.id
            ? { ...v, status: 'error' as const, error: 'Storage upload failed' }
            : v
        ));
      }
    }

    setIsUploading(false);

    const readyCount = newVideos.filter(v => v.status === 'uploading').length;
    if (readyCount > 0) {
      toast.success(`${readyCount} video(s) uploaded`);
    }
  }, [uploadedVideos.length]);

  const removeVideo = useCallback((id: string) => {
    setUploadedVideos(prev => {
      const video = prev.find(v => v.id === id);
      if (video) URL.revokeObjectURL(video.url);
      return prev.filter(v => v.id !== id);
    });
  }, []);

  const handleUploadContinue = useCallback(() => {
    completeStep(1);
    setCurrentStep(2);
  }, [completeStep]);

  // ============================================
  // STEP 2: ANALYZE
  // ============================================

  const handleAnalyze = useCallback(async () => {
    const readyVideos = uploadedVideos.filter(v => v.status === 'ready');
    if (readyVideos.length === 0) {
      toast.error('No valid videos to analyze');
      return;
    }

    try {
      const video = readyVideos[selectedVideoIndex] || readyVideos[0];

      const analysis = await analyzeVideo(video.url, video.id, {
        language: 'ar',
        market: 'gcc'
      });

      if (!analysis) return;

      toast.success('Analysis complete');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    }
  }, [uploadedVideos, selectedVideoIndex, analyzeVideo]);

  const handleAnalyzeContinue = useCallback(() => {
    completeStep(2);
    setCurrentStep(3);
  }, [completeStep]);

  // ============================================
  // STEP 3: STRATEGY
  // ============================================

  const handleGenerateStrategy = useCallback(async () => {
    if (!currentAnalysis) return;

    try {
      const brainResult = await generateBrainV2Strategy(currentAnalysis, {
        variationCount: Math.min(variationCount, LIMITS.MAX_VARIATIONS)
      });

      if (!brainResult.success) {
        const failureOutput = brainResult as { success: false; failure: { reason: string } };
        toast.info(failureOutput.failure.reason);
        return;
      }

      const blueprint = await generateBlueprint(currentAnalysis, {
        variationCount: Math.min(variationCount, brainResult.blueprints.length || variationCount)
      });

      if (blueprint) {
        const videoUrl = uploadedVideos[selectedVideoIndex]?.storageUrl || uploadedVideos[0]?.storageUrl;

        if (videoUrl) {
          await compileAllVariations(currentAnalysis, blueprint, videoUrl);
          toast.success(`${brainResult.blueprints.length} variation(s) ready`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Strategy generation failed');
    }
  }, [currentAnalysis, generateBrainV2Strategy, generateBlueprint, compileAllVariations, uploadedVideos, variationCount]);

  const handleStrategyContinue = useCallback(() => {
    completeStep(3);
    setCurrentStep(4);
  }, [completeStep]);

  // ============================================
  // STEP 4: EXECUTE
  // ============================================

  const handleExecute = useCallback(async () => {
    if (!currentAnalysis || !currentBlueprint || currentPlans.length === 0) return;

    // Start debug session
    const sessionId = executionDebugLogger.startSession(currentPlans.length);
    console.log('[CreativeScale] Starting execution session:', sessionId);

    setExecutionProgress({
      variationIndex: 0,
      totalVariations: currentPlans.length,
      currentEngine: null,
      engines: [
        { engine: 'cloudinary', status: 'pending', progress: 0, message: '' },
        { engine: 'server_ffmpeg', status: 'pending', progress: 0, message: '' },
        { engine: 'plan_export', status: 'pending', progress: 0, message: '' },
      ],
      overallProgress: 0,
      status: 'executing'
    });

    const results = new Map<string, ExecutionResult>();

    for (let i = 0; i < currentPlans.length; i++) {
      const plan = currentPlans[i];

      setExecutionProgress(prev => ({
        ...prev,
        variationIndex: i,
        currentEngine: null,
        engines: [
          { engine: 'cloudinary', status: 'pending', progress: 0, message: '' },
          { engine: 'server_ffmpeg', status: 'pending', progress: 0, message: '' },
          { engine: 'plan_export', status: 'pending', progress: 0, message: '' },
        ],
        overallProgress: (i / currentPlans.length) * 100
      }));

      const result = await executeWithFallback({
        plan,
        analysis: currentAnalysis,
        blueprint: currentBlueprint,
        variationIndex: i,
        renderingMode, // Pass override
        onProgress: (engine: EngineId, progress: number, message: string, metadata?: any) => {
          setExecutionProgress(prev => ({
            ...prev,
            currentEngine: engine,
            engines: prev.engines.map(e =>
              e.engine === engine
                ? { ...e, status: 'attempting' as const, progress, message, jobId: metadata?.jobId }
                : e
            )
          }));
        },
        onEngineSwitch: (from: EngineId | null, to: EngineId, reason: string) => {
          // Capture detailed debug info on engine switch/start
          setDebugInfo({
            engine: to,
            executionPath: `${from ? from + ' -> ' : ''}${to}`,
            status: 'pending',
            logs: [`Switching engine due to: ${reason}`],
            payload: { reason, variationIndex: i }
          });

          setExecutionProgress(prev => ({
            ...prev,
            currentEngine: to,
            engines: prev.engines.map(e => {
              if (from && e.engine === from) {
                return { ...e, status: 'failed' as const, error: reason.substring(0, 100) };
              }
              if (e.engine === to) {
                return { ...e, status: 'attempting' as const, message: 'Starting...' };
              }
              return e;
            })
          }));
        }
      });

      // Update Debug Info with final result
      setDebugInfo(prev => prev ? {
        ...prev,
        status: result.status === 'success' ? 'success' : 'failed',
        logs: [...prev.logs, `Completed with status: ${result.status}`, `Output: ${result.output_video_url || 'N/A'}`],
        serverJobId: (result as any).jobId
      } : null);

      setExecutionProgress(prev => ({
        ...prev,
        engines: prev.engines.map(e =>
          e.engine === result.engine_used
            ? { ...e, status: result.status === 'success' ? 'success' as const : 'failed' as const, progress: 100 }
            : e.status === 'pending' ? { ...e, status: 'skipped' as const } : e
        ),
        overallProgress: ((i + 1) / currentPlans.length) * 100
      }));

      results.set(plan.plan_id, result);
    }

    setExecutionResults(results);

    const successCount = Array.from(results.values()).filter(r => r.status === 'success').length;

    setExecutionProgress(prev => ({
      ...prev,
      overallProgress: 100,
      status: successCount > 0 ? 'complete' : 'partial',
      currentEngine: null
    }));

    // Complete debug session
    executionDebugLogger.completeSession();

    toast.success(`${successCount} of ${currentPlans.length} videos completed`);
  }, [currentAnalysis, currentBlueprint, currentPlans]);

  const handleExecuteContinue = useCallback(() => {
    completeStep(4);
    setCurrentStep(5);
  }, [completeStep]);

  const downloadAllPlans = useCallback(() => {
    const artifacts = {
      analysis: currentAnalysis,
      blueprint: currentBlueprint,
      execution_plans: currentPlans,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(artifacts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creative-scale-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Plans downloaded');
  }, [currentAnalysis, currentBlueprint, currentPlans]);

  // ============================================
  // STEP 5: RESULTS
  // ============================================

  const downloadPlan = useCallback((plan: ExecutionPlan) => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-plan-${plan.variation_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ============================================
  // RESET
  // ============================================

  const handleReset = useCallback(() => {
    uploadedVideos.forEach(v => URL.revokeObjectURL(v.url));
    setUploadedVideos([]);
    setCurrentStep(1);
    setCompletedSteps([]);
    setSelectedVideoIndex(0);
    setExecutionResults(new Map());
    setExecutionProgress(createInitialProgressState(0));
    resetHook();
    clearUIState();
  }, [uploadedVideos, resetHook]);

  // ============================================
  // RENDER
  // ============================================

  const isProcessing = isAnalyzing || isGeneratingBlueprint || isCompiling || isRouting;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar - Step Navigation */}
      <StepSidebar
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
        onClearHistory={handleReset}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Upload */}
          {currentStep === 1 && (
            <UploadStep
              uploadedVideos={uploadedVideos}
              onUpload={handleFileUpload}
              onRemove={removeVideo}
              onContinue={handleUploadContinue}
              isUploading={isUploading}
            />
          )}

          {/* Step 2: Analyze */}
          {currentStep === 2 && (
            <AnalyzeStep
              analysis={currentAnalysis}
              isAnalyzing={isAnalyzing}
              onAnalyze={handleAnalyze}
              onContinue={handleAnalyzeContinue}
            />
          )}

          {/* Step 3: Strategy */}
          {currentStep === 3 && currentAnalysis && (
            <StrategyStep
              analysis={currentAnalysis}
              blueprint={currentBlueprint}
              plans={currentPlans}
              brainV2State={brainV2State}
              variationCount={variationCount}
              isGenerating={isGeneratingBlueprint || isCompiling}
              onSetGoal={(goal) => setBrainV2Options({ goal })}
              onSetRisk={(risk) => setBrainV2Options({ risk })}
              onSetPlatform={(platform) => setBrainV2Options({ platform })}
              onSetFunnelStage={(funnelStage) => setBrainV2Options({ funnelStage })}
              onSetVariationCount={setVariationCount}
              onGenerate={handleGenerateStrategy}
              onContinue={handleStrategyContinue}
            />
          )}

          {/* Step 4: Execute */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Advanced Mode Controls */}
              <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                  <Switch
                    id="adv-mode-scale"
                    checked={isAdvancedMode}
                    onCheckedChange={setIsAdvancedMode}
                  />
                  <Label htmlFor="adv-mode-scale" className="text-sm cursor-pointer font-medium">Advanced Mode</Label>
                </div>

                {isAdvancedMode && (
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-muted-foreground">Engine:</span>
                    <Select value={renderingMode} onValueChange={(v: RenderingMode) => setRenderingMode(v)}>
                      <SelectTrigger className="h-8 w-[180px] text-xs bg-background">
                        <SelectValue placeholder="Render Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (Smart Routing)</SelectItem>
                        <SelectItem value="server_only">Force Server FFmpeg (VPS)</SelectItem>
                        <SelectItem value="cloudinary_only">Force Cloudinary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <ExecuteStep
                plans={currentPlans}
                blueprint={currentBlueprint}
                executionProgress={executionProgress}
                isExecuting={isRouting || executionProgress.status === 'executing'}
                ffmpegReady={true}
                onExecute={handleExecute}
                onDownloadPlans={downloadAllPlans}
                onContinue={handleExecuteContinue}
              />

              {/* Debug Panel */}
              <RenderDebugPanel debugInfo={debugInfo} isOpen={isAdvancedMode} />
            </div>
          )}

          {/* Step 5: Results */}
          {currentStep === 5 && (
            <ResultsStep
              plans={currentPlans}
              results={executionResults}
              onDownloadPlan={downloadPlan}
              onDownloadAll={downloadAllPlans}
              onReset={handleReset}
            />
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
