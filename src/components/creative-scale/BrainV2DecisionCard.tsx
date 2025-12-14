/**
 * Brain V2 Decision Card
 * Visualizes framework choice, Hormozi evaluation, and optimization plan
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  Target, 
  Zap, 
  TrendingUp,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  Scale
} from 'lucide-react';
import { useState } from 'react';
import type { BrainV2Decision, FrameworkType, StyleOverlay, OptimizationFocus } from '@/lib/creative-scale/brain-v2-types';

interface BrainV2DecisionCardProps {
  decision: BrainV2Decision;
}

const frameworkLabels: Record<FrameworkType, { name: string; description: string }> = {
  'AIDA': { name: 'AIDA', description: 'Attention → Interest → Desire → Action' },
  'PAS': { name: 'PAS', description: 'Problem → Agitate → Solution' },
  'BAB': { name: 'BAB', description: 'Before → After → Bridge' },
  '4Ps': { name: '4Ps', description: 'Promise → Picture → Proof → Push' },
  'HOOK_BENEFIT_CTA': { name: 'Hook→Benefit→CTA', description: 'Simple direct flow' },
};

const styleOverlayLabels: Record<NonNullable<StyleOverlay>, { name: string; description: string }> = {
  'UGC': { name: 'UGC Style', description: 'Authentic, casual, relatable content' },
  'ACC': { name: 'ACC Style', description: 'Authority, credibility, charisma' },
};

const focusIcons: Record<OptimizationFocus, string> = {
  'hook': '🎣',
  'proof': '✅',
  'pacing': '⚡',
  'objection': '🛡️',
  'cta': '🎯',
};

export function BrainV2DecisionCard({ decision }: BrainV2DecisionCardProps) {
  const [showRejected, setShowRejected] = useState(false);
  const { framework_decision, explanation, optimization_plan, hormozi_evaluation } = decision;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Brain v2 Decision
          </CardTitle>
          <Badge 
            variant="outline" 
            className="text-xs font-mono"
          >
            {new Date(decision.decision_timestamp).toLocaleTimeString()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Framework Decision Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Target className="w-4 h-4" />
            Framework Decision
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="text-base px-3 py-1 bg-primary text-primary-foreground">
              {frameworkLabels[framework_decision.primary_framework].name}
            </Badge>
            
            {framework_decision.style_overlay && (
              <Badge variant="secondary" className="text-sm px-2 py-1">
                + {styleOverlayLabels[framework_decision.style_overlay].name}
              </Badge>
            )}
            
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <span className="font-bold text-primary">
                {Math.round(framework_decision.confidence * 100)}%
              </span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {frameworkLabels[framework_decision.primary_framework].description}
          </p>
        </div>

        <Separator />

        {/* Why Chosen */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Why This Framework
          </div>
          <ul className="space-y-1">
            {explanation.why_chosen.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <Sparkles className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Why Others Rejected (Collapsible) */}
        <Collapsible open={showRejected} onOpenChange={setShowRejected}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
            <XCircle className="w-4 h-4 text-red-400" />
            <span>Why others rejected ({explanation.why_others_rejected.length})</span>
            {showRejected ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-2 pl-6">
              {explanation.why_others_rejected.map((rejection, idx) => (
                <div key={idx} className="text-xs p-2 bg-muted/50 rounded">
                  <span className="font-medium">{rejection.framework}:</span>{' '}
                  <span className="text-muted-foreground">{rejection.reason}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Hormozi Value Equation */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Scale className="w-4 h-4" />
            Hormozi Value Evaluation
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <HormoziMetric 
              label="Dream Outcome" 
              value={hormozi_evaluation.dream_outcome} 
              description="How clear is the ideal result?"
              positive
            />
            <HormoziMetric 
              label="Perceived Likelihood" 
              value={hormozi_evaluation.perceived_likelihood} 
              description="How achievable does it seem?"
              positive
            />
            <HormoziMetric 
              label="Time Delay" 
              value={hormozi_evaluation.time_delay} 
              description="Speed to results (lower is better)"
              positive={false}
            />
            <HormoziMetric 
              label="Effort & Sacrifice" 
              value={hormozi_evaluation.effort_sacrifice} 
              description="Perceived effort (lower is better)"
              positive={false}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
            <span className="text-sm font-medium">Total Value Score</span>
            <span className="text-2xl font-bold text-primary">
              {hormozi_evaluation.total_value_score.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Formula: (Dream × Likelihood) / (Time × Effort)
          </p>
        </div>

        <Separator />

        {/* Optimization Plan */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Zap className="w-4 h-4 text-amber-500" />
              Optimization Plan
            </div>
            <Badge 
              variant={
                optimization_plan.expected_lift === 'high' ? 'default' :
                optimization_plan.expected_lift === 'medium' ? 'secondary' :
                'outline'
              }
              className="capitalize"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              {optimization_plan.expected_lift} lift
            </Badge>
          </div>
          
          {/* Focus Areas */}
          <div className="flex flex-wrap gap-2">
            {optimization_plan.focus.map((focus) => (
              <Badge key={focus} variant="outline" className="text-xs">
                {focusIcons[focus]} {focus}
              </Badge>
            ))}
          </div>
          
          {/* Specific Changes */}
          <div className="space-y-1">
            {optimization_plan.specific_changes.map((change, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded">
                <span className="text-primary font-medium">{idx + 1}.</span>
                <span>{change}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface HormoziMetricProps {
  label: string;
  value: number;
  description: string;
  positive: boolean;
}

function HormoziMetric({ label, value, description, positive }: HormoziMetricProps) {
  const displayValue = Math.round(value * 100);
  const progressColor = positive 
    ? (value > 0.7 ? 'bg-green-500' : value > 0.4 ? 'bg-amber-500' : 'bg-red-500')
    : (value < 0.3 ? 'bg-green-500' : value < 0.6 ? 'bg-amber-500' : 'bg-red-500');

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{displayValue}%</span>
      </div>
      <Progress 
        value={displayValue} 
        className={`h-1.5 [&>div]:${progressColor}`}
      />
      <p className="text-[10px] text-muted-foreground/70">{description}</p>
    </div>
  );
}
