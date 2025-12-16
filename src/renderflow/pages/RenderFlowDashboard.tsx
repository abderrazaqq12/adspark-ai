/**
 * RenderFlow Dashboard - Full Creative Scale style
 * 6-step pipeline: Input → Analyze → Strategy → Review → Execute → Results
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { RenderFlowStepSidebar, RenderStepId } from '../components/RenderFlowStepSidebar';
import { InputStep } from '../components/steps/InputStep';
import { AnalyzeStep } from '../components/steps/AnalyzeStep';
import { StrategyStep } from '../components/steps/StrategyStep';
import { ReviewStep } from '../components/steps/ReviewStep';
import { ExecuteStep } from '../components/steps/ExecuteStep';
import { ResultsStep } from '../components/steps/ResultsStep';
import { JobList } from '../components/JobList';
import { RenderFlowApi, RenderFlowJob, HealthResponse } from '../api';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import type { VideoAnalysis, CreativeBlueprint } from '@/lib/creative-scale/types';
import type { OptimizationGoal, RiskTolerance, DetectedProblem } from '@/lib/creative-scale/brain-v2-types';

const SESSION_KEY = 'renderflow_pipeline_state';

type PlatformType = 'tiktok' | 'reels' | 'snapchat' | 'youtube' | 'facebook' | 'general';
type FunnelStageType = 'cold' | 'warm' | 'retargeting';

interface BrainV2State {
  optimizationGoal: OptimizationGoal;
  riskTolerance: RiskTolerance;
  platform: PlatformType;
  funnelStage: FunnelStageType;
  detectedProblems: DetectedProblem[];
}

interface PipelineState {
  currentStep: RenderStepId;
  completedSteps: RenderStepId[];
  sourceUrls: string[];
  variations: number;
  jobs: RenderFlowJob[];
  analysis: VideoAnalysis | null;
  blueprint: CreativeBlueprint | null;
  brainV2State: BrainV2State;
}

const defaultBrainV2State: BrainV2State = {
  optimizationGoal: 'retention',
  riskTolerance: 'medium',
  platform: 'tiktok',
  funnelStage: 'cold',
  detectedProblems: []
};

function loadSessionState(): PipelineState | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PipelineState;
  } catch {
    return null;
  }
}

function saveSessionState(state: PipelineState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

function clearSessionState(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Mock analysis for demo when edge function unavailable
function createMockAnalysis(sourceUrl: string): VideoAnalysis {
  return {
    id: `analysis_${Date.now()}`,
    source_video_id: sourceUrl,
    analyzed_at: new Date().toISOString(),
    metadata: { duration_ms: 15000, aspect_ratio: '9:16', resolution: '1080x1920', fps: 30 },
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

export default function RenderFlowDashboard() {
  const initialState = loadSessionState();

  // Step Navigation
  const [currentStep, setCurrentStep] = useState<RenderStepId>(initialState?.currentStep ?? 1);
  const [completedSteps, setCompletedSteps] = useState<RenderStepId[]>(initialState?.completedSteps ?? []);

  // Pipeline Data
  const [sourceUrls, setSourceUrls] = useState<string[]>(initialState?.sourceUrls ?? []);
  const [variations, setVariations] = useState(initialState?.variations ?? 1);
  const [jobs, setJobs] = useState<RenderFlowJob[]>(initialState?.jobs ?? []);
  
  // Step 2: Analyze
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(initialState?.analysis ?? null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Step 3: Strategy
  const [blueprint, setBlueprint] = useState<CreativeBlueprint | null>(initialState?.blueprint ?? null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [brainV2State, setBrainV2State] = useState<BrainV2State>(initialState?.brainV2State ?? defaultBrainV2State);
  
  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Health Check State
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthChecking, setHealthChecking] = useState(true);

  // Polling
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state
  const allDone = jobs.length > 0 && jobs.every(j => j.state === 'done' || j.state === 'failed');

  // Persist state to sessionStorage
  useEffect(() => {
    saveSessionState({
      currentStep,
      completedSteps,
      sourceUrls,
      variations,
      jobs,
      analysis,
      blueprint,
      brainV2State
    });
  }, [currentStep, completedSteps, sourceUrls, variations, jobs, analysis, blueprint, brainV2State]);

  // Health check on mount
  useEffect(() => {
    const checkHealth = async () => {
      setHealthChecking(true);
      try {
        const res = await RenderFlowApi.checkHealth();
        setHealth(res);
        setHealthError(null);
      } catch (e: any) {
        setHealthError(e.message);
        setHealth(null);
      } finally {
        setHealthChecking(false);
      }
    };
    checkHealth();
  }, []);

  // Step navigation
  const goToStep = useCallback((step: RenderStepId) => {
    if (step <= currentStep || completedSteps.includes(step)) {
      setCurrentStep(step);
    }
  }, [currentStep, completedSteps]);

  const completeStep = useCallback((step: RenderStepId) => {
    setCompletedSteps(prev => prev.includes(step) ? prev : [...prev, step]);
  }, []);

  // Step 1: Input complete
  const handleInputComplete = (urls: string[]) => {
    setSourceUrls(urls);
    completeStep(1);
    setCurrentStep(2);
  };

  // Step 2: AI Analysis
  const handleAnalyze = async () => {
    if (sourceUrls.length === 0) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('creative-scale-analyze', {
        body: { video_url: sourceUrls[0], video_id: `renderflow_${Date.now()}` }
      });
      if (error) throw error;
      if (data?.analysis) {
        setAnalysis(data.analysis);
        if (data.detectedProblems) {
          setBrainV2State(prev => ({ ...prev, detectedProblems: data.detectedProblems }));
        }
      }
    } catch (e: any) {
      console.error('Analysis failed:', e);
      setAnalysis(createMockAnalysis(sourceUrls[0]));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeComplete = () => {
    completeStep(2);
    setCurrentStep(3);
  };

  // Step 3: Strategy Generation
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
      setBlueprint(createMockBlueprint(analysis));
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const handleStrategyComplete = () => {
    completeStep(3);
    setCurrentStep(4);
  };

  // Step 4: Start rendering
  const handleStartRendering = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const allJobIds: string[] = [];
      const projectId = `proj_${Date.now()}`;

      for (const url of sourceUrls) {
        const res = await RenderFlowApi.submitJob(projectId, url, variations);
        const ids = res.ids || [];
        allJobIds.push(...ids);
      }

      if (allJobIds.length === 0) {
        throw new Error('Backend returned empty job IDs');
      }

      const initialJobs: RenderFlowJob[] = allJobIds.map((id: string) => ({
        id,
        variation_id: '',
        project_id: '',
        state: 'queued' as const,
        progress_pct: 0,
        created_at: new Date().toISOString()
      }));

      setJobs(initialJobs);
      completeStep(4);
      setCurrentStep(5);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 5: Polling
  useEffect(() => {
    if (currentStep !== 5 || jobs.length === 0) return;
    if (allDone) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      completeStep(5);
      return;
    }

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
  }, [currentStep, jobs, allDone, completeStep]);

  // Reset pipeline
  const handleReset = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setSourceUrls([]);
    setVariations(1);
    setJobs([]);
    setAnalysis(null);
    setBlueprint(null);
    setBrainV2State(defaultBrainV2State);
    setSubmitError(null);
    clearSessionState();
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <InputStep onContinue={handleInputComplete} initialUrls={sourceUrls} />;
      case 2:
        return (
          <AnalyzeStep
            sourceUrl={sourceUrls[0] || ''}
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            onAnalyze={handleAnalyze}
            onContinue={handleAnalyzeComplete}
            onBack={() => setCurrentStep(1)}
          />
        );
      case 3:
        return analysis ? (
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
            onContinue={handleStrategyComplete}
            onBack={() => setCurrentStep(2)}
          />
        ) : null;
      case 4:
        return (
          <ReviewStep
            sourceUrls={sourceUrls}
            variations={variations}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onStartRendering={handleStartRendering}
            onBack={() => setCurrentStep(3)}
          />
        );
      case 5:
        return (
          <ExecuteStep
            jobs={jobs}
            isPolling={!allDone}
            onReset={handleReset}
            onViewResults={() => {
              completeStep(5);
              setCurrentStep(6);
            }}
          />
        );
      case 6:
        return <ResultsStep jobs={jobs} onReset={handleReset} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <RenderFlowStepSidebar
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
        onReset={handleReset}
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Health Status Banner */}
        <div className={`p-3 rounded border flex items-center gap-3 ${
          healthChecking 
            ? 'bg-muted border-border' 
            : healthError 
              ? 'bg-destructive/10 border-destructive/30' 
              : health?.ffmpeg === 'ready'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          {healthChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Checking backend health...</span>
            </>
          ) : healthError ? (
            <>
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive font-mono">{healthError}</span>
            </>
          ) : health?.ffmpeg === 'ready' ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">Backend ready (FFmpeg available)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-yellow-600">Backend unhealthy: {health?.error || 'FFmpeg unavailable'}</span>
            </>
          )}
        </div>

        {/* Current Step Content */}
        <div className="max-w-2xl">
          {renderStepContent()}
        </div>

        {/* Execution History */}
        <div className="pt-6 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">Recent Execution History</h3>
          <JobList />
        </div>
      </div>
    </div>
  );
}
