/**
 * Creative Scale - PRD Aligned Implementation with AI Brain V2
 * AI Marketing Strategist + Deterministic Video Execution Engine
 * 
 * Core User Value:
 * - Understand why AI made decisions
 * - Generate optimized variations based on proven frameworks
 * - See exactly what AI instructed the video engine to do
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Sparkles, 
  Play, 
  FileVideo, 
  CheckCircle2, 
  AlertCircle,
  Download,
  RefreshCw,
  Trash2,
  Brain,
  Target,
  Zap,
  Eye,
  Settings2,
  Cloud
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCreativeScale } from '@/hooks/useCreativeScale';
import { validateVideoFile, sanitizeFilename, LIMITS } from '@/lib/creative-scale/validation';
import { checkFFmpegEnvironment } from '@/lib/creative-scale/ffmpeg-adapter';
import { SignalsDisplay } from '@/components/creative-scale/SignalsDisplay';
import { VariationCard } from '@/components/creative-scale/VariationCard';
import { ExecutionExplainer } from '@/components/creative-scale/ExecutionExplainer';
import { V1ConstraintsBanner } from '@/components/creative-scale/V1ConstraintsBanner';
import { ResultsGrid } from '@/components/creative-scale/ResultsGrid';
import { FFmpegProgressPanel } from '@/components/creative-scale/FFmpegProgressPanel';
import { 
  ProblemDisplay, 
  ScoringDisplay, 
  BlueprintV2Card, 
  FailureDisplay,
  BrainStatus 
} from '@/components/creative-scale/BrainV2Display';
import type { VideoAnalysis, CreativeBlueprint } from '@/lib/creative-scale/types';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import type { JobStatus } from '@/lib/creative-scale/prd-types';
import type { OptimizationGoal, RiskTolerance } from '@/lib/creative-scale/brain-v2-types';

// ============================================
// SESSION PERSISTENCE
// ============================================

const UI_STORAGE_KEY = 'creative_scale_ui';

interface PersistedUIState {
  currentStep: number;
  jobStatus: JobStatus;
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
  url: string; // Local blob URL for preview
  storageUrl?: string; // Supabase storage URL for FFmpeg
  duration?: number;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  uploadProgress?: number; // 0-100
  error?: string;
}

// ============================================
// STEP INDICATOR
// ============================================

function StepIndicator({ 
  step, 
  currentStep, 
  label, 
  icon: Icon,
  disabled 
}: { 
  step: number; 
  currentStep: number; 
  label: string; 
  icon: React.ElementType;
  disabled?: boolean;
}) {
  const isActive = currentStep === step;
  const isComplete = currentStep > step;
  
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      isActive ? 'bg-primary/10 border border-primary/30' : 
      isComplete ? 'bg-muted/50' : 
      disabled ? 'opacity-30' : 'opacity-50'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isActive ? 'bg-primary text-primary-foreground' :
        isComplete ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
      }`}>
        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
      </div>
      <div>
        <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
          Step {step}
        </p>
        <p className={`text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CreativeScale() {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [jobStatus, setJobStatus] = useState<JobStatus>('READY_TO_ANALYZE');
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [executionResults, setExecutionResults] = useState<Map<string, any>>(new Map());
  const [variationCount, setVariationCount] = useState(3); // User-configurable
  
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
    routerResult,
    routerEvents,
    brainV2State,
    setBrainV2Options,
    analyzeVideo,
    generateBlueprint,
    generateBrainV2Strategy,
    compileAllVariations,
    routePlan,
    reset: resetHook
  } = useCreativeScale();

  // Restore state on mount
  useEffect(() => {
    const savedUI = loadUIState();
    if (savedUI && currentAnalysis) {
      setCurrentStep(savedUI.currentStep);
      if (!['ANALYZING', 'EXECUTING'].includes(savedUI.jobStatus)) {
        setJobStatus(savedUI.jobStatus);
      }
    }
  }, [currentAnalysis]);

  // Persist state
  useEffect(() => {
    saveUIState({ currentStep, jobStatus });
  }, [currentStep, jobStatus]);

  // ============================================
  // STEP 1: INGEST
  // ============================================

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
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
            video.status = 'uploading'; // Mark as uploading to storage
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
    
    // Add videos to state (will show uploading status)
    setUploadedVideos(prev => [...prev, ...newVideos]);
    
    // Upload valid videos to Supabase storage
    const uploadingVideos = newVideos.filter(v => v.status === 'uploading');
    if (uploadingVideos.length > 0) {
      toast.info(`Uploading ${uploadingVideos.length} video(s) to storage...`);
    }
    
    for (const video of uploadingVideos) {
      try {
        // Sanitize filename - use only ASCII characters to avoid storage errors
        const fileExt = video.file.name.split('.').pop() || 'mp4';
        const filePath = `creative-scale/${video.id}/video.${fileExt}`;
        
        // Use XMLHttpRequest for upload progress
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        
        const formData = new FormData();
        formData.append('', video.file);
        
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
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('videos')
          .getPublicUrl(filePath);
        
        // Update video with storage URL
        setUploadedVideos(prev => prev.map(v => 
          v.id === video.id 
            ? { ...v, status: 'ready' as const, storageUrl: urlData.publicUrl, uploadProgress: 100 }
            : v
        ));
        
        console.log('[CreativeScale] Video uploaded to storage:', urlData.publicUrl);
        
      } catch (err) {
        console.error('[CreativeScale] Storage upload failed:', err);
        setUploadedVideos(prev => prev.map(v => 
          v.id === video.id 
            ? { ...v, status: 'error' as const, error: 'Storage upload failed', uploadProgress: undefined }
            : v
        ));
      }
    }
    
    const readyCount = newVideos.filter(v => v.status === 'uploading').length;
    if (readyCount > 0) {
      toast.success(`${readyCount} video(s) ready`);
    }
  }, [uploadedVideos.length]);

  const removeVideo = useCallback((id: string) => {
    setUploadedVideos(prev => {
      const video = prev.find(v => v.id === id);
      if (video) URL.revokeObjectURL(video.url);
      return prev.filter(v => v.id !== id);
    });
  }, []);

  // ============================================
  // STEP 2: ANALYZE (Phase A)
  // ============================================

  const handleAnalyze = useCallback(async () => {
    const readyVideos = uploadedVideos.filter(v => v.status === 'ready');
    if (readyVideos.length === 0) {
      toast.error('No valid videos to analyze');
      return;
    }
    
    setJobStatus('ANALYZING');
    setCurrentStep(2);
    
    try {
      const video = readyVideos[selectedVideoIndex] || readyVideos[0];
      
      const analysis = await analyzeVideo(video.url, video.id, {
        language: 'ar',
        market: 'gcc'
      });
      
      if (!analysis) {
        setJobStatus('READY_TO_ANALYZE');
        setCurrentStep(1);
        return;
      }
      
      toast.success('Analysis complete');
      setJobStatus('STRATEGY_READY');
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
      setJobStatus('READY_TO_ANALYZE');
      setCurrentStep(1);
    }
  }, [uploadedVideos, selectedVideoIndex, analyzeVideo]);

  // ============================================
  // STEP 3: STRATEGY with Brain V2
  // ============================================

  const handleGenerateStrategy = useCallback(async () => {
    if (!currentAnalysis) {
      toast.error('Analysis required first');
      return;
    }
    
    setJobStatus('ANALYZING');
    
    try {
      // Use Brain V2 for strategy generation with user-selected count
      const brainResult = await generateBrainV2Strategy(currentAnalysis, {
        variationCount: Math.min(variationCount, LIMITS.MAX_VARIATIONS)
      });
      
      if (!brainResult.success) {
        // Brain V2 returned a valid "no action" or failure mode
        const failureOutput = brainResult as { success: false; failure: { mode: string; reason: string } };
        toast.info(failureOutput.failure.reason);
        setCurrentStep(3);
        setJobStatus('STRATEGY_READY');
        return;
      }
      
      // Also generate legacy blueprint for compatibility with compiler
      const blueprint = await generateBlueprint(currentAnalysis, {
        variationCount: Math.min(variationCount, brainResult.blueprints.length || variationCount)
      });
      
      if (!blueprint) {
        toast.warning('Blueprint generation failed, using Brain V2 output only');
      }
      
      // Compile all variations if we have a blueprint
      if (blueprint) {
        // Use storage URL for FFmpeg (falls back to blob URL if not available)
        const videoUrl = uploadedVideos[selectedVideoIndex]?.storageUrl || uploadedVideos[0]?.storageUrl || uploadedVideos[0]?.url;
        
        if (!videoUrl) {
          toast.error('No video URL available for compilation');
          return;
        }
        
        console.log('[CreativeScale] Compiling with video URL:', videoUrl.substring(0, 80));
        
        const plans = await compileAllVariations(
          currentAnalysis,
          blueprint,
          videoUrl
        );
        
        if (plans.length === 0) {
          toast.warning('No variations could be compiled');
        } else {
          toast.success(`${plans.length} variation(s) ready with Brain V2 insights`);
        }
      }
      
      setCurrentStep(3);
      setJobStatus('STRATEGY_READY');
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Strategy generation failed');
      setJobStatus('STRATEGY_READY');
    }
  }, [currentAnalysis, generateBrainV2Strategy, generateBlueprint, compileAllVariations, uploadedVideos, variationCount]);

  // ============================================
  // STEP 4: EXECUTE (Phase B - Optional)
  // ============================================

  const handleExecute = useCallback(async () => {
    if (!currentAnalysis || !currentBlueprint || currentPlans.length === 0) {
      toast.error('Planning required first');
      return;
    }
    
    // Check FFmpeg environment before starting
    const envCheck = typeof window !== 'undefined' && window.crossOriginIsolated;
    if (!envCheck) {
      toast.error('FFmpeg requires Cross-Origin Isolation. Video execution may fail.');
    }
    
    setJobStatus('EXECUTING');
    setCurrentStep(4);
    
    const results = new Map();
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < currentPlans.length; i++) {
      try {
        toast.info(`Processing variation ${i + 1}/${currentPlans.length}...`);
        
        const result = await routePlan(
          currentPlans[i],
          currentAnalysis,
          currentBlueprint
        );
        
        results.set(currentPlans[i].plan_id, result);
        
        if (result.status === 'completed') {
          successCount++;
        } else {
          failCount++;
          if (result.reason) errors.push(result.reason);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(errorMsg);
        results.set(currentPlans[i].plan_id, {
          status: 'partial_success',
          error_reason: errorMsg
        });
        failCount++;
      }
    }
    
    setExecutionResults(results);
    
    if (successCount > 0 && failCount === 0) {
      setJobStatus('DONE');
      toast.success(`${successCount} video(s) generated!`);
    } else if (successCount > 0) {
      setJobStatus('PARTIAL_SUCCESS');
      toast.info(`${successCount} succeeded, ${failCount} failed`);
    } else {
      setJobStatus('PARTIAL_SUCCESS');
      const errorSummary = errors[0] || 'FFmpeg execution failed';
      toast.warning(`Execution failed: ${errorSummary.substring(0, 100)}`);
    }
  }, [currentAnalysis, currentBlueprint, currentPlans, routePlan]);

  // ============================================
  // DOWNLOADS
  // ============================================

  const downloadPlan = useCallback((plan: ExecutionPlan) => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-plan-${plan.variation_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Execution plan downloaded');
  }, []);

  const downloadAllArtifacts = useCallback(() => {
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
    toast.success('All artifacts downloaded');
  }, [currentAnalysis, currentBlueprint, currentPlans]);

  // ============================================
  // RESET
  // ============================================

  const handleReset = useCallback(() => {
    uploadedVideos.forEach(v => URL.revokeObjectURL(v.url));
    setUploadedVideos([]);
    setCurrentStep(1);
    setJobStatus('READY_TO_ANALYZE');
    setSelectedVideoIndex(0);
    setSelectedVariationIndex(0);
    setExecutionResults(new Map());
    resetHook();
    clearUIState();
  }, [uploadedVideos, resetHook]);

  // ============================================
  // DERIVED STATE
  // ============================================

  const readyVideos = uploadedVideos.filter(v => v.status === 'ready');
  const isProcessing = isAnalyzing || isGeneratingBlueprint || isCompiling || isRouting;
  const canAnalyze = readyVideos.length > 0 && !isProcessing;
  const canGenerateStrategy = !!currentAnalysis && !isProcessing;
  const canExecute = currentPlans.length > 0 && !isProcessing;
  
  // Check FFmpeg environment
  const ffmpegEnv = checkFFmpegEnvironment();

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              Creative Scale
            </h1>
            <p className="text-muted-foreground mt-1">
              AI Marketing Strategist + Deterministic Video Execution
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <V1ConstraintsBanner minimal />
            
            <Badge 
              variant={jobStatus === 'DONE' ? 'default' : jobStatus === 'PARTIAL_SUCCESS' ? 'secondary' : 'outline'}
              className="capitalize"
            >
              {jobStatus.replace(/_/g, ' ')}
            </Badge>
            
            {(currentStep > 1 || uploadedVideos.length > 0) && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Step Indicators (5 Steps per PRD) */}
        <div className="grid grid-cols-5 gap-3">
          <StepIndicator step={1} currentStep={currentStep} label="Ingest" icon={Upload} />
          <StepIndicator step={2} currentStep={currentStep} label="Analyze" icon={Eye} disabled={!canAnalyze && currentStep < 2} />
          <StepIndicator step={3} currentStep={currentStep} label="Strategy" icon={Target} disabled={!canGenerateStrategy && currentStep < 3} />
          <StepIndicator step={4} currentStep={currentStep} label="Execute" icon={Play} disabled={!canExecute && currentStep < 4} />
          <StepIndicator step={5} currentStep={currentStep} label="Results" icon={CheckCircle2} disabled={currentStep < 5} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Panel - Upload & Videos */}
          <div className="col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Video Assets</CardTitle>
                <CardDescription>Upload 1-20 video ads (max {LIMITS.MAX_DURATION_SEC}s each)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Zone */}
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Drop videos or click to upload
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    MP4, MOV, WebM
                  </span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    disabled={isProcessing}
                  />
                </label>

                {/* Video Grid */}
                <ScrollArea className="h-[280px]">
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedVideos.map((video, idx) => (
                      <div
                        key={video.id}
                        className={`relative rounded-lg overflow-hidden border cursor-pointer ${
                          selectedVideoIndex === idx 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-border'
                        } ${video.status === 'error' ? 'opacity-60' : ''} ${video.status === 'uploading' ? 'opacity-75' : ''}`}
                        onClick={() => setSelectedVideoIndex(idx)}
                      >
                        <div className="aspect-video bg-muted">
                          <video src={video.url} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-xs text-white truncate">{video.file.name}</p>
                          <p className="text-xs text-white/70">
                            {video.status === 'uploading' 
                              ? `Uploading... ${video.uploadProgress ?? 0}%` 
                              : video.duration 
                                ? `${video.duration.toFixed(1)}s` 
                                : 'Loading...'}
                          </p>
                          {video.status === 'uploading' && video.uploadProgress !== undefined && (
                            <div className="w-full h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-200" 
                                style={{ width: `${video.uploadProgress}%` }}
                              />
                            </div>
                          )}
                        </div>
                        {video.status === 'error' && (
                          <div className="absolute top-2 right-2">
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          </div>
                        )}
                        {video.status === 'uploading' && (
                          <div className="absolute top-2 right-2">
                            <RefreshCw className="w-4 h-4 text-white animate-spin" />
                          </div>
                        )}
                        {video.status === 'ready' && video.storageUrl && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 left-2 h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeVideo(video.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {uploadedVideos.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileVideo className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No videos uploaded</p>
                    </div>
                  )}
                </ScrollArea>

                {/* Primary Action */}
                {currentStep === 1 && canAnalyze && (
                  <Button 
                    className="w-full" 
                    onClick={handleAnalyze}
                    disabled={isProcessing}
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* V1 Constraints */}
            <V1ConstraintsBanner />

            {/* FFmpeg Progress Panel - Show during execution */}
            {(isRouting || jobStatus === 'EXECUTING') && (
              <FFmpegProgressPanel 
                events={routerEvents} 
                isActive={isRouting} 
              />
            )}
          </div>

          {/* Right Panel - Main Content */}
          <div className="col-span-2">
            <Card className="h-full">
              <CardContent className="p-6">
                {/* Step 1: Welcome */}
                {currentStep === 1 && !currentAnalysis && (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center">
                    <Sparkles className="w-20 h-20 text-primary/30 mb-6" />
                    <h2 className="text-2xl font-bold mb-3">Welcome to Creative Scale</h2>
                    <p className="text-muted-foreground max-w-md mb-6">
                      Upload your existing video ads. We'll analyze their structure, 
                      identify performance patterns, and generate explainable optimization strategies.
                    </p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Explainable AI
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Real MP4 Output
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Graceful Degradation
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2+: Tabs */}
                {currentAnalysis && (
                  <Tabs defaultValue="signals" className="h-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="signals">Signals</TabsTrigger>
                      {brainV2State.detectedProblems.length > 0 && (
                        <TabsTrigger value="problems">
                          Problems ({brainV2State.detectedProblems.length})
                        </TabsTrigger>
                      )}
                      {brainV2State.blueprintsV2.length > 0 && (
                        <TabsTrigger value="brain-strategy">
                          Brain V2
                        </TabsTrigger>
                      )}
                      {currentBlueprint && <TabsTrigger value="strategy">Strategy</TabsTrigger>}
                      {currentPlans.length > 0 && <TabsTrigger value="variations">Variations ({currentPlans.length})</TabsTrigger>}
                      {executionResults.size > 0 && <TabsTrigger value="results">Results</TabsTrigger>}
                    </TabsList>

                    {/* Signals Tab */}
                    <TabsContent value="signals">
                      <ScrollArea className="h-[450px]">
                        {/* Brain V2 Controls */}
                        <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Brain V2</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Goal:</span>
                            <Select 
                              value={brainV2State.optimizationGoal} 
                              onValueChange={(value: OptimizationGoal) => setBrainV2Options({ goal: value })}
                            >
                              <SelectTrigger className="w-[100px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="retention">Retention</SelectItem>
                                <SelectItem value="ctr">CTR</SelectItem>
                                <SelectItem value="cpa">CPA</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Risk:</span>
                            <Select 
                              value={brainV2State.riskTolerance} 
                              onValueChange={(value: RiskTolerance) => setBrainV2Options({ risk: value })}
                            >
                              <SelectTrigger className="w-[90px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Variations:</span>
                            <Select 
                              value={variationCount.toString()} 
                              onValueChange={(value) => setVariationCount(parseInt(value))}
                            >
                              <SelectTrigger className="w-[70px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map(n => (
                                  <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <BrainStatus 
                          isProcessing={isGeneratingBlueprint} 
                          currentLayer={isGeneratingBlueprint ? "Running 5-layer decision engine..." : undefined}
                        />
                        
                        <SignalsDisplay analysis={currentAnalysis} />
                        
                        {currentStep === 2 && !currentBlueprint && (
                          <Button 
                            className="w-full mt-6" 
                            onClick={handleGenerateStrategy}
                            disabled={isProcessing}
                          >
                            {isGeneratingBlueprint || isCompiling ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Brain V2 Processing...
                              </>
                            ) : (
                              <>
                                <Brain className="w-4 h-4 mr-2" />
                                Generate with Brain V2
                              </>
                            )}
                          </Button>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    {/* Problems Tab */}
                    {brainV2State.detectedProblems.length > 0 && (
                      <TabsContent value="problems">
                        <ScrollArea className="h-[450px]">
                          <ProblemDisplay problems={brainV2State.detectedProblems} />
                        </ScrollArea>
                      </TabsContent>
                    )}

                    {/* Brain V2 Strategy Tab */}
                    {brainV2State.blueprintsV2.length > 0 && (
                      <TabsContent value="brain-strategy">
                        <ScrollArea className="h-[450px]">
                          <div className="space-y-4">
                            {brainV2State.blueprintsV2[0]?.scoring_details && (
                              <ScoringDisplay 
                                scoredStrategies={brainV2State.blueprintsV2[0].scoring_details}
                              />
                            )}
                            <div className="grid grid-cols-1 gap-4">
                              {brainV2State.blueprintsV2.map((blueprint, idx) => (
                                <BlueprintV2Card
                                  key={blueprint.variation_id}
                                  blueprint={blueprint}
                                  index={idx}
                                  selected={selectedVariationIndex === idx}
                                  onSelect={() => setSelectedVariationIndex(idx)}
                                />
                              ))}
                            </div>
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    )}

                    {/* Brain V2 Failure */}
                    {brainV2State.brainOutput && !brainV2State.brainOutput.success && (
                      <TabsContent value="brain-strategy">
                        <FailureDisplay 
                          failure={(brainV2State.brainOutput as { success: false; failure: any }).failure}
                          onRetry={handleGenerateStrategy}
                        />
                      </TabsContent>
                    )}

                    {/* Strategy Tab */}
                    {currentBlueprint && (
                      <TabsContent value="strategy">
                        <ScrollArea className="h-[450px]">
                          <div className="space-y-4">
                            {/* Framework Info */}
                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                              <div className="flex items-center gap-2 mb-2">
                                <Target className="w-5 h-5 text-primary" />
                                <span className="font-semibold">Framework: {currentBlueprint.framework}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {currentBlueprint.framework_rationale}
                              </p>
                            </div>

                            {/* Objective */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground mb-1">Goal</p>
                                <p className="text-sm font-medium">{currentBlueprint.objective.primary_goal}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground mb-1">Target Emotion</p>
                                <p className="text-sm font-medium">{currentBlueprint.objective.target_emotion}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground mb-1">Key Message</p>
                                <p className="text-sm font-medium">{currentBlueprint.objective.key_message}</p>
                              </div>
                            </div>

                            {/* Strategic Insights */}
                            {currentBlueprint.strategic_insights.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">Strategic Insights</h4>
                                <ul className="space-y-1">
                                  {currentBlueprint.strategic_insights.map((insight, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <span className="text-primary">•</span>
                                      {insight}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    )}

                    {/* Variations Tab */}
                    {currentPlans.length > 0 && (
                      <TabsContent value="variations">
                        <ScrollArea className="h-[450px]">
                          <div className="space-y-4">
                            {/* Variation Cards */}
                            <div className="grid grid-cols-2 gap-3">
                              {currentBlueprint?.variation_ideas.slice(0, currentPlans.length).map((variation, idx) => (
                                <VariationCard
                                  key={variation.id}
                                  variation={variation}
                                  index={idx}
                                  framework={currentBlueprint.framework}
                                  expectedLiftPct={10 + idx * 5}
                                  aiReasoning={variation.reasoning}
                                  selected={selectedVariationIndex === idx}
                                  onClick={() => setSelectedVariationIndex(idx)}
                                />
                              ))}
                            </div>

                            {/* Selected Plan Details */}
                            {currentPlans[selectedVariationIndex] && (
                              <ExecutionExplainer 
                                plan={currentPlans[selectedVariationIndex]}
                                variation={currentBlueprint?.variation_ideas[selectedVariationIndex]}
                              />
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                              <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={downloadAllArtifacts}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download All Plans
                              </Button>
                              <Button 
                                className="flex-1"
                                onClick={handleExecute}
                                disabled={isProcessing}
                                title={!ffmpegEnv.ready ? 'Will use cloud processing' : undefined}
                              >
                                {isRouting ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Executing...
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-4 h-4 mr-2" />
                                    Generate {currentPlans.length} Video(s)
                                    {!ffmpegEnv.ready && <Cloud className="w-3 h-3 ml-1" />}
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {/* Cloud Processing Info */}
                            {!ffmpegEnv.ready && (
                              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                                <p className="text-blue-400 font-medium">☁️ Cloud Processing Mode</p>
                                <p className="text-blue-400/70 text-xs mt-1">
                                  Browser FFmpeg unavailable. Videos will be rendered on cloud servers instead.
                                </p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    )}

                    {/* Results Tab */}
                    {executionResults.size > 0 && (
                      <TabsContent value="results">
                        <ScrollArea className="h-[450px]">
                          <ResultsGrid
                            items={currentPlans.map((plan, idx) => ({
                              variationIndex: idx,
                              plan,
                              result: executionResults.get(plan.plan_id),
                              engineUsed: executionResults.get(plan.plan_id)?.engine_used || 'none',
                              errorReason: executionResults.get(plan.plan_id)?.error_reason
                            }))}
                            onDownloadPlan={(item) => downloadPlan(item.plan)}
                            onDownloadVideo={(item) => {
                              const result = item.result as any;
                              if (result?.output_video_url) {
                                window.open(result.output_video_url, '_blank');
                              }
                            }}
                          />
                        </ScrollArea>
                      </TabsContent>
                    )}
                  </Tabs>
                )}

                {/* Error Display */}
                {error && (
                  <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
