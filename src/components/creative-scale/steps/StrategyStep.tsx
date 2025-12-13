/**
 * Step 3: Strategy
 * Brain V2 planning and variation configuration
 */

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
import { VariationCard } from '@/components/creative-scale/VariationCard';
import type { VideoAnalysis, CreativeBlueprint } from '@/lib/creative-scale/types';
import type { OptimizationGoal, RiskTolerance, CreativeBlueprintV2, DetectedProblem } from '@/lib/creative-scale/brain-v2-types';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';

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

              {/* Problems if any */}
              {brainV2State.detectedProblems.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Detected Issues</h4>
                  <ProblemDisplay problems={brainV2State.detectedProblems} />
                </div>
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
