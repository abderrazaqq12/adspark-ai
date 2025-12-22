// Debug Panel - AI decision transparency (always visible, contextual)

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  Bug,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Brain,
  Upload,
  Settings2,
  Film,
} from 'lucide-react';
import { useState } from 'react';
import { SmartScenePlan, ScenePlanOutput } from '@/lib/smart-scene-builder/types';
import { validateScenePlan } from '@/lib/smart-scene-builder/output-schema';

interface DebugPanelProps {
  scenePlan: ScenePlanOutput;
}

export function DebugPanel({ scenePlan }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const validation = validateScenePlan(scenePlan);
  
  // Calculate stats
  const tierBreakdown = scenePlan.scenes.reduce((acc, scene) => {
    const tier = scene.selectedEngine.tier;
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const engineBreakdown = scenePlan.scenes.reduce((acc, scene) => {
    const engine = scene.selectedEngine.engineName;
    acc[engine] = (acc[engine] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Determine current stage for contextual display
  const hasAssets = scenePlan.metadata.scenesCount > 0; // Simplified check
  const hasScenes = scenePlan.metadata.scenesCount > 0;
  const hasCompletedScenes = scenePlan.metadata.completedCount > 0;
  
  const getCurrentStage = () => {
    if (hasCompletedScenes) return { label: 'Engine Resolution Complete', icon: CheckCircle, color: 'text-green-500' };
    if (hasScenes) return { label: 'Scenes Defined, Engines Selected', icon: Zap, color: 'text-primary' };
    return { label: 'Awaiting Scenes', icon: Film, color: 'text-muted-foreground' };
  };
  
  const currentStage = getCurrentStage();
  const StageIcon = currentStage.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 h-auto rounded-none"
          >
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Debug & Transparency Panel</span>
              
              {/* Current stage indicator */}
              <Badge variant="outline" className="text-xs gap-1">
                <StageIcon className={`w-3 h-3 ${currentStage.color}`} />
                {currentStage.label}
              </Badge>
              
              {!validation.valid && (
                <Badge variant="destructive" className="text-xs">
                  {validation.errors.length} errors
                </Badge>
              )}
              {validation.warnings.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {validation.warnings.length} warnings
                </Badge>
              )}
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 pt-0 border-t border-border space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Total Duration</span>
                </div>
                <p className="text-lg font-bold">{scenePlan.metadata.totalDuration}s</p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">Estimated Cost</span>
                </div>
                <p className="text-lg font-bold">${scenePlan.metadata.totalEstimatedCost.toFixed(2)}</p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs">Engines Used</span>
                </div>
                <p className="text-lg font-bold">{scenePlan.metadata.enginesUsed.length}</p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">Completed</span>
                </div>
                <p className="text-lg font-bold">
                  {scenePlan.metadata.completedCount}/{scenePlan.metadata.scenesCount}
                </p>
              </div>
            </div>
            
            {/* Validation Results */}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Validation Results
                </h4>
                
                {validation.errors.map((error, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                ))}
                
                {validation.warnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-500 bg-amber-500/10 rounded-lg p-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {warning}
                  </div>
                ))}
              </div>
            )}
            
            {/* Tier Breakdown */}
            {Object.keys(tierBreakdown).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Engine Tier Distribution</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(tierBreakdown).map(([tier, count]) => (
                    <Badge key={tier} variant="outline">
                      {tier}: {count} scene{count > 1 ? 's' : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Engine Breakdown */}
            {Object.keys(engineBreakdown).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Engine Usage</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(engineBreakdown).map(([engine, count]) => (
                    <Badge key={engine} variant="secondary">
                      {engine}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Per-Scene Details */}
            {scenePlan.scenes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI Decisions per Scene
                </h4>
                
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {scenePlan.scenes.map((scene, i) => (
                      <div key={scene.id} className="bg-muted/30 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Scene {i + 1}: {scene.structure}</span>
                          <Badge variant={scene.status === 'completed' ? 'default' : 'secondary'}>
                            {scene.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                          <div>
                            <span className="opacity-70">Engine:</span>{' '}
                            <span className="text-foreground">{scene.selectedEngine.engineName}</span>
                          </div>
                          <div>
                            <span className="opacity-70">Cost:</span>{' '}
                            <span className="text-foreground">${scene.selectedEngine.estimatedCost.toFixed(3)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="opacity-70">Reason:</span>{' '}
                            <span className="text-foreground">{scene.selectedEngine.reason}</span>
                          </div>
                          {scene.selectedEngine.alternatives.length > 0 && (
                            <div className="col-span-2">
                              <span className="opacity-70">Rejected:</span>{' '}
                              {scene.selectedEngine.alternatives.map(alt => alt.engineName).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* JSON Output Preview */}
            <div>
              <h4 className="text-sm font-medium mb-2">Scene Plan JSON (Output Contract)</h4>
              <ScrollArea className="h-[150px] bg-muted/50 rounded-lg p-3">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(scenePlan, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
