/**
 * Framework Explainer Card
 * Shows detailed reasoning for why Brain V2 selected a specific framework
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Target,
  TrendingUp,
  Users,
  Zap,
  Clock,
  Scale,
  ChevronRight
} from 'lucide-react';
import { FRAMEWORK_DEFINITIONS, type ExtendedFrameworkType } from '@/lib/creative-scale/marketing-frameworks';
import type { FrameworkType } from '@/lib/creative-scale/brain-v2-types';

interface FrameworkExplainerCardProps {
  selectedFramework: FrameworkType | ExtendedFrameworkType;
  reasoning: string[];
  rejectedFrameworks?: Array<{ framework: string; reason: string }>;
  confidence: number;
  goal: 'retention' | 'ctr' | 'conversions' | 'cpa';
  detectedProblems?: string[];
}

export function FrameworkExplainerCard({
  selectedFramework,
  reasoning,
  rejectedFrameworks = [],
  confidence,
  goal,
  detectedProblems = []
}: FrameworkExplainerCardProps) {
  const framework = FRAMEWORK_DEFINITIONS[selectedFramework as ExtendedFrameworkType];
  
  if (!framework) {
    return null;
  }

  const goalLabels = {
    retention: 'Maximize Watch Time',
    ctr: 'Maximize Click-Through Rate',
    conversions: 'Maximize Conversions',
    cpa: 'Minimize Cost Per Action'
  };

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-background to-amber-500/5">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              Why "{framework.shortName}" Was Chosen
              <Badge variant="outline" className="text-[10px] font-mono">
                {Math.round(confidence * 100)}% confidence
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Brain V2 analyzed your video and selected this framework based on multiple factors
            </p>
          </div>
        </div>

        {/* Selected Framework Overview */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <Badge className="text-sm">{framework.shortName}</Badge>
              <span className="text-xs text-muted-foreground ml-2">{framework.name}</span>
            </div>
          </div>
          
          {/* Framework Flow */}
          <div className="flex items-center gap-1 flex-wrap mt-2">
            {framework.segmentOrder.map((segment, idx) => (
              <div key={segment} className="flex items-center">
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary capitalize">
                  {segment.replace('_', ' ')}
                </span>
                {idx < framework.segmentOrder.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Decision Factors */}
        <div className="space-y-3 mb-4">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Target className="w-3 h-3" />
            Decision Factors
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {/* Goal Alignment */}
            <div className="p-2 rounded bg-muted/50 border border-border">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <TrendingUp className="w-3 h-3" />
                Goal Match
              </div>
              <div className="text-xs font-medium">{goalLabels[goal]}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {framework.hookAggressiveness === 'high' && goal === 'ctr' && '✓ Aggressive hook drives clicks'}
                {framework.idealPacing !== 'fast' && goal === 'retention' && '✓ Measured pacing builds engagement'}
                {framework.ctaPlacement === 'end' && goal === 'conversions' && '✓ End CTA maximizes intent'}
                {!((framework.hookAggressiveness === 'high' && goal === 'ctr') || 
                   (framework.idealPacing !== 'fast' && goal === 'retention') ||
                   (framework.ctaPlacement === 'end' && goal === 'conversions')) && 
                  '✓ Well-suited for this goal'}
              </div>
            </div>

            {/* Characteristics */}
            <div className="p-2 rounded bg-muted/50 border border-border">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <Zap className="w-3 h-3" />
                Characteristics
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px]">
                  <span className="text-muted-foreground">Hook:</span>{' '}
                  <span className="capitalize font-medium">{framework.hookAggressiveness}</span>
                </div>
                <div className="text-[10px]">
                  <span className="text-muted-foreground">Pacing:</span>{' '}
                  <span className="capitalize font-medium">{framework.idealPacing}</span>
                </div>
                <div className="text-[10px]">
                  <span className="text-muted-foreground">CTA:</span>{' '}
                  <span className="capitalize font-medium">{framework.ctaPlacement}</span>
                </div>
              </div>
            </div>

            {/* Audience Fit */}
            <div className="p-2 rounded bg-muted/50 border border-border">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <Users className="w-3 h-3" />
                Best For
              </div>
              <div className="flex flex-wrap gap-1">
                {framework.bestFor.slice(0, 2).map((use) => (
                  <Badge key={use} variant="secondary" className="text-[10px]">
                    {use}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Value Equation */}
            <div className="p-2 rounded bg-muted/50 border border-border">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                <Scale className="w-3 h-3" />
                Hormozi Alignment
              </div>
              <div className="text-[10px]">{framework.hormoziAlignment}</div>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Why Selected - Specific Reasons */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Why This Framework Works
          </div>
          <ul className="space-y-1.5">
            {reasoning.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs">
                <span className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-green-600 font-medium">{idx + 1}</span>
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Problems Addressed */}
        {detectedProblems.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Issues This Framework Addresses
            </div>
            <div className="flex flex-wrap gap-1">
              {detectedProblems.map((problem, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px]">
                  {problem}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Why Others Were Rejected */}
        {rejectedFrameworks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-400" />
              Why Others Were Rejected
            </div>
            <div className="space-y-1">
              {rejectedFrameworks.slice(0, 3).map((rejection, idx) => (
                <div key={idx} className="text-[10px] p-2 bg-red-500/5 border border-red-500/10 rounded">
                  <span className="font-medium text-red-600">{rejection.framework}:</span>{' '}
                  <span className="text-muted-foreground">{rejection.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
