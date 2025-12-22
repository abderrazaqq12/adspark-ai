// Variation Preview - Visual representation of how scenes will appear across video variations

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Film,
  Copy,
  Shuffle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lock,
  Unlock,
} from 'lucide-react';
import { SmartScenePlan, SceneStructure } from '@/lib/smart-scene-builder/types';
import { ScriptAnalysisResult } from '@/lib/smart-scene-builder/script-analyzer';

interface VariationPreviewProps {
  scenes: SmartScenePlan[];
  scriptAnalysis: ScriptAnalysisResult | null;
  scriptsCount: number;
}

// Scene type colors
const SCENE_COLORS: Record<SceneStructure, string> = {
  product_closeup: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  problem_visualization: 'bg-orange-500/20 border-orange-500/40 text-orange-400',
  lifestyle_usage: 'bg-green-500/20 border-green-500/40 text-green-400',
  social_proof: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
  cta_background: 'bg-red-500/20 border-red-500/40 text-red-400',
  before_after: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
  unboxing: 'bg-pink-500/20 border-pink-500/40 text-pink-400',
  testimonial: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400',
  feature_highlight: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400',
  comparison: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
};

// Scene type icons (emoji)
const SCENE_ICONS: Record<SceneStructure, string> = {
  product_closeup: '📦',
  problem_visualization: '😫',
  lifestyle_usage: '🏃',
  social_proof: '⭐',
  cta_background: '🎯',
  before_after: '✨',
  unboxing: '🎁',
  testimonial: '💬',
  feature_highlight: '🔍',
  comparison: '⚖️',
};

// Identify if a scene is reusable based on type
const REUSABLE_TYPES: SceneStructure[] = [
  'product_closeup',
  'feature_highlight',
  'cta_background',
  'social_proof',
];

function SceneBlock({ 
  scene, 
  isReusable, 
  variationIndex,
  compact = false,
}: { 
  scene: SmartScenePlan; 
  isReusable: boolean;
  variationIndex?: number;
  compact?: boolean;
}) {
  const colorClass = SCENE_COLORS[scene.structure] || 'bg-muted border-border text-muted-foreground';
  const icon = SCENE_ICONS[scene.structure] || '🎬';
  
  return (
    <div
      className={`relative rounded-lg border p-2 ${colorClass} ${compact ? 'w-12 h-12' : 'min-w-[100px]'} transition-all hover:scale-105`}
      title={`${scene.structure}: ${scene.visualIntent}`}
    >
      {isReusable && (
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Lock className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}
      
      {compact ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-lg">{icon}</span>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-sm">{icon}</span>
            <span className="text-[10px] font-medium truncate capitalize">
              {scene.structure.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="text-[9px] opacity-70">{scene.duration}s</div>
        </div>
      )}
    </div>
  );
}

function VideoVariationRow({ 
  variationNumber, 
  scenes, 
  reusableIndices,
}: { 
  variationNumber: number; 
  scenes: SmartScenePlan[];
  reusableIndices: Set<number>;
}) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-card/50 border border-border/50">
      <div className="flex items-center gap-2 min-w-[80px]">
        <Film className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium">Video {variationNumber}</span>
      </div>
      
      <div className="flex-1 flex items-center gap-1 overflow-x-auto py-1">
        {scenes.map((scene, idx) => (
          <div key={scene.id} className="flex items-center">
            <SceneBlock 
              scene={scene} 
              isReusable={reusableIndices.has(idx)}
              variationIndex={variationNumber}
              compact
            />
            {idx < scenes.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function VariationPreview({ scenes, scriptAnalysis, scriptsCount }: VariationPreviewProps) {
  const [activeVariation, setActiveVariation] = useState(0);
  
  if (scenes.length === 0) {
    return null;
  }
  
  // Determine which scenes are reusable
  const reusableIndices = new Set<number>();
  scenes.forEach((scene, idx) => {
    if (REUSABLE_TYPES.includes(scene.structure)) {
      reusableIndices.add(idx);
    }
  });
  
  // Calculate variation count
  const variationCount = Math.max(scriptsCount, scriptAnalysis?.scalingFactor || 1, 3);
  
  // Generate mock variations (same reusable scenes, shuffled specific scenes)
  const generateVariation = (variationIdx: number): SmartScenePlan[] => {
    return scenes.map((scene, idx) => {
      if (reusableIndices.has(idx)) {
        // Reusable scene stays the same
        return scene;
      }
      // For demo purposes, scenes stay the same but in real scenario would vary
      return scene;
    });
  };
  
  const reusableCount = reusableIndices.size;
  const specificCount = scenes.length - reusableCount;
  
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Variation Preview</h4>
          <Badge variant="secondary" className="text-xs">
            {variationCount} videos
          </Badge>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-primary" />
            <span>{reusableCount} reusable</span>
          </div>
          <div className="flex items-center gap-1">
            <Shuffle className="w-3 h-3 text-blue-500" />
            <span>{specificCount} variable</span>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="grid" className="text-xs">
            <Layers className="w-3 h-3 mr-1" />
            All Variations
          </TabsTrigger>
          <TabsTrigger value="single" className="text-xs">
            <Film className="w-3 h-3 mr-1" />
            Single View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid" className="mt-0">
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {Array.from({ length: variationCount }).map((_, idx) => (
                <VideoVariationRow
                  key={idx}
                  variationNumber={idx + 1}
                  scenes={generateVariation(idx)}
                  reusableIndices={reusableIndices}
                />
              ))}
            </div>
          </ScrollArea>
          
          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground mb-2">Scene Types:</p>
            <div className="flex flex-wrap gap-2">
              {scenes.slice(0, 5).map((scene, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="text-xs">{SCENE_ICONS[scene.structure]}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {scene.structure.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="single" className="mt-0">
          <div className="space-y-4">
            {/* Variation selector */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveVariation(Math.max(0, activeVariation - 1))}
                disabled={activeVariation === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span className="font-medium">Video {activeVariation + 1}</span>
                <span className="text-xs text-muted-foreground">of {variationCount}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveVariation(Math.min(variationCount - 1, activeVariation + 1))}
                disabled={activeVariation === variationCount - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Scene timeline */}
            <div className="flex items-center gap-2 overflow-x-auto py-2 px-4 bg-muted/30 rounded-lg">
              {generateVariation(activeVariation).map((scene, idx) => (
                <div key={scene.id} className="flex items-center">
                  <SceneBlock 
                    scene={scene} 
                    isReusable={reusableIndices.has(idx)}
                    variationIndex={activeVariation}
                  />
                  {idx < scenes.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                  )}
                </div>
              ))}
            </div>
            
            {/* Scene details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-1 mb-1">
                  <Lock className="w-3 h-3 text-primary" />
                  <span className="font-medium text-primary">Reusable Scenes</span>
                </div>
                <p className="text-muted-foreground">
                  These {reusableCount} scenes are identical across all {variationCount} video variations
                </p>
              </div>
              <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <Shuffle className="w-3 h-3 text-blue-500" />
                  <span className="font-medium text-blue-500">Variable Scenes</span>
                </div>
                <p className="text-muted-foreground">
                  These {specificCount} scenes can differ per video based on script content
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
