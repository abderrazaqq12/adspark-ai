// Real-Time Cost Estimator
// Shows live cost estimation that updates as users change settings

import { useMemo, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Clock,
  Film,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SmartScenePlan, VideoConfig, BudgetPreference } from '@/lib/smart-scene-builder/types';
import { COST_ESTIMATES, formatCost } from '@/lib/costTracker';
import { cn } from '@/lib/utils';

interface RealTimeCostEstimatorProps {
  scenes: SmartScenePlan[];
  config: VideoConfig;
  assets: { id: string; type: string }[];
}

// Budget tier cost multipliers
const BUDGET_MULTIPLIERS: Record<BudgetPreference, { min: number; max: number; label: string }> = {
  auto: { min: 0.8, max: 1.2, label: 'AI Optimized' },
  free: { min: 0, max: 0, label: 'Free Tier' },
  low: { min: 0.3, max: 0.5, label: 'Budget' },
  balanced: { min: 0.6, max: 0.9, label: 'Balanced' },
  premium: { min: 1.0, max: 1.5, label: 'Premium' },
};

// Get cost for a scene based on its engine
function getSceneCost(scene: SmartScenePlan): number {
  const engineId = scene.selectedEngine?.engineId || 'default';
  const baseCost = COST_ESTIMATES[engineId] || COST_ESTIMATES['default'] || 0.30;
  const durationMultiplier = scene.duration / 5; // 5s is baseline
  return baseCost * durationMultiplier;
}

// Animated number component
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 2 }: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isIncreasing, setIsIncreasing] = useState<boolean | null>(null);

  useEffect(() => {
    if (value !== displayValue) {
      setIsIncreasing(value > displayValue);
      const timeout = setTimeout(() => setIsIncreasing(null), 600);
      setDisplayValue(value);
      return () => clearTimeout(timeout);
    }
  }, [value, displayValue]);

  return (
    <span className={cn(
      'transition-all duration-300',
      isIncreasing === true && 'text-amber-500',
      isIncreasing === false && 'text-green-500'
    )}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}

export function RealTimeCostEstimator({ scenes, config, assets }: RealTimeCostEstimatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previousCost, setPreviousCost] = useState<number | null>(null);

  // Calculate costs in real-time
  const costBreakdown = useMemo(() => {
    const sceneCosts = scenes.map(scene => ({
      id: scene.id,
      index: scene.index,
      goal: scene.goal,
      structure: scene.structure,
      engine: scene.selectedEngine?.engineId || 'unknown',
      duration: scene.duration,
      cost: getSceneCost(scene),
      status: scene.status,
    }));

    const totalSceneCost = sceneCosts.reduce((sum, s) => sum + s.cost, 0);
    
    // Group by engine
    const byEngine = sceneCosts.reduce((acc, s) => {
      acc[s.engine] = (acc[s.engine] || 0) + s.cost;
      return acc;
    }, {} as Record<string, number>);

    // Calculate range based on budget preference
    const multiplier = BUDGET_MULTIPLIERS[config.budgetPreference];
    const minCost = config.budgetPreference === 'free' ? 0 : totalSceneCost * multiplier.min;
    const maxCost = config.budgetPreference === 'free' ? 0 : totalSceneCost * multiplier.max;

    return {
      scenes: sceneCosts,
      byEngine,
      totalSceneCost,
      minCost,
      maxCost,
      avgCostPerScene: scenes.length > 0 ? totalSceneCost / scenes.length : 0,
      totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
      budgetLabel: multiplier.label,
    };
  }, [scenes, config.budgetPreference]);

  // Track cost changes for visual feedback
  useEffect(() => {
    if (previousCost !== null && previousCost !== costBreakdown.totalSceneCost) {
      // Cost changed - could trigger animation or notification
    }
    setPreviousCost(costBreakdown.totalSceneCost);
  }, [costBreakdown.totalSceneCost, previousCost]);

  const costDiff = previousCost !== null ? costBreakdown.totalSceneCost - previousCost : 0;
  const isFree = config.budgetPreference === 'free';

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-muted/30 border-border overflow-hidden">
      {/* Header with main cost */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Real-Time Cost Estimate</h4>
            <p className="text-xs text-muted-foreground">Updates as you build</p>
          </div>
        </div>
        
        {/* Main cost display */}
        <div className="text-right">
          <div className="flex items-center gap-2">
            {isFree ? (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Free
              </Badge>
            ) : (
              <span className="text-2xl font-bold">
                <AnimatedNumber value={costBreakdown.totalSceneCost} prefix="$" />
              </span>
            )}
            {costDiff !== 0 && !isFree && (
              <Badge variant="outline" className={cn(
                'text-xs',
                costDiff > 0 ? 'text-amber-500 border-amber-500/30' : 'text-green-500 border-green-500/30'
              )}>
                {costDiff > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {costDiff > 0 ? '+' : ''}{formatCost(costDiff)}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {costBreakdown.budgetLabel} tier
          </p>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <Film className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">{scenes.length}</p>
          <p className="text-xs text-muted-foreground">Scenes</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <Clock className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">{costBreakdown.totalDuration}s</p>
          <p className="text-xs text-muted-foreground">Duration</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <Zap className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">{Object.keys(costBreakdown.byEngine).length}</p>
          <p className="text-xs text-muted-foreground">Engines</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <DollarSign className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isFree ? '$0' : formatCost(costBreakdown.avgCostPerScene)}
          </p>
          <p className="text-xs text-muted-foreground">Per Scene</p>
        </div>
      </div>

      {/* Cost range indicator */}
      {!isFree && scenes.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Estimated Range</span>
            <span>{formatCost(costBreakdown.minCost)} - {formatCost(costBreakdown.maxCost)}</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 via-primary to-amber-500 rounded-full"
              style={{ 
                left: `${(costBreakdown.minCost / costBreakdown.maxCost) * 50}%`,
                right: `${100 - ((costBreakdown.totalSceneCost / costBreakdown.maxCost) * 100)}%`,
              }}
            />
            <div 
              className="absolute top-0 w-1 h-2 bg-foreground rounded-full"
              style={{ left: `${(costBreakdown.totalSceneCost / costBreakdown.maxCost) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Expandable details */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            Show Breakdown
          </>
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {/* Per-engine breakdown */}
          {Object.keys(costBreakdown.byEngine).length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Cost by Engine</h5>
              <div className="space-y-2">
                {Object.entries(costBreakdown.byEngine)
                  .sort(([, a], [, b]) => b - a)
                  .map(([engine, cost]) => (
                    <div key={engine} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="truncate">{engine}</span>
                          <span className="font-medium">{formatCost(cost)}</span>
                        </div>
                        <Progress 
                          value={(cost / costBreakdown.totalSceneCost) * 100} 
                          className="h-1"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Per-scene breakdown */}
          {costBreakdown.scenes.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Cost by Scene</h5>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {costBreakdown.scenes.map((scene) => (
                  <div 
                    key={scene.id}
                    className="flex items-center justify-between text-xs p-2 rounded bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs py-0 px-1">
                        #{scene.index + 1}
                      </Badge>
                      <span className="truncate max-w-[100px] capitalize">{scene.goal || 'Scene'}</span>
                      <span className="text-muted-foreground">{scene.duration}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground truncate max-w-[80px]">
                        {scene.engine}
                      </span>
                      <span className="font-medium">{isFree ? '$0' : formatCost(scene.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info note */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <p>
              Costs are estimates based on engine pricing. Actual costs may vary based on 
              generation parameters and API usage.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
