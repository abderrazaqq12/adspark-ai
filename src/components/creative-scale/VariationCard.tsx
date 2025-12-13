/**
 * Variation Card Component
 * PRD-aligned: Shows framework, intent, expected lift, risk, and "Why this variation?" tooltip
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
  Zap
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
}

export function VariationCard({
  variation,
  index,
  framework,
  expectedLiftPct = 15,
  aiReasoning,
  onClick,
  selected
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

      {/* Footer: Expected Lift & Risk */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-sm">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="font-medium text-green-600">+{expectedLiftPct}%</span>
          <span className="text-xs text-muted-foreground">expected lift</span>
        </div>
        
        <Badge className={`text-xs ${riskColors[risk]}`}>
          {risk === 'low' && '✓ Low Risk'}
          {risk === 'medium' && '⚠ Medium Risk'}
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
