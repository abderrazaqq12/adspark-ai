/**
 * Step 4: Execute
 * Video rendering with capability-based engine routing
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  ArrowRight,
  Zap,
  Cloud,
  Download,
  Monitor,
  Server
} from 'lucide-react';
import { ExecutionProgressPanel, ExecutionProgressState } from '@/components/creative-scale/ExecutionProgressPanel';
import { ExecutionExplainer } from '@/components/creative-scale/ExecutionExplainer';
import { CapabilityIndicators } from '@/components/creative-scale/CapabilityIndicators';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import type { CreativeBlueprint } from '@/lib/creative-scale/types';

interface ExecuteStepProps {
  plans: ExecutionPlan[];
  blueprint: CreativeBlueprint | null;
  executionProgress: ExecutionProgressState;
  isExecuting: boolean;
  ffmpegReady: boolean;
  onExecute: () => void;
  onDownloadPlans: () => void;
  onContinue: () => void;
}

export function ExecuteStep({ 
  plans,
  blueprint,
  executionProgress,
  isExecuting,
  ffmpegReady,
  onExecute,
  onDownloadPlans,
  onContinue
}: ExecuteStepProps) {
  const isComplete = executionProgress.status === 'complete' || executionProgress.status === 'partial';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Execute Rendering</h2>
        <p className="text-muted-foreground mt-1">
          Generate {plans.length} video variation{plans.length !== 1 ? 's' : ''} using capability-based engine routing.
        </p>
      </div>

      {/* Engine Status */}
      <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-500" />
              <span className="text-xs">WebCodecs</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-purple-500" />
              <span className="text-xs">Cloudinary</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-500" />
              <span className="text-xs">Server FFmpeg</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Capability-based routing
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Each variation routes to the simplest engine that satisfies its requirements.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1">
        {!isExecuting && executionProgress.status === 'idle' && (
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
            <div className="space-y-6">
              {/* Capability Indicators */}
              {plans.length > 0 && (
                <CapabilityIndicators plans={plans} />
              )}

              {/* Ready to Render CTA */}
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to Render</h3>
                <p className="text-muted-foreground max-w-md mb-6 text-sm">
                  Each variation will be routed to the most appropriate engine based on its required capabilities.
                </p>
                
                <div className="flex gap-3">
                  <Button 
                    size="lg"
                    onClick={onExecute}
                    className="h-12 px-8"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Generate {plans.length} Video{plans.length !== 1 ? 's' : ''}
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={onDownloadPlans}
                    className="h-12"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Plans
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {(isExecuting || executionProgress.status !== 'idle') && (
          <ScrollArea className="h-[calc(100vh-400px)] min-h-[250px]">
            <div className="space-y-6">
              {/* Progress Panel */}
              <ExecutionProgressPanel state={executionProgress} />

              {/* Plan Preview */}
              {plans[executionProgress.variationIndex] && blueprint && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Current Variation</h4>
                  <ExecutionExplainer 
                    plan={plans[executionProgress.variationIndex]}
                    variation={blueprint.variation_ideas[executionProgress.variationIndex]}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Continue CTA */}
      {isComplete && (
        <div className="pt-6 border-t border-border mt-auto">
          <Button 
            className="w-full h-12 text-base"
            onClick={onContinue}
          >
            View Results
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
