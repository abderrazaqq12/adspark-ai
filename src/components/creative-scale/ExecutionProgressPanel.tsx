/**
 * Execution Progress Panel
 * Shows real-time engine ladder progress during video rendering
 * SERVER-ONLY - No browser engines
 */

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState, useRef } from 'react';
import {
  Cloud,
  Server,
  FileCode,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  MonitorPlay
} from 'lucide-react';
import type { EngineId } from '@/lib/creative-scale/execution-engine';
import { MultiExecutionConsole } from './ExecutionConsole';

export interface EngineProgress {
  engine: EngineId;
  status: 'pending' | 'attempting' | 'success' | 'failed' | 'skipped';
  progress: number;
  message: string;
  error?: string;
  duration_ms?: number;
  jobId?: string; // Capture jobId for logs
  etaSec?: number; // ETA in seconds
}

export interface ExecutionProgressState {
  variationIndex: number;
  totalVariations: number;
  currentEngine: EngineId | null;
  engines: EngineProgress[];
  overallProgress: number;
  status: 'idle' | 'executing' | 'complete' | 'partial' | 'stopped';
}

// Engine configuration (Server-only)
const ENGINE_CONFIG: Record<EngineId, {
  label: string;
  icon: typeof Cloud;
  color: string;
  description: string;
}> = {
  'unified_server': {
    label: 'Unified Engine',
    icon: Server,
    color: 'text-blue-500',
    description: 'High-fidelity FFmpeg VPS Rendering'
  }
};

interface ExecutionProgressPanelProps {
  state: ExecutionProgressState;
}

export function ExecutionProgressPanel({ state }: ExecutionProgressPanelProps) {
  if (state.status === 'idle') return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {state.status === 'executing' && (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
            {state.status === 'complete' && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
            {state.status === 'partial' && (
              <XCircle className="w-4 h-4 text-amber-500" />
            )}
            {state.status === 'stopped' && (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            Rendering Variation {state.variationIndex + 1} of {state.totalVariations}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {Math.round(state.overallProgress)}%
          </Badge>
        </div>
        <Progress value={state.overallProgress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {state.engines.map((engine, idx) => {
            const config = ENGINE_CONFIG[engine.engine];
            if (!config) return null;

            const Icon = config.icon;
            const isActive = state.currentEngine === engine.engine;

            return (
              <div key={engine.engine}>
                <div className={`flex items-center gap-3 p-2 rounded-lg transition-all ${isActive ? 'bg-primary/10 border border-primary/30' :
                  engine.status === 'success' ? 'bg-green-500/10' :
                    engine.status === 'failed' ? 'bg-destructive/10' :
                      'bg-muted/30'
                  }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${engine.status === 'attempting' ? 'bg-primary/20' :
                    engine.status === 'success' ? 'bg-green-500/20' :
                      engine.status === 'failed' ? 'bg-destructive/20' :
                        'bg-muted'
                    }`}>
                    {engine.status === 'attempting' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : engine.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : engine.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : engine.status === 'skipped' ? (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isActive ? 'text-primary' :
                        engine.status === 'pending' ? 'text-muted-foreground' : ''
                        }`}>
                        {config.label}
                      </span>
                      {engine.status === 'attempting' && (
                        <span className="text-secondary-foreground font-mono text-xs">
                          {Math.round(engine.progress)}%
                          {engine.etaSec !== undefined && engine.etaSec !== null && engine.progress < 100 && (
                            <span className="ml-2 text-muted-foreground">
                              (~{engine.etaSec.toFixed(1)}s left)
                            </span>
                          )}
                        </span>
                      )}
                      {engine.duration_ms && (
                        <span className="text-xs text-muted-foreground">
                          ({(engine.duration_ms / 1000).toFixed(1)}s)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {engine.message || config.description}
                    </p>
                    {engine.error && (
                      <p className="text-xs text-destructive truncate mt-0.5">
                        {engine.error}
                      </p>
                    )}
                  </div>

                  {engine.status === 'attempting' && engine.progress > 0 && (
                    <div className="w-16">
                      <Progress value={engine.progress} className="h-1.5" />
                    </div>
                  )}

                  <Badge
                    variant={
                      engine.status === 'success' ? 'default' :
                        engine.status === 'failed' ? 'destructive' :
                          engine.status === 'attempting' ? 'secondary' :
                            'outline'
                    }
                    className="text-xs shrink-0"
                  >
                    {engine.status === 'attempting' ? 'Trying...' :
                      engine.status === 'success' ? 'Done' :
                        engine.status === 'failed' ? 'Failed' :
                          engine.status === 'skipped' ? 'Skipped' :
                            'Waiting'}
                  </Badge>
                </div>

                {idx < state.engines.length - 1 && engine.status === 'failed' && (
                  <div className="flex justify-center py-1">
                    <ArrowRight className="w-4 h-4 text-muted-foreground transform rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Execution Console */}
        {state.engines.map(engine => {
          if (engine.engine === 'unified_server' && engine.jobId) {
            return (
              <MultiExecutionConsole
                key={engine.jobId}
                jobs={[{ jobId: engine.jobId, variationIndex: state.variationIndex }]}
              />
            );
          }
          return null;
        })}

      </CardContent>
    </Card >
  );
}

// Helper to create initial state (Server-only engines)
export function createInitialProgressState(totalVariations: number): ExecutionProgressState {
  return {
    variationIndex: 0,
    totalVariations,
    currentEngine: null,
    engines: [
      { engine: 'unified_server', status: 'pending', progress: 0, message: '' },
    ],
    overallProgress: 0,
    status: 'idle'
  };
}
