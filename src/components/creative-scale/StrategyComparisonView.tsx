/**
 * Strategy Comparison View
 * Shows differences between old and new AI-generated strategies
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowRight, 
  ArrowDown, 
  X, 
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  GitCompare
} from 'lucide-react';
import type { CreativeBlueprint, VariationIdea } from '@/lib/creative-scale/types';

interface StrategyComparisonViewProps {
  previousBlueprint: CreativeBlueprint;
  currentBlueprint: CreativeBlueprint;
  onDismiss: () => void;
  onKeepNew: () => void;
  onRevertToOld: () => void;
}

function getFrameworkBadgeColor(framework: string): string {
  const colors: Record<string, string> = {
    'AIDA': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'PAS': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'BAB': 'bg-green-500/20 text-green-400 border-green-500/30',
    'FAB': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'UGC': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'OFFER_STACK': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'HOOK_BENEFIT_CTA': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    '4Ps': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  };
  return colors[framework] || 'bg-muted text-muted-foreground';
}

function compareVariations(oldIdeas: VariationIdea[], newIdeas: VariationIdea[]): {
  added: VariationIdea[];
  removed: VariationIdea[];
  common: { old: VariationIdea; new: VariationIdea }[];
} {
  const added: VariationIdea[] = [];
  const removed: VariationIdea[] = [];
  const common: { old: VariationIdea; new: VariationIdea }[] = [];

  // Match by target_segment_type for comparison
  const oldByType = new Map<string, VariationIdea>();
  oldIdeas.forEach(idea => {
    oldByType.set(idea.target_segment_type, idea);
  });

  const matchedOldTypes = new Set<string>();

  newIdeas.forEach(newIdea => {
    const oldIdea = oldByType.get(newIdea.target_segment_type);
    if (oldIdea) {
      common.push({ old: oldIdea, new: newIdea });
      matchedOldTypes.add(newIdea.target_segment_type);
    } else {
      added.push(newIdea);
    }
  });

  oldIdeas.forEach(oldIdea => {
    if (!matchedOldTypes.has(oldIdea.target_segment_type)) {
      removed.push(oldIdea);
    }
  });

  return { added, removed, common };
}

export function StrategyComparisonView({
  previousBlueprint,
  currentBlueprint,
  onDismiss,
  onKeepNew,
  onRevertToOld
}: StrategyComparisonViewProps) {
  const frameworkChanged = previousBlueprint.framework !== currentBlueprint.framework;
  const { added, removed, common } = compareVariations(
    previousBlueprint.variation_ideas,
    currentBlueprint.variation_ideas
  );

  return (
    <div className="border border-primary/30 rounded-xl bg-gradient-to-br from-primary/5 via-background to-purple-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
            <GitCompare className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Strategy Comparison</h3>
            <p className="text-xs text-muted-foreground">Review changes from previous strategy</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="p-4 space-y-4">
          {/* Framework Change */}
          {frameworkChanged && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Framework Changed</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`${getFrameworkBadgeColor(previousBlueprint.framework)} border`}>
                  {previousBlueprint.framework}
                </Badge>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <Badge className={`${getFrameworkBadgeColor(currentBlueprint.framework)} border`}>
                  {currentBlueprint.framework}
                </Badge>
              </div>
            </div>
          )}

          {/* Objective Comparison */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Objective</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <span className="text-xs text-muted-foreground">Previous</span>
                <p className="text-sm mt-1">{previousBlueprint.objective.primary_goal}</p>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <span className="text-xs text-primary">New</span>
                <p className="text-sm mt-1">{currentBlueprint.objective.primary_goal}</p>
              </div>
            </div>
          </div>

          {/* Variation Changes */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Variation Changes
            </h4>

            {/* Added Variations */}
            {added.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-green-500">New Strategies ({added.length})</span>
                </div>
                {added.map((idea, idx) => (
                  <div key={idx} className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs h-5 bg-green-500/10 border-green-500/30 text-green-400">
                        {idea.target_segment_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs h-5">
                        {idea.action}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{idea.intent}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Removed Variations */}
            {removed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-red-500">Removed Strategies ({removed.length})</span>
                </div>
                {removed.map((idea, idx) => (
                  <div key={idx} className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg opacity-60">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs h-5 bg-red-500/10 border-red-500/30 text-red-400 line-through">
                        {idea.target_segment_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs h-5 line-through">
                        {idea.action}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-through">{idea.intent}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Modified Variations */}
            {common.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-blue-500">Modified Strategies ({common.length})</span>
                </div>
                {common.map(({ old, new: newIdea }, idx) => (
                  <div key={idx} className="p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs h-5">
                        {newIdea.target_segment_type}
                      </Badge>
                      {old.action !== newIdea.action && (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-muted-foreground line-through">{old.action}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-primary">{newIdea.action}</span>
                        </div>
                      )}
                    </div>
                    {old.intent !== newIdea.intent && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground line-through">{old.intent}</p>
                        <p className="text-xs text-primary">{newIdea.intent}</p>
                      </div>
                    )}
                    {old.intent === newIdea.intent && old.action === newIdea.action && (
                      <p className="text-xs text-muted-foreground">No changes</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="p-2 bg-green-500/10 rounded-lg text-center">
              <span className="text-lg font-bold text-green-500">{added.length}</span>
              <p className="text-xs text-muted-foreground">Added</p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-center">
              <span className="text-lg font-bold text-blue-500">{common.length}</span>
              <p className="text-xs text-muted-foreground">Modified</p>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg text-center">
              <span className="text-lg font-bold text-red-500">{removed.length}</span>
              <p className="text-xs text-muted-foreground">Removed</p>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 p-3 border-t border-border/50 bg-muted/20">
        <Button variant="outline" size="sm" onClick={onRevertToOld} className="gap-2">
          <ArrowDown className="w-3 h-3 rotate-180" />
          Revert to Previous
        </Button>
        <Button size="sm" onClick={onKeepNew} className="gap-2 bg-gradient-to-r from-primary to-purple-500">
          <Check className="w-3 h-3" />
          Keep New Strategy
        </Button>
      </div>
    </div>
  );
}
