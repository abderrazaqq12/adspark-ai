/**
 * Step 5: Results
 * Download outputs and review generated videos
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { ResultsGrid } from '@/components/creative-scale/ResultsGrid';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import type { ExecutionResult } from '@/lib/creative-scale/execution-engine';

interface ResultsStepProps {
  plans: ExecutionPlan[];
  results: Map<string, ExecutionResult>;
  onDownloadPlan: (plan: ExecutionPlan) => void;
  onDownloadAll: () => void;
  onReset: () => void;
}

export function ResultsStep({ 
  plans,
  results,
  onDownloadPlan,
  onDownloadAll,
  onReset
}: ResultsStepProps) {
  const successCount = Array.from(results.values()).filter(r => r.status === 'success').length;
  const partialCount = Array.from(results.values()).filter(r => r.status === 'partial_success').length;
  const failCount = Array.from(results.values()).filter(r => r.status === 'failed').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Results</h2>
        <p className="text-muted-foreground mt-1">
          Review and download your generated video variations.
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="font-medium">{successCount} Completed</span>
        </div>
        {partialCount > 0 && (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <span className="font-medium">{partialCount} Partial</span>
          </div>
        )}
        {failCount > 0 && (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="font-medium">{failCount} Failed</span>
          </div>
        )}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={onDownloadAll}>
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="flex-1">
        <ScrollArea className="h-[calc(100vh-350px)] min-h-[300px]">
          <ResultsGrid
            items={plans.map((plan, idx) => ({
              variationIndex: idx,
              plan,
              result: results.get(plan.plan_id) as any,
              engineUsed: results.get(plan.plan_id)?.engine_used || 'none',
              errorReason: results.get(plan.plan_id)?.error_message,
              fallbackUsed: (results.get(plan.plan_id)?.fallbackChain?.length || 0) > 1
            }))}
            onDownloadPlan={(item) => onDownloadPlan(item.plan)}
            onDownloadVideo={(item) => {
              const result = results.get(item.plan.plan_id);
              if (result?.output_video_url) {
                window.open(result.output_video_url, '_blank');
              }
            }}
          />
        </ScrollArea>
      </div>

      {/* Actions */}
      <div className="pt-6 border-t border-border mt-auto">
        <Button 
          variant="outline"
          className="w-full h-12 text-base"
          onClick={onReset}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Start New Project
        </Button>
      </div>
    </div>
  );
}
