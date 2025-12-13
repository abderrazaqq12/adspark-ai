/**
 * Execution Explainer Component
 * PRD-aligned: Shows what the engine did (strategy action → FFmpeg operation mapping)
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Settings2, 
  ArrowRight, 
  FileJson, 
  Copy,
  CheckCircle2 
} from 'lucide-react';
import { useState } from 'react';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import type { VariationIdea } from '@/lib/creative-scale/types';
import { OPERATION_MAPPINGS } from '@/lib/creative-scale/prd-types';
import { toast } from 'sonner';

interface ExecutionExplainerProps {
  plan: ExecutionPlan;
  variation?: VariationIdea;
  engineUsed?: string;
}

export function ExecutionExplainer({ plan, variation, engineUsed = 'ffmpeg-browser' }: ExecutionExplainerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPlan = () => {
    navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
    setCopied(true);
    toast.success('Execution plan copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Map variation action to FFmpeg operation
  const getOperation = (actionType: string): string => {
    const mapping = OPERATION_MAPPINGS.find(m => 
      m.strategy_action.toLowerCase() === actionType.toLowerCase()
    );
    return mapping?.ffmpeg_operation || 'custom operation';
  };

  return (
    <div className="space-y-4">
      {/* Engine Used Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Engine Used</span>
        </div>
        <Badge variant="outline" className="capitalize">
          {engineUsed.replace('-', ' ')}
        </Badge>
      </div>

      {/* Operation Mapping Table */}
      {variation && (
        <div className="rounded-lg border overflow-hidden">
          <div className="px-4 py-2 bg-muted/50 border-b">
            <span className="text-sm font-medium">⚙️ What the engine did</span>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-1 p-2 rounded bg-muted/30 text-center">
                <span className="text-muted-foreground text-xs block mb-1">Strategy Action</span>
                <span className="font-medium capitalize">{variation.action.replace(/_/g, ' ')}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 p-2 rounded bg-muted/30 text-center">
                <span className="text-muted-foreground text-xs block mb-1">FFmpeg Operation</span>
                <code className="text-xs font-mono">{getOperation(variation.action.split('_')[0])}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Preview */}
      <div className="rounded-lg border overflow-hidden">
        <div className="px-4 py-2 bg-muted/50 border-b">
          <span className="text-sm font-medium">Timeline</span>
        </div>
        <div className="p-4">
          <div className="flex gap-1 h-8">
            {plan.timeline.map((seg, idx) => (
              <div
                key={seg.segment_id}
                className="flex-1 rounded bg-primary/20 flex items-center justify-center text-xs"
                style={{
                  flex: seg.output_duration_ms / plan.validation.total_duration_ms
                }}
                title={`${(seg.timeline_start_ms / 1000).toFixed(1)}s - ${(seg.timeline_end_ms / 1000).toFixed(1)}s`}
              >
                {idx + 1}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>0s</span>
            <span>{(plan.validation.total_duration_ms / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Execution Plan JSON Viewer */}
      <Accordion type="single" collapsible>
        <AccordionItem value="plan" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              <span className="text-sm font-medium">📄 Execution Plan (Read-Only)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleCopyPlan}
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <ScrollArea className="h-[200px]">
                <pre className="text-xs font-mono p-3 bg-muted/30 rounded overflow-x-auto">
                  {JSON.stringify(plan, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
