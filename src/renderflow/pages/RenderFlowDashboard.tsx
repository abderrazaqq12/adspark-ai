/**
 * RenderFlow Dashboard - Rebuilt to match Creative Scale structure
 * Step-based pipeline with strict backend mirroring
 * NO fake progress, NO optimistic UI, NO abstractions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { RenderFlowStepSidebar, RenderStepId } from '../components/RenderFlowStepSidebar';
import { InputStep } from '../components/steps/InputStep';
import { ConfigureStep } from '../components/steps/ConfigureStep';
import { ReviewStep } from '../components/steps/ReviewStep';
import { ExecuteStep } from '../components/steps/ExecuteStep';
import { ResultsStep } from '../components/steps/ResultsStep';
import { JobList } from '../components/JobList';
import { RenderFlowApi, RenderFlowJob, HealthResponse } from '../api';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

const SESSION_KEY = 'renderflow_pipeline_state';

interface PipelineState {
  currentStep: RenderStepId;
  completedSteps: RenderStepId[];
  sourceUrls: string[];
  variations: number;
  jobs: RenderFlowJob[];
}

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

export default function RenderFlowDashboard() {
  // Load initial state from session
  const initialState = loadSessionState();

  // Step Navigation
  const [currentStep, setCurrentStep] = useState<RenderStepId>(initialState?.currentStep ?? 1);
  const [completedSteps, setCompletedSteps] = useState<RenderStepId[]>(initialState?.completedSteps ?? []);

  // Pipeline Data - now supports multiple source URLs (1-20)
  const [sourceUrls, setSourceUrls] = useState<string[]>(initialState?.sourceUrls ?? []);
  const [variations, setVariations] = useState(initialState?.variations ?? 1);
  const [jobs, setJobs] = useState<RenderFlowJob[]>(initialState?.jobs ?? []);
  
  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Health Check State
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthChecking, setHealthChecking] = useState(true);

  // Polling
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state from API only
  const allDone = jobs.length > 0 && jobs.every(j => j.state === 'done' || j.state === 'failed');

  // Persist state to sessionStorage on change
  useEffect(() => {
    saveSessionState({
      currentStep,
      completedSteps,
      sourceUrls,
      variations,
      jobs
    });
  }, [currentStep, completedSteps, sourceUrls, variations, jobs]);

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
    setCompletedSteps(prev => {
      if (prev.includes(step)) return prev;
      return [...prev, step];
    });
  }, []);

  // Step 1: Input complete (now receives array of URLs)
  const handleInputComplete = (urls: string[]) => {
    setSourceUrls(urls);
    completeStep(1);
    setCurrentStep(2);
  };

  // Step 2: Configure complete
  const handleConfigureComplete = (count: number) => {
    setVariations(count);
    completeStep(2);
    setCurrentStep(3);
  };

  // Step 3: Start rendering - submit jobs for ALL source URLs
  const handleStartRendering = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const allJobIds: string[] = [];
      const projectId = `proj_${Date.now()}`;

      // Submit jobs for each source URL
      for (const url of sourceUrls) {
        const res = await RenderFlowApi.submitJob(projectId, url, variations);
        const ids = res.ids || [];
        allJobIds.push(...ids);
      }

      if (allJobIds.length === 0) {
        throw new Error('Backend returned empty job IDs');
      }

      // Initialize jobs from API response only
      const initialJobs: RenderFlowJob[] = allJobIds.map((id: string) => ({
        id,
        variation_id: '',
        project_id: '',
        state: 'queued' as const,
        progress_pct: 0,
        created_at: new Date().toISOString()
      }));

      setJobs(initialJobs);
      completeStep(3);
      setCurrentStep(4);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4: Polling - strict 1000ms, stops only when ALL done/failed
  useEffect(() => {
    if (currentStep !== 4 || jobs.length === 0) return;
    if (allDone) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      completeStep(4);
      return;
    }

    const poll = async () => {
      const updatedJobs = await Promise.all(
        jobs.map(async (job) => {
          if (job.state === 'done' || job.state === 'failed') return job;
          try {
            return await RenderFlowApi.getJobStatus(job.id);
          } catch {
            return job; // Return existing on error - no inference
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

  // Reset pipeline and clear session
  const handleReset = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setSourceUrls([]);
    setVariations(1);
    setJobs([]);
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
        return (
          <InputStep 
            onContinue={handleInputComplete} 
            initialUrls={sourceUrls}
          />
        );
      case 2:
        return (
          <ConfigureStep
            sourceUrls={sourceUrls}
            initialVariations={variations}
            onContinue={handleConfigureComplete}
            onBack={() => setCurrentStep(1)}
          />
        );
      case 3:
        return (
          <ReviewStep
            sourceUrls={sourceUrls}
            variations={variations}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onStartRendering={handleStartRendering}
            onBack={() => setCurrentStep(2)}
          />
        );
      case 4:
        return (
          <ExecuteStep
            jobs={jobs}
            isPolling={!allDone}
            onReset={handleReset}
            onViewResults={() => {
              completeStep(4);
              setCurrentStep(5);
            }}
          />
        );
      case 5:
        return (
          <ResultsStep
            jobs={jobs}
            onReset={handleReset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Step Sidebar - matches Creative Scale */}
      <RenderFlowStepSidebar
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
        onReset={handleReset}
      />

      {/* Main Content */}
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
