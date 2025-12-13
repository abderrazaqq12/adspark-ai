/**
 * Execution Progress Panel
 * Shows real-time engine ladder progress during video rendering
 * Updated for capability-based routing
 */

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Cpu, 
  Cloud, 
  Server, 
  FileCode, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ArrowRight,
  Monitor
} from 'lucide-react';
import type { EngineId } from '@/lib/creative-scale/execution-engine';

export interface EngineProgress {
  engine: EngineId;
  status: 'pending' | 'attempting' | 'success' | 'failed' | 'skipped';
  progress: number;
  message: string;
  error?: string;
  duration_ms?: number;
}

export interface ExecutionProgressState {
  variationIndex: number;
  totalVariations: number;
  currentEngine: EngineId | null;
  engines: EngineProgress[];
  overallProgress: number;
  status: 'idle' | 'executing' | 'complete' | 'partial';
}

// Engine configuration - updated for capability-based routing
const ENGINE_CONFIG: Record<EngineId, { 
  label: string; 
  icon: typeof Cpu; 
  color: string;
  description: string;
}> = {
  'webcodecs': {
    label: 'WebCodecs',
    icon: Monitor,
    color: 'text-emerald-500',
    description: 'Browser-native video processing'
  },
  'cloudinary': {
    label: 'Cloudinary',
    icon: Cloud,
    color: 'text-purple-500',
    description: 'Cloud video transformation API'
  },
  'server_ffmpeg': {
    label: 'Server FFmpeg',
    icon: Server,
    color: 'text-blue-500',
    description: 'Advanced server-side rendering'
  },
  'plan_export': {
    label: 'Plan Export',
    icon: FileCode,
    color: 'text-amber-500',
    description: 'Downloadable execution plan'
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
            Rendering Variation {state.variationIndex + 1} of {state.totalVariations}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {Math.round(state.overallProgress)}%
          </Badge>
        </div>
        <Progress value={state.overallProgress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="pt-0">
        {/* Engine Ladder */}
        <div className="space-y-2">
          {state.engines.map((engine, idx) => {
            const config = ENGINE_CONFIG[engine.engine];
            if (!config) return null;
            
            const Icon = config.icon;
            const isActive = state.currentEngine === engine.engine;
            
            return (
              <div key={engine.engine}>
                <div className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                  isActive ? 'bg-primary/10 border border-primary/30' : 
                  engine.status === 'success' ? 'bg-green-500/10' :
                  engine.status === 'failed' ? 'bg-destructive/10' :
                  'bg-muted/30'
                }`}>
                  {/* Status Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    engine.status === 'attempting' ? 'bg-primary/20' :
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

                  {/* Engine Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isActive ? 'text-primary' : 
                        engine.status === 'pending' ? 'text-muted-foreground' : ''
                      }`}>
                        {config.label}
                      </span>
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

                  {/* Progress for active engine */}
                  {engine.status === 'attempting' && engine.progress > 0 && (
                    <div className="w-16">
                      <Progress value={engine.progress} className="h-1.5" />
                    </div>
                  )}

                  {/* Status Badge */}
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

                {/* Arrow to next engine (if not last) */}
                {idx < state.engines.length - 1 && engine.status === 'failed' && (
                  <div className="flex justify-center py-1">
                    <ArrowRight className="w-4 h-4 text-muted-foreground transform rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to create initial state - updated for new engine order
export function createInitialProgressState(totalVariations: number): ExecutionProgressState {
  return {
    variationIndex: 0,
    totalVariations,
    currentEngine: null,
    engines: [
      { engine: 'webcodecs', status: 'pending', progress: 0, message: '' },
      { engine: 'cloudinary', status: 'pending', progress: 0, message: '' },
      { engine: 'server_ffmpeg', status: 'pending', progress: 0, message: '' },
      { engine: 'plan_export', status: 'pending', progress: 0, message: '' },
    ],
    overallProgress: 0,
    status: 'idle'
  };
}
