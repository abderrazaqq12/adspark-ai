/**
 * Step 3: Strategy
 * Brain V2 planning and variation configuration with Ad Director insights
 * + Advertising Policy Compliance Layer
 * + Strategy Comparison View
 */

import { useMemo, useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Smartphone,
  Video,
  Youtube,
  MessageCircle,
  Users,
  LayoutGrid,
  Thermometer,
  Layers as LayersIcon
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
import { FrameworkExplainerCard } from '@/components/creative-scale/FrameworkExplainerCard';
import { ComplianceStatusCard } from '@/components/creative-scale/ComplianceStatusCard';
import { AutoFrameworkCard } from '@/components/creative-scale/AutoFrameworkCard';
import { StrategyComparisonView } from '@/components/creative-scale/StrategyComparisonView';
import { generateAdDirectorReview } from '@/lib/creative-scale/ad-director';
import { scanVideoAnalysis, scanBlueprint, generateComplianceResult } from '@/lib/creative-scale/compliance-engine';
import { selectFrameworkAutomatically } from '@/lib/creative-scale/auto-framework-selector';
import type { AdPlatform, FunnelStage } from '@/lib/creative-scale/compliance-types';
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

type PlatformType = 'tiktok' | 'reels' | 'snapchat' | 'youtube' | 'facebook' | 'general';
type FunnelStageType = 'cold' | 'warm' | 'retargeting';
interface StrategyStepProps {
  analysis: VideoAnalysis;
  blueprint: CreativeBlueprint | null;
  plans: ExecutionPlan[];
  brainV2State: {
    optimizationGoal: OptimizationGoal;
    riskTolerance: RiskTolerance;
    platform: PlatformType;
    funnelStage: FunnelStageType;
    detectedProblems: DetectedProblem[];
    blueprintsV2: CreativeBlueprintV2[];
  };
  variationCount: number;
  isGenerating: boolean;
  onSetGoal: (goal: OptimizationGoal) => void;
  onSetRisk: (risk: RiskTolerance) => void;
  onSetPlatform: (platform: PlatformType) => void;
  onSetFunnelStage: (stage: FunnelStageType) => void;
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
  onSetPlatform,
  onSetFunnelStage,
  onSetVariationCount,
  onGenerate,
  onContinue
}: StrategyStepProps) {
  const hasStrategy = blueprint && plans.length > 0;

  // Track previous blueprint for comparison
  const [previousBlueprint, setPreviousBlueprint] = useState<CreativeBlueprint | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const prevBlueprintRef = useRef<CreativeBlueprint | null>(null);

  // Update previous blueprint when a new one is generated
  useEffect(() => {
    if (blueprint && prevBlueprintRef.current && blueprint.id !== prevBlueprintRef.current.id) {
      setPreviousBlueprint(prevBlueprintRef.current);
      setShowComparison(true);
    }
    prevBlueprintRef.current = blueprint;
  }, [blueprint]);

  const handleKeepNew = () => {
    setShowComparison(false);
    setPreviousBlueprint(null);
  };

  const handleRevertToOld = () => {
    // For now just dismiss - revert would require parent callback
    setShowComparison(false);
    setPreviousBlueprint(null);
  };

  const handleDismissComparison = () => {
    setShowComparison(false);
  };
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

  // Map platform type to AdPlatform for compliance
  const mapToAdPlatform = (platform: PlatformType): AdPlatform => {
    const mapping: Record<string, AdPlatform> = {
      'tiktok': 'tiktok',
      'snapchat': 'snapchat',
      'facebook': 'meta',
      'reels': 'meta',
      'youtube': 'google',
      'general': 'general'
    };
    return mapping[platform] || 'general';
  };

  // Compliance scanning
  const complianceResult = useMemo(() => {
    if (!analysis) return null;
    const adPlatform = mapToAdPlatform(brainV2State.platform);
    const analysisViolations = scanVideoAnalysis(analysis, adPlatform);
    const blueprintViolations = blueprint ? scanBlueprint(blueprint, adPlatform) : [];
    return generateComplianceResult(adPlatform, analysisViolations, blueprintViolations);
  }, [analysis, blueprint, brainV2State.platform]);

  // Auto framework selection
  const autoFrameworkResult = useMemo(() => {
    if (!analysis) return null;
    const videoDuration = (analysis.metadata?.duration_ms || 15000) / 1000;
    const adPlatform = mapToAdPlatform(brainV2State.platform);
    const hasProof = analysis.segments.some(s => s.type === 'proof');

    return selectFrameworkAutomatically({
      platform: adPlatform,
      videoLengthSec: videoDuration,
      riskLevel: complianceResult?.overallRisk || 'safe',
      funnelStage: brainV2State.funnelStage as FunnelStage,
      hasProofElements: hasProof,
      hookStrength: analysis.overall_scores?.hook_strength || 0.5
    });
  }, [analysis, brainV2State.platform, brainV2State.funnelStage, complianceResult]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          Strategy Generation
        </h2>
        <p className="text-muted-foreground mt-1">
          AI Brain V2 generates optimized variation strategies based on your goals.
        </p>
      </div>

      {/* Configuration - Optimized Design */}
      <div className="mb-8 p-6 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-primary/20 shadow-2xl relative overflow-hidden group">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full -z-10 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 blur-3xl rounded-full -z-10" />

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-purple-600 flex items-center justify-center shadow-xl shadow-primary/20 ring-1 ring-white/20">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Brain V2 Engine
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0 uppercase tracking-widest font-black">Pro</Badge>
            </h3>
            <p className="text-xs text-slate-400 font-medium">Advanced AI marketing logic & strategic planning</p>
          </div>
        </div>


        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5 ml-1">
              <Target className="w-3 h-3 text-primary" /> Goal
            </label>
            <Select
              value={brainV2State.optimizationGoal}
              onValueChange={(value: OptimizationGoal) => onSetGoal(value)}
            >
              <SelectTrigger className="h-10 text-xs bg-black/40 border-white/10 hover:border-primary/50 transition-all rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retention">Retention</SelectItem>
                <SelectItem value="ctr">CTR</SelectItem>
                <SelectItem value="cpa">CPA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5 ml-1">
              <Sparkles className="w-3 h-3 text-purple-400" /> Risk
            </label>
            <Select
              value={brainV2State.riskTolerance}
              onValueChange={(value: RiskTolerance) => onSetRisk(value)}
            >
              <SelectTrigger className="h-10 text-xs bg-black/40 border-white/10 hover:border-primary/50 transition-all rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5 ml-1">
              <Smartphone className="w-3 h-3 text-blue-400" /> Platform
            </label>
            <Select
              value={brainV2State.platform}
              onValueChange={(value: PlatformType) => onSetPlatform(value)}
            >
              <SelectTrigger className="h-10 text-xs bg-black/40 border-white/10 hover:border-primary/50 transition-all rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="reels">Reels</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="snapchat">Snapchat</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5 ml-1">
              <Thermometer className="w-3 h-3 text-orange-400" /> Funnel
            </label>
            <Select
              value={brainV2State.funnelStage}
              onValueChange={(value: FunnelStageType) => onSetFunnelStage(value)}
            >
              <SelectTrigger className="h-10 text-xs bg-black/40 border-white/10 hover:border-primary/50 transition-all rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="retargeting">Retargeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5 ml-1">
              <LayersIcon className="w-3 h-3 text-green-400" /> Variations
            </label>
            <Select
              value={variationCount.toString()}
              onValueChange={(value) => onSetVariationCount(parseInt(value))}
            >
              <SelectTrigger className="h-10 text-xs bg-black/40 border-white/10 hover:border-primary/50 transition-all rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 10].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n} Ideas</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5 ml-1">
              <LayoutGrid className="w-3 h-3 text-pink-400" /> Frameworks
            </label>
            <div className="h-10 flex items-center">
              <FrameworkComparisonView compact />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">

          {!hasStrategy && !isGenerating && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Brain className="w-3 h-3 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Ready to Generate AI Strategy</h3>
              <p className="text-muted-foreground max-w-md mb-8 text-sm">
                Brain V2 will analyze your video, detect improvement opportunities,
                and create {variationCount} unique AI-powered variation{variationCount !== 1 ? 's' : ''}.
              </p>
              <Button
                size="lg"
                onClick={onGenerate}
                className="h-14 px-10 text-base bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 shadow-lg shadow-primary/25"
              >
                <Brain className="w-5 h-5 mr-2" />
                Generate AI Strategy
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="space-y-6 py-6">
              {/* Loading Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">AI Generating {variationCount} Variations...</h3>
                <p className="text-muted-foreground text-sm">Analyzing patterns and creating unique strategies</p>
              </div>

              {/* Skeleton Variation Cards */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  Generating Planned Variations ({variationCount})
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: variationCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-border/50 bg-card/50 animate-pulse space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-20 bg-muted rounded" />
                          <div className="h-5 w-12 bg-primary/20 rounded" />
                        </div>
                        <div className="h-5 w-16 bg-green-500/20 rounded" />
                      </div>
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted/60 rounded" />
                      <div className="flex gap-2 mt-2">
                        <div className="h-6 w-20 bg-muted/40 rounded" />
                        <div className="h-6 w-16 bg-muted/40 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasStrategy && !isGenerating && (
            <ScrollArea className="h-[calc(100vh-420px)] min-h-[250px]">
              <div className="space-y-6">
                {/* Compliance Status Card */}
                {complianceResult && (
                  <ComplianceStatusCard result={complianceResult} />
                )}

                {/* Auto Framework Selection Card */}
                {autoFrameworkResult && (
                  <AutoFrameworkCard
                    result={autoFrameworkResult}
                    context={{
                      platform: mapToAdPlatform(brainV2State.platform),
                      videoLengthSec: (analysis.metadata?.duration_ms || 15000) / 1000,
                      riskLevel: complianceResult?.overallRisk || 'safe',
                      funnelStage: brainV2State.funnelStage as FunnelStage,
                      hasProofElements: analysis.segments.some(s => s.type === 'proof'),
                      hookStrength: analysis.overall_scores?.hook_strength || 0.5
                    }}
                  />
                )}

                {/* Strategy Comparison View */}
                {showComparison && previousBlueprint && blueprint && (
                  <StrategyComparisonView
                    previousBlueprint={previousBlueprint}
                    currentBlueprint={blueprint}
                    onDismiss={handleDismissComparison}
                    onKeepNew={handleKeepNew}
                    onRevertToOld={handleRevertToOld}
                  />
                )}

                {/* Strategy Complete Badge + Regenerate Button */}
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      {plans.length} Variation{plans.length !== 1 ? 's' : ''} Ready
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onGenerate}
                    className="gap-2 border-primary/30 hover:bg-primary/10"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate Strategy
                  </Button>
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

                {/* Framework Explainer Card - Why this framework was chosen */}
                {brainV2State.blueprintsV2.length > 0 && brainV2State.blueprintsV2[0]?.decision && (
                  <FrameworkExplainerCard
                    selectedFramework={brainV2State.blueprintsV2[0].decision.framework_decision.primary_framework}
                    reasoning={brainV2State.blueprintsV2[0].decision.explanation.why_chosen}
                    rejectedFrameworks={brainV2State.blueprintsV2[0].decision.explanation.why_others_rejected}
                    confidence={brainV2State.blueprintsV2[0].decision.framework_decision.confidence}
                    goal={brainV2State.optimizationGoal}
                    detectedProblems={brainV2State.detectedProblems.map(p => p.type)}
                  />
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
                {blueprint && blueprint.variation_ideas.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Planned Variations ({blueprint.variation_ideas.length})</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {blueprint.variation_ideas.map((variation, idx) => (
                        <VariationCard
                          key={variation.id || `var-${idx}`}
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
