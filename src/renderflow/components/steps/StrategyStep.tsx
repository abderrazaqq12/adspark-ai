/**
 * RenderFlow Step 3: Strategy
 * Full Creative Scale-style Brain V2 planning with platform, funnel, and variation config
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowRight,
  ArrowLeft,
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
  RefreshCw
} from 'lucide-react';
import { PredictiveMetrics } from '@/components/creative-scale/PredictiveMetrics';
import { ComplianceStatusCard } from '@/components/creative-scale/ComplianceStatusCard';
import { AutoFrameworkCard } from '@/components/creative-scale/AutoFrameworkCard';
import { FrameworkComparisonView } from '@/components/creative-scale/FrameworkComparisonView';
import { ProblemDisplay } from '@/components/creative-scale/BrainV2Display';
import { generateAdDirectorReview } from '@/lib/creative-scale/ad-director';
import { scanVideoAnalysis, scanBlueprint, generateComplianceResult } from '@/lib/creative-scale/compliance-engine';
import { selectFrameworkAutomatically } from '@/lib/creative-scale/auto-framework-selector';
import type { AdPlatform, FunnelStage } from '@/lib/creative-scale/compliance-types';
import type { VideoAnalysis, CreativeBlueprint } from '@/lib/creative-scale/types';
import type { OptimizationGoal, RiskTolerance, DetectedProblem, ExtractedSignals, HormoziValueScore } from '@/lib/creative-scale/brain-v2-types';

type PlatformType = 'tiktok' | 'reels' | 'snapchat' | 'youtube' | 'facebook' | 'general';
type FunnelStageType = 'cold' | 'warm' | 'retargeting';

interface StrategyStepProps {
  analysis: VideoAnalysis;
  blueprint: CreativeBlueprint | null;
  brainV2State: {
    optimizationGoal: OptimizationGoal;
    riskTolerance: RiskTolerance;
    platform: PlatformType;
    funnelStage: FunnelStageType;
    detectedProblems: DetectedProblem[];
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
  onBack: () => void;
}

// Helper to derive signals from analysis
function deriveSignalsFromAnalysis(analysis: VideoAnalysis): ExtractedSignals {
  const hookSegment = analysis.segments.find(s => s.type === 'hook');
  const ctaSegment = analysis.segments.find(s => s.type === 'cta');
  const benefitSegment = analysis.segments.find(s => s.type === 'benefit');
  const problemSegment = analysis.segments.find(s => s.type === 'problem');
  
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
    objection_handling: 0.5
  };
}

function deriveHormoziScore(): HormoziValueScore {
  return {
    dream_outcome: 0.6,
    perceived_likelihood: 0.5,
    time_delay: 0.5,
    effort_sacrifice: 0.5,
    total_value_score: 2.4
  };
}

export function StrategyStep({ 
  analysis,
  blueprint,
  brainV2State,
  variationCount,
  isGenerating,
  onSetGoal,
  onSetRisk,
  onSetPlatform,
  onSetFunnelStage,
  onSetVariationCount,
  onGenerate,
  onContinue,
  onBack
}: StrategyStepProps) {
  const hasStrategy = blueprint !== null;

  // Ad Director review
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

  // Predictive metrics
  const predictiveMetrics = useMemo(() => {
    if (!adDirectorReview) return null;
    return {
      hookStrength: adDirectorReview.hookStrength,
      ctrPotential: adDirectorReview.ctrPotential,
      dropOffRisk: adDirectorReview.dropOffRisk,
      ctaPressure: adDirectorReview.ctaPressure
    };
  }, [adDirectorReview]);

  // Map platform type
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
    <div className="space-y-4">
      {/* Configuration Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium">Brain V2</span>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Goal:</span>
          <Select value={brainV2State.optimizationGoal} onValueChange={(v: OptimizationGoal) => onSetGoal(v)}>
            <SelectTrigger className="w-[80px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="retention">Retention</SelectItem>
              <SelectItem value="ctr">CTR</SelectItem>
              <SelectItem value="cpa">CPA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Risk:</span>
          <Select value={brainV2State.riskTolerance} onValueChange={(v: RiskTolerance) => onSetRisk(v)}>
            <SelectTrigger className="w-[70px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Platform:</span>
          <Select value={brainV2State.platform} onValueChange={(v: PlatformType) => onSetPlatform(v)}>
            <SelectTrigger className="w-[100px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tiktok"><div className="flex items-center gap-1"><Smartphone className="w-3 h-3" />TikTok</div></SelectItem>
              <SelectItem value="reels"><div className="flex items-center gap-1"><Video className="w-3 h-3" />Reels</div></SelectItem>
              <SelectItem value="youtube"><div className="flex items-center gap-1"><Youtube className="w-3 h-3" />YouTube</div></SelectItem>
              <SelectItem value="facebook"><div className="flex items-center gap-1"><Users className="w-3 h-3" />Facebook</div></SelectItem>
              <SelectItem value="snapchat"><div className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />Snapchat</div></SelectItem>
              <SelectItem value="general"><div className="flex items-center gap-1"><LayoutGrid className="w-3 h-3" />General</div></SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Funnel:</span>
          <Select value={brainV2State.funnelStage} onValueChange={(v: FunnelStageType) => onSetFunnelStage(v)}>
            <SelectTrigger className="w-[90px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border">
              <SelectItem value="cold"><div className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-blue-400" />Cold</div></SelectItem>
              <SelectItem value="warm"><div className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-amber-400" />Warm</div></SelectItem>
              <SelectItem value="retargeting"><div className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-red-400" />Retarget</div></SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Variations:</span>
          <Select value={variationCount.toString()} onValueChange={(v) => onSetVariationCount(parseInt(v))}>
            <SelectTrigger className="w-[60px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 5, 10, 15, 20, 30, 50].map(n => (
                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto">
          <FrameworkComparisonView compact />
        </div>
      </div>

      {/* Content */}
      {!hasStrategy && !isGenerating && (
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-2">Generate Strategy</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Brain V2 will analyze problems, score strategies, and select the optimal approach for {variationCount} variation{variationCount !== 1 ? 's' : ''}.
          </p>
          <Button onClick={onGenerate} className="h-10 px-6">
            <Brain className="w-4 h-4 mr-2" />
            Generate with Brain V2
          </Button>
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
            <Brain className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-2">Running Brain V2...</h3>
          <p className="text-sm text-muted-foreground">5-layer decision engine processing</p>
          <RefreshCw className="w-5 h-5 text-primary animate-spin mt-4" />
        </div>
      )}

      {hasStrategy && !isGenerating && (
        <ScrollArea className="h-[280px]">
          <div className="space-y-4">
            {/* Compliance Status */}
            {complianceResult && (
              <ComplianceStatusCard result={complianceResult} />
            )}

            {/* Auto Framework Selection */}
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

            {/* Strategy Ready Badge */}
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                {variationCount} Variation{variationCount !== 1 ? 's' : ''} Ready
              </span>
            </div>

            {/* Predictive Metrics */}
            {predictiveMetrics && (
              <PredictiveMetrics metrics={predictiveMetrics} />
            )}

            {/* Detected Problems */}
            {brainV2State.detectedProblems.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Detected Issues</h4>
                <ProblemDisplay problems={brainV2State.detectedProblems} />
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {hasStrategy && (
          <Button onClick={onContinue} className="flex-1">
            Review Settings
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
