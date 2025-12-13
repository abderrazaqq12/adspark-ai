/**
 * Creative Scale - New feature page
 * Independent from Creative Replicator
 * 4-step workflow: Upload → Analyze → Plan → Execute
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Sparkles, 
  Zap, 
  Play, 
  FileVideo, 
  CheckCircle2, 
  AlertCircle,
  Download,
  RefreshCw,
  Trash2,
  Brain,
  Target,
  Clock,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreativeScale } from '@/hooks/useCreativeScale';
import { validateVideoFile, sanitizeFilename, LIMITS } from '@/lib/creative-scale/validation';
import type { VideoAnalysis, CreativeBlueprint } from '@/lib/creative-scale/types';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import type { RouterResult } from '@/lib/creative-scale/router-types';

// ============================================
// SESSION PERSISTENCE FOR UI STATE
// ============================================

const UI_STORAGE_KEY = 'creative_scale_ui';

interface PersistedUIState {
  currentStep: number;
  jobState: JobState;
}

function saveUIState(state: PersistedUIState): void {
  try {
    sessionStorage.setItem(UI_STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
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
// JOB STATE MACHINE
// ============================================

type JobState = 'idle' | 'uploading' | 'analyzing' | 'planning' | 'executing' | 'completed' | 'partial_success';

interface UploadedVideo {
  id: string;
  file: File;
  url: string;
  duration?: number;
  thumbnail?: string;
  status: 'pending' | 'ready' | 'error';
  error?: string;
}

// ============================================
// STEP COMPONENTS
// ============================================

function StepIndicator({ 
  step, 
  currentStep, 
  label, 
  icon: Icon 
}: { 
  step: number; 
  currentStep: number; 
  label: string; 
  icon: React.ElementType;
}) {
  const isActive = currentStep === step;
  const isComplete = currentStep > step;
  
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      isActive ? 'bg-primary/10 border border-primary/30' : 
      isComplete ? 'bg-muted/50' : 'opacity-50'
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
  // Local state
  const [currentStep, setCurrentStep] = useState(1);
  const [jobState, setJobState] = useState<JobState>('idle');
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  
  // Hook state
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
    analyzeVideo,
    generateBlueprint,
    compileAllVariations,
    routePlan,
    reset: resetHook
  } = useCreativeScale();

  // ============================================
  // RESTORE UI STATE ON MOUNT
  // ============================================

  useEffect(() => {
    const savedUI = loadUIState();
    if (savedUI) {
      // Only restore if we have analysis data
      if (currentAnalysis) {
        setCurrentStep(savedUI.currentStep);
        // Don't restore processing states
        if (savedUI.jobState !== 'uploading' && 
            savedUI.jobState !== 'analyzing' && 
            savedUI.jobState !== 'planning' && 
            savedUI.jobState !== 'executing') {
          setJobState(savedUI.jobState);
        }
      }
    }
  }, [currentAnalysis]);

  // Persist UI state on change
  useEffect(() => {
    saveUIState({ currentStep, jobState });
  }, [currentStep, jobState]);

  // ============================================
  // STEP 1: UPLOAD
  // ============================================

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setJobState('uploading');
    const newVideos: UploadedVideo[] = [];
    
    for (const file of Array.from(files)) {
      // Sanitize filename
      const safeFilename = sanitizeFilename(file.name);
      
      // Validate file (size + type)
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        toast.error(`${safeFilename}: ${validation.error}`);
        continue;
      }
      
      // Validate file count
      if (uploadedVideos.length + newVideos.length >= LIMITS.MAX_VIDEOS) {
        toast.error(`Maximum ${LIMITS.MAX_VIDEOS} videos allowed`);
        break;
      }
      
      // Create object URL for preview
      const url = URL.createObjectURL(file);
      
      // Create safe file reference with sanitized name
      const safeFile = new File([file], safeFilename, { type: file.type });
      
      newVideos.push({
        id: `video_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file: safeFile,
        url,
        status: 'pending'
      });
    }
    
    // Validate duration for each video
    for (const video of newVideos) {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          video.status = 'error';
          video.error = 'Video load timeout';
          resolve();
        }, 10000); // 10s timeout for metadata load
        
        videoEl.onloadedmetadata = () => {
          clearTimeout(timeout);
          video.duration = videoEl.duration;
          if (videoEl.duration > LIMITS.MAX_DURATION_SEC) {
            video.status = 'error';
            video.error = `Duration exceeds ${LIMITS.MAX_DURATION_SEC} seconds`;
          } else {
            video.status = 'ready';
          }
          resolve();
        };
        videoEl.onerror = () => {
          clearTimeout(timeout);
          video.status = 'error';
          video.error = 'Failed to load video (may be corrupted)';
          resolve();
        };
        videoEl.src = video.url;
      });
    }
    
    setUploadedVideos(prev => [...prev, ...newVideos]);
    setJobState('idle');
    
    const readyCount = newVideos.filter(v => v.status === 'ready').length;
    if (readyCount > 0) {
      toast.success(`${readyCount} video(s) uploaded successfully`);
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
  // STEP 2: ANALYZE
  // ============================================

  const handleAnalyze = useCallback(async () => {
    const readyVideos = uploadedVideos.filter(v => v.status === 'ready');
    if (readyVideos.length === 0) {
      toast.error('No valid videos to analyze');
      return;
    }
    
    setJobState('analyzing');
    setCurrentStep(2);
    
    try {
      // Analyze first video (for now)
      const video = readyVideos[selectedVideoIndex] || readyVideos[0];
      
      const analysis = await analyzeVideo(video.url, video.id, {
        language: 'ar',
        market: 'gcc'
      });
      
      if (!analysis) {
        // Error already set by hook
        setJobState('idle');
        setCurrentStep(1);
        return;
      }
      
      // Generate blueprint with capped variations
      const blueprint = await generateBlueprint(analysis, {
        variationCount: Math.min(5, LIMITS.MAX_VARIATIONS)
      });
      
      if (!blueprint) {
        // Error already set by hook
        setJobState('idle');
        return;
      }
      
      toast.success('Analysis complete');
      setCurrentStep(3);
      setJobState('idle');
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
      setJobState('idle'); // Always reset state on error
      setCurrentStep(1);
    }
  }, [uploadedVideos, selectedVideoIndex, analyzeVideo, generateBlueprint]);

  // ============================================
  // STEP 3: PLAN VARIATIONS
  // ============================================

  const handlePlanVariations = useCallback(async () => {
    if (!currentAnalysis || !currentBlueprint) {
      toast.error('Analysis required first');
      return;
    }
    
    setJobState('planning');
    
    try {
      const plans = await compileAllVariations(
        currentAnalysis,
        currentBlueprint,
        uploadedVideos[0]?.url
      );
      
      if (plans.length === 0) {
        toast.warning('No execution plans could be generated. Check variation compatibility.');
        setJobState('idle');
        return;
      }
      
      toast.success(`${plans.length} variation(s) planned`);
      setCurrentStep(4);
      setJobState('idle');
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Planning failed');
      setJobState('idle'); // Always reset state on error
    }
  }, [currentAnalysis, currentBlueprint, compileAllVariations, uploadedVideos]);

  // ============================================
  // STEP 4: EXECUTE
  // ============================================

  const handleExecute = useCallback(async () => {
    if (!currentAnalysis || !currentBlueprint || currentPlans.length === 0) {
      toast.error('Planning required first');
      return;
    }
    
    setJobState('executing');
    
    try {
      // Execute first plan
      const result = await routePlan(
        currentPlans[0],
        currentAnalysis,
        currentBlueprint
      );
      
      if (result.status === 'completed') {
        setJobState('completed');
        toast.success('Video generated successfully!');
      } else {
        setJobState('partial_success');
        toast.info('Partial success - creative plan preserved');
      }
      
    } catch (err) {
      setJobState('partial_success');
      toast.info('Execution failed - artifacts preserved for manual editing');
    }
  }, [currentAnalysis, currentBlueprint, currentPlans, routePlan]);

  // ============================================
  // RESET
  // ============================================

  const handleReset = useCallback(() => {
    uploadedVideos.forEach(v => URL.revokeObjectURL(v.url));
    setUploadedVideos([]);
    setCurrentStep(1);
    setJobState('idle');
    setSelectedVideoIndex(0);
    resetHook();
    clearUIState();
  }, [uploadedVideos, resetHook]);

  // ============================================
  // DOWNLOAD ARTIFACTS
  // ============================================

  const downloadArtifacts = useCallback(() => {
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
    
    toast.success('Artifacts downloaded');
  }, [currentAnalysis, currentBlueprint, currentPlans]);

  // ============================================
  // RENDER
  // ============================================

  const readyVideos = uploadedVideos.filter(v => v.status === 'ready');
  const isProcessing = isAnalyzing || isGeneratingBlueprint || isCompiling || isRouting;

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
              AI-powered video ad optimization system
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={jobState === 'idle' ? 'secondary' : 'default'} className="capitalize">
              {jobState.replace('_', ' ')}
            </Badge>
            
            {(currentStep > 1 || uploadedVideos.length > 0) && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-4 gap-4">
          <StepIndicator step={1} currentStep={currentStep} label="Upload Ads" icon={Upload} />
          <StepIndicator step={2} currentStep={currentStep} label="Analyze" icon={Brain} />
          <StepIndicator step={3} currentStep={currentStep} label="Plan Variations" icon={Target} />
          <StepIndicator step={4} currentStep={currentStep} label="Execute" icon={Play} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Panel - Upload & Videos */}
          <div className="col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Video Assets</CardTitle>
                <CardDescription>Upload 1-20 video ads (max 60s each)</CardDescription>
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

                {/* Video List */}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {uploadedVideos.map((video, idx) => (
                      <div
                        key={video.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                          selectedVideoIndex === idx 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:bg-muted/50'
                        } ${video.status === 'error' ? 'opacity-60' : ''}`}
                        onClick={() => setSelectedVideoIndex(idx)}
                      >
                        <div className="w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                          <video src={video.url} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{video.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {video.duration ? `${video.duration.toFixed(1)}s` : 'Loading...'}
                          </p>
                        </div>
                        {video.status === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        ) : video.status === 'ready' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeVideo(video.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {uploadedVideos.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileVideo className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No videos uploaded</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Action Button */}
                {readyVideos.length > 0 && currentStep === 1 && (
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
                        Analyze {readyVideos.length} Video(s)
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Analysis & Results */}
          <div className="col-span-2 space-y-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {currentStep === 1 && 'Getting Started'}
                  {currentStep === 2 && 'Analysis Results'}
                  {currentStep === 3 && 'Planned Variations'}
                  {currentStep === 4 && 'Execution Results'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Step 1: Welcome */}
                {currentStep === 1 && (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <Sparkles className="w-16 h-16 text-primary/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Welcome to Creative Scale</h3>
                    <p className="text-muted-foreground max-w-md">
                      Upload your existing video ads and let AI analyze their structure, 
                      identify winning patterns, and generate optimized variations.
                    </p>
                    <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Works without FFmpeg
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Graceful degradation
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Export for manual edit
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Analysis */}
                {currentStep >= 2 && currentAnalysis && currentBlueprint && (
                  <Tabs defaultValue="analysis" className="h-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="analysis">Analysis</TabsTrigger>
                      <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
                      {currentPlans.length > 0 && (
                        <TabsTrigger value="plans">Execution Plans</TabsTrigger>
                      )}
                      {routerResult && (
                        <TabsTrigger value="result">Result</TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="analysis">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {/* Scores */}
                          <div className="grid grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">Hook Strength</p>
                              <p className="text-2xl font-bold">
                                {Math.round(currentAnalysis.overall_scores.hook_strength * 100)}%
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">Clarity</p>
                              <p className="text-2xl font-bold">
                                {Math.round(currentAnalysis.overall_scores.message_clarity * 100)}%
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">Pacing</p>
                              <p className="text-2xl font-bold">
                                {Math.round(currentAnalysis.overall_scores.pacing_consistency * 100)}%
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">CTA Effect</p>
                              <p className="text-2xl font-bold">
                                {Math.round(currentAnalysis.overall_scores.cta_effectiveness * 100)}%
                              </p>
                            </div>
                          </div>

                          {/* Segments */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Detected Segments</h4>
                            <div className="space-y-2">
                              {currentAnalysis.segments.map((seg, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                                  <Badge variant="outline" className="capitalize">
                                    {seg.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {(seg.start_ms / 1000).toFixed(1)}s - {(seg.end_ms / 1000).toFixed(1)}s
                                  </span>
                                  <div className="flex-1" />
                                  <div className="flex items-center gap-2 text-xs">
                                    <span>Attention: {Math.round(seg.attention_score * 100)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Style: {currentAnalysis.detected_style}</span>
                            <span>Language: {currentAnalysis.detected_language}</span>
                            <span>Duration: {(currentAnalysis.metadata.duration_ms / 1000).toFixed(1)}s</span>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="blueprint">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {/* Framework */}
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="w-5 h-5 text-primary" />
                              <span className="font-medium">Framework: {currentBlueprint.framework}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {currentBlueprint.framework_rationale}
                            </p>
                          </div>

                          {/* Objective */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Objective</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="p-3 rounded bg-muted/30">
                                <p className="text-xs text-muted-foreground">Goal</p>
                                <p className="text-sm">{currentBlueprint.objective.primary_goal}</p>
                              </div>
                              <div className="p-3 rounded bg-muted/30">
                                <p className="text-xs text-muted-foreground">Emotion</p>
                                <p className="text-sm">{currentBlueprint.objective.target_emotion}</p>
                              </div>
                              <div className="p-3 rounded bg-muted/30">
                                <p className="text-xs text-muted-foreground">Message</p>
                                <p className="text-sm">{currentBlueprint.objective.key_message}</p>
                              </div>
                            </div>
                          </div>

                          {/* Variation Ideas */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Variation Ideas ({currentBlueprint.variation_ideas.length})
                            </h4>
                            <div className="space-y-2">
                              {currentBlueprint.variation_ideas.map((idea, idx) => (
                                <div key={idx} className="p-3 rounded bg-muted/30 flex items-start gap-3">
                                  <Badge variant={
                                    idea.priority === 'high' ? 'default' : 
                                    idea.priority === 'medium' ? 'secondary' : 'outline'
                                  } className="mt-0.5">
                                    {idea.priority}
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium capitalize">
                                      {idea.action.replace(/_/g, ' ')} → {idea.target_segment_type}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {idea.intent}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Button */}
                          {currentStep === 2 && (
                            <Button 
                              className="w-full" 
                              onClick={() => setCurrentStep(3)}
                            >
                              <Zap className="w-4 h-4 mr-2" />
                              Continue to Planning
                            </Button>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="plans">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {currentPlans.map((plan, idx) => (
                            <div key={plan.plan_id} className="p-4 rounded-lg border">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Variation {idx + 1}</span>
                                  <Badge variant={plan.status === 'compilable' ? 'default' : 'destructive'}>
                                    {plan.status}
                                  </Badge>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {(plan.validation.total_duration_ms / 1000).toFixed(1)}s
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Segments:</span>{' '}
                                  {plan.validation.segment_count}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Audio Tracks:</span>{' '}
                                  {plan.validation.audio_track_count}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Resolution:</span>{' '}
                                  {plan.output_format.width}x{plan.output_format.height}
                                </div>
                              </div>
                              {plan.validation.warnings.length > 0 && (
                                <div className="mt-2 text-xs text-amber-500">
                                  {plan.validation.warnings.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}

                          {currentStep === 3 && (
                            <div className="flex gap-3">
                              <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={downloadArtifacts}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Plan
                              </Button>
                              <Button 
                                className="flex-1"
                                onClick={handleExecute}
                                disabled={isRouting}
                              >
                                {isRouting ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Executing...
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Execute (Optional)
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    {routerResult && (
                      <TabsContent value="result">
                        <div className="space-y-4">
                          {routerResult.status === 'completed' ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-center">
                              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                              <h3 className="text-xl font-semibold">Video Generated!</h3>
                              <p className="text-muted-foreground mt-2">
                                Processing time: {routerResult.processing_time_ms}ms
                              </p>
                              {routerResult.video_url && (
                                <Button className="mt-4" asChild>
                                  <a href={routerResult.video_url} target="_blank" rel="noopener">
                                    <Play className="w-4 h-4 mr-2" />
                                    View Video
                                  </a>
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-[300px] text-center">
                              <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
                              <h3 className="text-xl font-semibold">Partial Success</h3>
                              <p className="text-muted-foreground mt-2 max-w-md">
                                {routerResult.human_readable_message}
                              </p>
                              <Button className="mt-4" onClick={downloadArtifacts}>
                                <Download className="w-4 h-4 mr-2" />
                                Download for Manual Editing
                              </Button>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                )}

                {/* Step 3 Entry Point */}
                {currentStep === 3 && currentPlans.length === 0 && !isCompiling && (
                  <div className="flex flex-col items-center justify-center h-[400px]">
                    <Button size="lg" onClick={handlePlanVariations}>
                      <Zap className="w-5 h-5 mr-2" />
                      Generate Execution Plans
                    </Button>
                  </div>
                )}

                {/* Loading State */}
                {isCompiling && (
                  <div className="flex flex-col items-center justify-center h-[400px]">
                    <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground">Compiling variations...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
