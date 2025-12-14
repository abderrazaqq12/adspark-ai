/**
 * Step 3: Strategy
 * Brain V2 planning and variation configuration with Ad Director insights
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, 
  RefreshCw, 
  ArrowRight,
  CheckCircle2,
  Brain,
  Sparkles
} from 'lucide-react';
import { 
  ProblemDisplay, 
  ScoringDisplay, 
  BlueprintV2Card,
  BrainStatus 
} from '@/components/creative-scale/BrainV2Display';
import { BrainV2DecisionCard } from '@/components/creative-scale/BrainV2DecisionCard';
import { VariationCard } from '@/components/creative-scale/VariationCard';
import { AdDirectorPanel } from '@/components/creative-scale/AdDirectorPanel';
import { PredictiveMetrics } from '@/components/creative-scale/PredictiveMetrics';
import { FrameworkComparisonView } from '@/components/creative-scale/FrameworkComparisonView';
import { generateAdDirectorReview } from '@/lib/creative-scale/ad-director';
import type { VideoAnalysis, CreativeBlueprint } from '@/lib/creative-scale/types';
import type { OptimizationGoal, RiskTolerance, CreativeBlueprintV2, DetectedProblem, ExtractedSignals, HormoziValueScore } from '@/lib/creative-scale/brain-v2-types';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';

// Helper to derive signals from analysis
function deriveSignalsFromAnalysis(analysis: VideoAnalysis): ExtractedSignals {
  const hookSegment = analysis.segments.find(s => s.type === 'hook');
  const ctaSegment = analysis.segments.find(s => s.type === 'cta');
  const benefitSegment = analysis.segments.find(s => s.type === 'benefit');
  const problemSegment = analysis.segments.find(s => s.type === 'problem');
  
  // Calculate average pacing from segments
  const avgPacing = analysis.segments.length > 0
    ? analysis.segments.reduce((sum, s) => sum + s.pacing_score, 0) / analysis.segments.length
    : 0.6;
  
  return {
    hook_strength: hookSegment?.attention_score ?? analysis.overall_scores.hook_strength ?? 0.5,
    pacing_score: avgPacing,
    cta_clarity: ctaSegment?.clarity_score ?? analysis.overall_scores.cta_effectiveness ?? 0.5,
    benefit_communication: benefitSegment?.clarity_score ?? 0.6,
    problem_agitation: problemSegment?.attention_score ?? 0.5,
    proof_quality: analysis.segments.some(s => s.type === 'proof') ? 0.7 : 0.3,
    objection_handling: 0.5 // Default, not directly detectable from basic analysis
  };
}

// Helper to derive Hormozi score
function deriveHormoziScore(): HormoziValueScore {
  return {
    dream_outcome: 0.6,
    perceived_likelihood: 0.5,
    time_delay: 0.5,
    effort_sacrifice: 0.5,
    total_value_score: 2.4
  };
}

interface StrategyStepProps {
  analysis: VideoAnalysis;
  blueprint: CreativeBlueprint | null;
  plans: ExecutionPlan[];
  brainV2State: {
    optimizationGoal: OptimizationGoal;
    riskTolerance: RiskTolerance;
    detectedProblems: DetectedProblem[];
    blueprintsV2: CreativeBlueprintV2[];
  };
  variationCount: number;
  isGenerating: boolean;
  onSetGoal: (goal: OptimizationGoal) => void;
  onSetRisk: (risk: RiskTolerance) => void;
  onSetVariationCount: (count: number) => void;
  onGenerate: () => void;
  onContinue: () => void;
}

export function StrategyStep({ 
  analysis,
  blueprint,
  plans,
  brainV2State,
  variationCount,
  isGenerating,
  onSetGoal,
  onSetRisk,
  onSetVariationCount,
  onGenerate,
  onContinue
}: StrategyStepProps) {
  const hasStrategy = blueprint && plans.length > 0;

  // Generate Ad Director review from analysis
  const adDirectorReview = useMemo(() => {
    if (!analysis) return null;
    
    const signals = deriveSignalsFromAnalysis(analysis);
    const hormoziScore = deriveHormoziScore();
    
    return generateAdDirectorReview(
      analysis,
      signals,
      brainV2State.detectedProblems,
      hormoziScore,
      brainV2State.optimizationGoal
    );
  }, [analysis, brainV2State.detectedProblems, brainV2State.optimizationGoal]);

  // Derive predictive metrics
  const predictiveMetrics = useMemo(() => {
    if (!adDirectorReview) return null;
    return {
      hookStrength: adDirectorReview.hookStrength,
      ctrPotential: adDirectorReview.ctrPotential,
      dropOffRisk: adDirectorReview.dropOffRisk,
      ctaPressure: adDirectorReview.ctaPressure
    };
  }, [adDirectorReview]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Strategy Generation</h2>
        <p className="text-muted-foreground mt-1">
          Brain V2 generates optimized variation strategies based on your goals.
        </p>
      </div>

      {/* Configuration */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Brain V2</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Goal:</span>
          <Select 
            value={brainV2State.optimizationGoal} 
            onValueChange={(value: OptimizationGoal) => onSetGoal(value)}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="retention">Retention</SelectItem>
              <SelectItem value="ctr">CTR</SelectItem>
              <SelectItem value="cpa">CPA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Risk:</span>
          <Select 
            value={brainV2State.riskTolerance} 
            onValueChange={(value: RiskTolerance) => onSetRisk(value)}
          >
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Variations:</span>
          <Select 
            value={variationCount.toString()} 
            onValueChange={(value) => onSetVariationCount(parseInt(value))}
          >
            <SelectTrigger className="w-[70px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map(n => (
                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Framework Comparison */}
        <div className="ml-auto">
          <FrameworkComparisonView compact />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {!hasStrategy && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ready to Generate Strategy</h3>
            <p className="text-muted-foreground max-w-md mb-8">
              Brain V2 will analyze detected problems, score multiple strategies, 
              and select the optimal approach for your {variationCount} variation{variationCount !== 1 ? 's' : ''}.
            </p>
            <Button 
              size="lg"
              onClick={onGenerate}
              className="h-12 px-8"
            >
              <Brain className="w-5 h-5 mr-2" />
              Generate with Brain V2
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <BrainStatus 
              isProcessing={true} 
              currentLayer="Running 5-layer decision engine..."
            />
          </div>
        )}

        {hasStrategy && !isGenerating && (
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[250px]">
            <div className="space-y-6">
              {/* Strategy Complete Badge */}
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  {plans.length} Variation{plans.length !== 1 ? 's' : ''} Ready
                </span>
              </div>

              {/* Predictive Metrics */}
              {predictiveMetrics && (
                <PredictiveMetrics metrics={predictiveMetrics} />
              )}

              {/* Problems if any */}
              {brainV2State.detectedProblems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Detected Issues</h4>
                  <ProblemDisplay problems={brainV2State.detectedProblems} />
                </div>
              )}

              {/* Brain V2 Decision Card - Framework, Hormozi, Optimization Plan */}
              {brainV2State.blueprintsV2.length > 0 && brainV2State.blueprintsV2[0]?.decision && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">AI Brain v2 Decision</h4>
                  <BrainV2DecisionCard decision={brainV2State.blueprintsV2[0].decision} />
                </div>
              )}

              {/* Ad Director Marketing Suggestions */}
              {adDirectorReview && (
                <AdDirectorPanel review={adDirectorReview} />
              )}

              {/* Brain V2 Blueprints */}
              {brainV2State.blueprintsV2.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">AI Strategy</h4>
                  {brainV2State.blueprintsV2.map((bp, idx) => (
                    <BlueprintV2Card key={idx} blueprint={bp} index={idx} />
                  ))}
                </div>
              )}

              {/* Variation Preview */}
              {blueprint && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Planned Variations</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {blueprint.variation_ideas.slice(0, plans.length).map((variation, idx) => (
                      <VariationCard
                        key={variation.id}
                        variation={variation}
                        index={idx}
                        framework={blueprint.framework}
                        expectedLiftPct={10 + idx * 5}
                        aiReasoning={variation.reasoning}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Continue CTA */}
      {hasStrategy && (
        <div className="pt-6 border-t border-border mt-auto">
          <Button 
            className="w-full h-12 text-base"
            onClick={onContinue}
          >
            Continue to Execute
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
