/**
 * Brain V2 Strategy Display - Deterministic Engine Output
 * 
 * UI CONTRACT:
 * - NEVER shows errors
 * - Shows soft "Fallback Strategy Applied" label when fallback used
 * - User can always proceed
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Brain, 
  Zap, 
  Target, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import type { 
  BrainV2StrategyObject,
  FRAMEWORK_DISPLAY_INFO,
  HOOK_DISPLAY_INFO
} from '@/lib/creative-scale/brain-v2-deterministic';

interface BrainV2StrategyDisplayProps {
  strategy: BrainV2StrategyObject;
  showDetails?: boolean;
}

const FRAMEWORK_DISPLAY: Record<string, { name: string; description: string; color: string }> = {
  AIDA: { 
    name: 'AIDA', 
    description: 'Attention → Interest → Desire → Action',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  PAS: { 
    name: 'PAS', 
    description: 'Problem → Agitate → Solution',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  },
  SOCIAL_PROOF: { 
    name: 'Social Proof', 
    description: 'Leverage testimonials and social validation',
    color: 'bg-green-500/20 text-green-400 border-green-500/30'
  },
  PROBLEM_SOLUTION: { 
    name: 'Problem → Solution', 
    description: 'Direct problem identification and resolution',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
  STORY_DRIVEN: { 
    name: 'Story-driven', 
    description: 'Narrative arc with emotional journey',
    color: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  },
  UGC_REVIEW: { 
    name: 'UGC Review', 
    description: 'Authentic user-generated content style',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  }
};

const HOOK_DISPLAY: Record<string, string> = {
  question: 'Question Hook',
  statistic: 'Statistic Hook',
  bold_claim: 'Bold Claim',
  pain_point: 'Pain Point',
  curiosity: 'Curiosity',
  social_proof: 'Social Proof',
  controversy: 'Controversy'
};

const PACING_DISPLAY: Record<string, { label: string; color: string }> = {
  fast: { label: 'Fast', color: 'text-red-400' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  slow: { label: 'Slow', color: 'text-green-400' }
};

const CONFIDENCE_DISPLAY: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  high: { 
    label: 'High Confidence', 
    icon: <CheckCircle2 className="w-3 h-3" />,
    color: 'bg-green-500/20 text-green-400 border-green-500/30'
  },
  medium: { 
    label: 'Medium Confidence', 
    icon: <Sparkles className="w-3 h-3" />,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  },
  fallback: { 
    label: 'Fallback Strategy Applied', 
    icon: <AlertCircle className="w-3 h-3" />,
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
};

export function BrainV2StrategyDisplay({ strategy, showDetails = true }: BrainV2StrategyDisplayProps) {
  const frameworkInfo = FRAMEWORK_DISPLAY[strategy.framework] || {
    name: strategy.framework,
    description: 'Marketing framework',
    color: 'bg-primary/20 text-primary border-primary/30'
  };
  
  const hookLabel = HOOK_DISPLAY[strategy.hook_type] || strategy.hook_type;
  const pacingInfo = PACING_DISPLAY[strategy.pacing] || { label: strategy.pacing, color: 'text-muted-foreground' };
  const confidenceInfo = CONFIDENCE_DISPLAY[strategy.confidence_level];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Strategy Decision</h3>
              <p className="text-xs text-muted-foreground">Brain V2 Deterministic Engine</p>
            </div>
          </div>
          
          {/* Confidence Badge - Soft label for fallback */}
          <Badge variant="outline" className={confidenceInfo.color}>
            {confidenceInfo.icon}
            <span className="ml-1 text-xs">{confidenceInfo.label}</span>
          </Badge>
        </div>
        
        {/* Strategy Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Framework */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              Framework
            </div>
            <Badge variant="outline" className={frameworkInfo.color}>
              {frameworkInfo.name}
            </Badge>
          </div>
          
          {/* Hook Type */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              Hook Type
            </div>
            <Badge variant="secondary" className="text-xs">
              {hookLabel}
            </Badge>
          </div>
          
          {/* Pacing */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Pacing
            </div>
            <span className={`text-sm font-medium ${pacingInfo.color}`}>
              {pacingInfo.label}
            </span>
          </div>
          
          {/* Platform */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              Platform
            </div>
            <span className="text-sm font-medium capitalize">
              {strategy.platform}
            </span>
          </div>
        </div>
        
        {/* Framework Description */}
        <div className="bg-muted/30 rounded-lg p-3 mb-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{frameworkInfo.name}:</span>{' '}
            {frameworkInfo.description}
          </p>
        </div>
        
        {/* Decision Reason - Only if showDetails */}
        {showDetails && strategy.decision_reason && (
          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            <span className="font-medium">Decision Reason:</span> {strategy.decision_reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for lists
export function BrainV2StrategyBadge({ strategy }: { strategy: BrainV2StrategyObject }) {
  const frameworkInfo = FRAMEWORK_DISPLAY[strategy.framework];
  const isFallback = strategy.confidence_level === 'fallback';
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={frameworkInfo?.color || 'bg-primary/20 text-primary'}>
        {frameworkInfo?.name || strategy.framework}
      </Badge>
      {isFallback && (
        <Badge variant="outline" className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[10px]">
          Fallback
        </Badge>
      )}
    </div>
  );
}
