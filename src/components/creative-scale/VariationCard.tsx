/**
 * Variation Card Component
 * PRD-aligned: Shows framework, intent, expected lift, risk, duration, and "Why this variation?" tooltip
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  HelpCircle, 
  TrendingUp, 
  AlertTriangle,
  Target,
  Zap,
  Clock
} from 'lucide-react';
import type { VariationIdea } from '@/lib/creative-scale/types';

interface VariationCardProps {
  variation: VariationIdea;
  index: number;
  framework: string;
  expectedLiftPct?: number;
  aiReasoning?: string;
  onClick?: () => void;
  selected?: boolean;
  /** Original video duration in ms - used to estimate final duration */
  originalDurationMs?: number;
}

// Estimate duration change based on action type
function estimateDurationChange(action: string, originalMs: number): { estimatedMs: number; change: 'shorter' | 'longer' | 'same' } {
  const originalSec = originalMs / 1000;
  
  switch (action) {
    case 'remove_segment':
      // Removes ~20-30% of content
      return { estimatedMs: originalMs * 0.75, change: 'shorter' };
    case 'compress_segment':
      // Speeds up by ~15-25%
      return { estimatedMs: originalMs * 0.8, change: 'shorter' };
    case 'duplicate_segment':
      // Adds ~20-30% more content
      return { estimatedMs: originalMs * 1.25, change: 'longer' };
    case 'emphasize_segment':
      // Slows down, adds ~10-20%
      return { estimatedMs: originalMs * 1.15, change: 'longer' };
    case 'reorder_segments':
    case 'split_segment':
    case 'merge_segments':
    default:
      // Neutral actions
      return { estimatedMs: originalMs, change: 'same' };
  }
}

// Clamp duration to valid range (15-35 seconds)
function clampDuration(ms: number): number {
  const MIN_MS = 15000;
  const MAX_MS = 35000;
  return Math.max(MIN_MS, Math.min(MAX_MS, ms));
}

export function VariationCard({
  variation,
  index,
  framework,
  expectedLiftPct = 15,
  aiReasoning,
  onClick,
  selected,
  originalDurationMs = 20000 // Default to 20s if not provided
}: VariationCardProps) {
  const riskColors = {
    low: 'bg-green-500/10 text-green-600 border-green-500/20',
    medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    high: 'bg-red-500/10 text-red-600 border-red-500/20'
  };

  const priorityToRisk = (priority: string): 'low' | 'medium' | 'high' => {
    if (priority === 'high') return 'low';
    if (priority === 'medium') return 'medium';
    return 'high';
  };

  const risk = priorityToRisk(variation.priority);

  // Calculate estimated duration
  const { estimatedMs, change } = estimateDurationChange(variation.action, originalDurationMs);
  const finalMs = clampDuration(estimatedMs);
  const finalSec = Math.round(finalMs / 1000);

  const durationColors = {
    shorter: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    longer: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    same: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  };

  return (
    <div 
      className={`p-4 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 ${
        selected ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Variation {index + 1}</span>
          <Badge variant="outline" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            {framework}
          </Badge>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm font-medium mb-1">🧠 Why this variation?</p>
              <p className="text-xs text-muted-foreground">
                {aiReasoning || variation.reasoning || 'AI analysis suggests this optimization will improve engagement.'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Intent */}
      <p className="text-sm mb-3">{variation.intent}</p>

      {/* Action */}
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <Zap className="w-3 h-3" />
        <span className="capitalize">{variation.action.replace(/_/g, ' ')}</span>
        <span>→</span>
        <span className="capitalize">{variation.target_segment_type}</span>
      </div>

      {/* Footer: Expected Lift, Duration & Risk */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Expected Lift */}
        <div className="flex items-center gap-1 text-sm">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="font-medium text-green-600">+{expectedLiftPct}%</span>
          <span className="text-xs text-muted-foreground">expected lift</span>
        </div>
        
        {/* Duration Badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={`text-xs gap-1 ${durationColors[change]}`}>
                <Clock className="w-3 h-3" />
                ~{finalSec}s
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Estimated final duration: {finalSec} seconds</p>
              {change === 'shorter' && <p className="text-blue-400">This action will shorten the video</p>}
              {change === 'longer' && <p className="text-purple-400">This action will extend the video</p>}
              {change === 'same' && <p className="text-muted-foreground">Duration remains similar</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Risk Badge */}
        <Badge className={`text-xs ${riskColors[risk]}`}>
          {risk === 'low' && '✓ Low Risk'}
          {risk === 'medium' && '⚠ Medium'}
          {risk === 'high' && (
            <>
              <AlertTriangle className="w-3 h-3 mr-1" />
              High Risk
            </>
          )}
        </Badge>
      </div>
    </div>
  );
}
