/**
 * Step 4: Execute
 * Video rendering with capability-based engine routing
 * WITH Deep Debug Panel
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  ArrowRight,
  Zap,
  Download,
  Server,
  ShieldAlert,
  Square
} from 'lucide-react';
import { ExecutionProgressPanel, ExecutionProgressState } from '@/components/creative-scale/ExecutionProgressPanel';
import { ExecutionExplainer } from '@/components/creative-scale/ExecutionExplainer';
import { RenderDebugPanel } from '@/components/creative-scale/RenderDebugPanel';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import type { CreativeBlueprint } from '@/lib/creative-scale/types';
import type { ComplianceResult } from '@/lib/creative-scale/compliance-types';

interface ExecuteStepProps {
  plans: ExecutionPlan[];
  blueprint: CreativeBlueprint | null;
  executionProgress: ExecutionProgressState;
  isExecuting: boolean;
  ffmpegReady: boolean;
  complianceResult?: ComplianceResult | null;
  onExecute: () => void;
  onStop: () => void;
  onDownloadPlans: () => void;
  onContinue: () => void;
}

export function ExecuteStep({
  plans,
  blueprint,
  executionProgress,
  isExecuting,
  ffmpegReady,
  complianceResult,
  onExecute,
  onStop,
  onDownloadPlans,
  onContinue
}: ExecuteStepProps) {
  const isComplete = executionProgress.status === 'complete' || executionProgress.status === 'partial';

  // Check if rendering is blocked due to critical compliance violations
  const isRenderingBlocked = complianceResult?.overallRisk === 'blocked' ||
    (complianceResult?.overallRisk === 'high_risk' && !complianceResult?.canRender);

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
              <Server className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold">Unified FFmpeg Engine</span>
            </div>
            < Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
              VPS Hosted
            </Badge>
          </div>
          <Badge variant="outline" className="text-xs">
            High Fidelity
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          All variations are rendered on the dedicated VPS using the unified FFmpeg engine for maximum quality and consistency.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1">
        {!isExecuting && executionProgress.status === 'idle' && (
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
            <div className="space-y-6">


              {/* Compliance Blocking Alert */}
              {isRenderingBlocked && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <ShieldAlert className="w-4 h-4" />
                  <AlertDescription className="ml-2">
                    <span className="font-medium">Rendering Blocked:</span> Critical policy violations must be resolved before execution.
                    {complianceResult?.violations && complianceResult.violations.length > 0 && (
                      <span className="block text-xs mt-1 text-muted-foreground">
                        {complianceResult.violations.filter(v => v.severity === 'high_risk' || v.severity === 'blocked').length} critical violation(s) detected.
                        Return to Strategy step to review and resolve.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Ready to Render CTA */}
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isRenderingBlocked ? 'bg-destructive/10' : 'bg-primary/10'
                  }`}>
                  {isRenderingBlocked ? (
                    <ShieldAlert className="w-8 h-8 text-destructive" />
                  ) : (
                    <Zap className="w-8 h-8 text-primary" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {isRenderingBlocked ? 'Rendering Blocked' : 'Ready to Render'}
                </h3>
                <p className="text-muted-foreground max-w-md mb-6 text-sm">
                  {isRenderingBlocked
                    ? 'Critical compliance violations prevent rendering. Review and resolve issues in the Strategy step.'
                    : 'The Unified Engine will execute the plan with pixel-perfect accuracy on the VPS.'
                  }
                </p>

                <div className="flex gap-3">
                  <Button
                    size="lg"
                    onClick={isExecuting ? onStop : onExecute}
                    className={`h-12 px-8 ${isExecuting ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                    disabled={isRenderingBlocked}
                  >
                    {isExecuting ? (
                      <>
                        <Square className="w-5 h-5 mr-2 fill-current" />
                        Stop Generation
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Generate {plans.length} Video{plans.length !== 1 ? 's' : ''}
                      </>
                    )}
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

              {/* Debug Panel */}
              <RenderDebugPanel />

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
