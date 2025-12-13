/**
 * AI Brain v2 Display Components
 * Shows detected problems, scoring, selection, and explainability
 * UI enforces truth, not optimism
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  Brain, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target,
  Zap,
  Shield,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import type { 
  CreativeBlueprintV2, 
  DetectedProblem, 
  ScoredStrategy,
  StrategyCandidate,
  BrainFailureOutput 
} from '@/lib/creative-scale/brain-v2-types';

// ============================================
// PROBLEM DISPLAY
// ============================================

interface ProblemDisplayProps {
  problems: DetectedProblem[];
}

export function ProblemDisplay({ problems }: ProblemDisplayProps) {
  if (problems.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-green-600 dark:text-green-400">
              No significant problems detected. Video is performing well.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Detected Problems
        </CardTitle>
        <CardDescription>
          Issues identified by AI Brain v2 analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {problems.map((problem, idx) => (
          <div 
            key={idx} 
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
          >
            <div className="flex-shrink-0 mt-0.5">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: `hsl(${(1 - problem.severity) * 120}, 70%, 50%)`,
                  color: 'white'
                }}
              >
                {Math.round(problem.severity * 100)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {formatProblemType(problem.type)}
                </span>
                <Badge 
                  variant={problem.severity > 0.7 ? 'destructive' : problem.severity > 0.5 ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {problem.severity > 0.7 ? 'High' : problem.severity > 0.5 ? 'Medium' : 'Low'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {problem.details}
              </p>
              {problem.segment_id && (
                <span className="text-xs text-muted-foreground/70">
                  Segment: {problem.segment_id}
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function formatProblemType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

// ============================================
// SCORING DISPLAY
// ============================================

interface ScoringDisplayProps {
  scoredStrategies: ScoredStrategy[];
  selectedId?: string;
}

export function ScoringDisplay({ scoredStrategies, selectedId }: ScoringDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Scoring Engine Details
              </CardTitle>
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
            <CardDescription>
              How each strategy was evaluated
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {scoredStrategies.map((strategy) => (
              <div 
                key={strategy.strategy_id}
                className={`p-3 rounded-lg border ${
                  strategy.strategy_id === selectedId 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{strategy.framework}</Badge>
                    {strategy.strategy_id === selectedId && (
                      <Badge className="bg-primary text-primary-foreground">Selected</Badge>
                    )}
                  </div>
                  <span className="font-bold text-lg">
                    {(strategy.final_score * 100).toFixed(0)}
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <ScoreBar label="Impact" value={strategy.impact_score} color="green" />
                  <ScoreBar label="Risk" value={strategy.risk_score} color="red" inverted />
                  <ScoreBar label="Cost" value={strategy.cost_score} color="amber" inverted />
                  <ScoreBar label="Confidence" value={strategy.confidence_score} color="blue" />
                </div>

                <div className="mt-2 text-xs text-muted-foreground grid grid-cols-2 gap-1">
                  <span>+{strategy.breakdown.impact_contribution.toFixed(2)} impact</span>
                  <span>-{strategy.breakdown.risk_penalty.toFixed(2)} risk</span>
                  <span>-{strategy.breakdown.cost_penalty.toFixed(2)} cost</span>
                  <span>+{strategy.breakdown.trust_bonus.toFixed(2)} trust</span>
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ScoreBar({ 
  label, 
  value, 
  color, 
  inverted = false 
}: { 
  label: string; 
  value: number; 
  color: string;
  inverted?: boolean;
}) {
  const displayValue = inverted ? 1 - value : value;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <Progress 
        value={displayValue * 100} 
        className={`h-1.5 ${
          color === 'green' ? '[&>div]:bg-green-500' :
          color === 'red' ? '[&>div]:bg-red-500' :
          color === 'amber' ? '[&>div]:bg-amber-500' :
          '[&>div]:bg-blue-500'
        }`}
      />
    </div>
  );
}

// ============================================
// BLUEPRINT V2 CARD
// ============================================

interface BlueprintV2CardProps {
  blueprint: CreativeBlueprintV2;
  index: number;
  onSelect?: () => void;
  selected?: boolean;
}

export function BlueprintV2Card({ blueprint, index, onSelect, selected }: BlueprintV2CardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected ? 'border-primary ring-2 ring-primary/20' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Variation {index + 1}
              </span>
              <Badge variant="outline" className="font-semibold">
                {blueprint.framework}
              </Badge>
            </div>
            <CardTitle className="text-base mt-1">
              {blueprint.intent}
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={
                blueprint.risk === 'low' ? 'outline' : 
                blueprint.risk === 'medium' ? 'secondary' : 
                'destructive'
              }
            >
              {blueprint.risk} risk
            </Badge>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                +{blueprint.expected_lift_pct}%
              </div>
              <div className="text-xs text-muted-foreground">expected lift</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Why This Strategy */}
        <div className="bg-primary/5 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Why this variation?</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>AI Brain v2 explanation of the strategic decision</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            {blueprint.explanation.why_this_strategy}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {blueprint.explanation.confidence_level} confidence
            </Badge>
            <span className="text-xs text-muted-foreground">
              {blueprint.explanation.expected_outcome}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">Actions ({blueprint.actions.length})</span>
          </div>
          <div className="space-y-1">
            {blueprint.actions.slice(0, 3).map((action, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <Target className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {formatActionType(action.action)} → {action.target_segment_type}
                </span>
              </div>
            ))}
            {blueprint.actions.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{blueprint.actions.length - 3} more actions
              </span>
            )}
          </div>
        </div>

        {/* Rejected Strategies (Collapsible) */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="text-xs">Why not other strategies?</span>
              {showDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2 space-y-1">
              {blueprint.explanation.why_not_others.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function formatActionType(action: string): string {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================
// FAILURE DISPLAY
// ============================================

interface FailureDisplayProps {
  failure: BrainFailureOutput;
  onRetry?: () => void;
}

export function FailureDisplay({ failure, onRetry }: FailureDisplayProps) {
  const icon = failure.mode === 'NO_ACTION' ? (
    <CheckCircle2 className="w-6 h-6 text-green-500" />
  ) : failure.mode === 'SAFE_OPTIMIZATION_ONLY' ? (
    <Shield className="w-6 h-6 text-amber-500" />
  ) : (
    <HelpCircle className="w-6 h-6 text-blue-500" />
  );

  const title = failure.mode === 'NO_ACTION' 
    ? 'No Changes Recommended'
    : failure.mode === 'SAFE_OPTIMIZATION_ONLY'
    ? 'Risk Threshold Exceeded'
    : 'More Data Needed';

  return (
    <Card className="border-dashed">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          {icon}
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {failure.reason}
            </p>
          </div>
          {failure.fallback_suggestion && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-left">
              <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{failure.fallback_suggestion}</span>
            </div>
          )}
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Try with Different Settings
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// BRAIN STATUS INDICATOR
// ============================================

interface BrainStatusProps {
  isProcessing: boolean;
  currentLayer?: string;
}

export function BrainStatus({ isProcessing, currentLayer }: BrainStatusProps) {
  if (!isProcessing) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
      <div className="relative">
        <Brain className="w-6 h-6 text-primary animate-pulse" />
        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-ping" />
      </div>
      <div>
        <p className="text-sm font-medium">AI Brain v2 Processing</p>
        <p className="text-xs text-muted-foreground">
          {currentLayer || 'Analyzing video signals...'}
        </p>
      </div>
    </div>
  );
}
