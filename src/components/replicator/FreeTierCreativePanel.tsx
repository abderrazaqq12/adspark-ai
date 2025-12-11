// Free-Tier Creative Panel for Creative Replicator
// Displays all free creative capabilities and controls

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Sparkles,
  Wand2,
  Film,
  Palette,
  Music,
  Type,
  Move,
  Scissors,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  DollarSign,
  Brain,
  RefreshCw,
  Image,
  Video,
  Clock,
  TrendingUp,
  Target,
  Lightbulb
} from "lucide-react";
import { useFreeTierCreativeEngine } from "@/hooks/useFreeTierCreativeEngine";
import {
  FFMPEG_TRANSFORMATIONS,
  SYNTHETIC_MOTION_EFFECTS,
  SCENE_RECOMPOSITION_OPTIONS,
  HOOK_REPLACEMENT_STYLES,
  FREE_CREATIVE_PIPELINES,
} from "@/lib/freeTierCreativeEngine";

interface FreeTierCreativePanelProps {
  sourceVideoCount: number;
  requestedVariations: number;
  onConfigChange: (config: any) => void;
  onGenerateFree: () => void;
  isGenerating?: boolean;
}

export const FreeTierCreativePanel = ({
  sourceVideoCount,
  requestedVariations,
  onConfigChange,
  onGenerateFree,
  isGenerating = false
}: FreeTierCreativePanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedTransformations, setSelectedTransformations] = useState<string[]>([
    'smart-cut', 'dynamic-pacing', 'warm-grade', 'subtitles-burn'
  ]);
  const [selectedMotionEffects, setSelectedMotionEffects] = useState<string[]>([
    'parallax-layers', 'slow-push'
  ]);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>(['full-remix']);
  const [selectedHookStyles, setSelectedHookStyles] = useState<string[]>(['zoom-pop', 'flash-intro']);
  const [selectedSceneOptions, setSelectedSceneOptions] = useState<string[]>(['scene-reorder']);
  const [enableAIIntelligence, setEnableAIIntelligence] = useState(true);
  const [prioritizeFree, setPrioritizeFree] = useState(true);

  const { calculateFreeCapacity, marketingAnalysis, isProcessing, progress } = useFreeTierCreativeEngine();

  const freeCapacity = calculateFreeCapacity(sourceVideoCount, requestedVariations);

  const toggleItem = (id: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(id)) {
      setList(list.filter(i => i !== id));
    } else {
      setList([...list, id]);
    }
  };

  // Update parent config when selections change
  const updateConfig = () => {
    onConfigChange({
      enabledTransformations: selectedTransformations,
      enabledMotionEffects: selectedMotionEffects,
      enabledPipelines: selectedPipelines,
      hookReplacements: selectedHookStyles,
      sceneRecomposition: selectedSceneOptions,
      enableAIIntelligence,
      prioritizeFree,
    });
  };

  // Group transformations by category
  const groupedTransformations = FFMPEG_TRANSFORMATIONS.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, typeof FFMPEG_TRANSFORMATIONS>);

  const categoryIcons: Record<string, any> = {
    motion: Move,
    pacing: Clock,
    color: Palette,
    audio: Music,
    composition: Layers,
    overlay: Type,
    transition: Scissors,
  };

  return (
    <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                <span>Free-Tier Creative Engine</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  $0 COST
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {freeCapacity.freeCount} / {requestedVariations} FREE
                </Badge>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Free Capacity Summary */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Free Generation Capacity</span>
                </div>
                <Badge className="bg-green-500 text-white">
                  {freeCapacity.freeCount} FREE Videos
                </Badge>
              </div>
              <Progress 
                value={(freeCapacity.freeCount / requestedVariations) * 100} 
                className="h-2 bg-green-500/20"
              />
              <p className="text-sm text-muted-foreground">{freeCapacity.explanation}</p>
              
              {freeCapacity.paidCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-500">
                  <TrendingUp className="w-4 h-4" />
                  <span>{freeCapacity.paidCount} variations will require premium engines</span>
                </div>
              )}
            </div>

            {/* Main Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <div>
                    <Label className="font-medium">AI Marketing Intelligence</Label>
                    <p className="text-xs text-muted-foreground">Analyze & optimize ads</p>
                  </div>
                </div>
                <Switch 
                  checked={enableAIIntelligence} 
                  onCheckedChange={(v) => { setEnableAIIntelligence(v); updateConfig(); }} 
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <div>
                    <Label className="font-medium">Prioritize Free Tools</Label>
                    <p className="text-xs text-muted-foreground">Use FFMPEG first</p>
                  </div>
                </div>
                <Switch 
                  checked={prioritizeFree} 
                  onCheckedChange={(v) => { setPrioritizeFree(v); updateConfig(); }} 
                />
              </div>
            </div>

            {/* Tabs for Different Capabilities */}
            <Tabs defaultValue="transformations" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="transformations" className="text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />
                  FFMPEG
                </TabsTrigger>
                <TabsTrigger value="motion" className="text-xs">
                  <Move className="w-3 h-3 mr-1" />
                  Motion
                </TabsTrigger>
                <TabsTrigger value="hooks" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Hooks
                </TabsTrigger>
                <TabsTrigger value="scenes" className="text-xs">
                  <Layers className="w-3 h-3 mr-1" />
                  Scenes
                </TabsTrigger>
                <TabsTrigger value="pipelines" className="text-xs">
                  <Target className="w-3 h-3 mr-1" />
                  Pipelines
                </TabsTrigger>
              </TabsList>

              {/* FFMPEG Transformations */}
              <TabsContent value="transformations" className="space-y-4">
                <ScrollArea className="h-64">
                  <div className="space-y-4 pr-4">
                    {Object.entries(groupedTransformations).map(([category, transforms]) => {
                      const Icon = categoryIcons[category] || Wand2;
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium capitalize">{category}</span>
                            <Badge variant="secondary" className="text-xs">
                              {transforms.filter(t => selectedTransformations.includes(t.id)).length}/{transforms.length}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {transforms.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => {
                                  toggleItem(t.id, selectedTransformations, setSelectedTransformations);
                                  updateConfig();
                                }}
                                className={`p-2 rounded-lg text-left text-xs transition-all ${
                                  selectedTransformations.includes(t.id)
                                    ? "bg-green-500/20 border-green-500/50 border"
                                    : "bg-accent/30 border border-transparent hover:border-border"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{t.name}</span>
                                  {selectedTransformations.includes(t.id) && (
                                    <Check className="w-3 h-3 text-green-500" />
                                  )}
                                </div>
                                <p className="text-muted-foreground mt-1">{t.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Synthetic Motion Effects */}
              <TabsContent value="motion" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Transform static images into animated scenes without video generation AI
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {SYNTHETIC_MOTION_EFFECTS.map((effect) => (
                    <button
                      key={effect.id}
                      onClick={() => {
                        toggleItem(effect.id, selectedMotionEffects, setSelectedMotionEffects);
                        updateConfig();
                      }}
                      className={`p-3 rounded-lg text-left transition-all ${
                        selectedMotionEffects.includes(effect.id)
                          ? "bg-green-500/20 border-green-500/50 border"
                          : "bg-accent/30 border border-transparent hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{effect.name}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {effect.intensity}
                          </Badge>
                          {selectedMotionEffects.includes(effect.id) && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{effect.description}</p>
                      <Badge variant="secondary" className="mt-2 text-[10px]">
                        {effect.type}
                      </Badge>
                    </button>
                  ))}
                </div>
              </TabsContent>

              {/* Hook Replacement Styles */}
              <TabsContent value="hooks" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate new hook intros using free motion effects and overlays
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {HOOK_REPLACEMENT_STYLES.map((hook) => (
                    <button
                      key={hook.id}
                      onClick={() => {
                        toggleItem(hook.id, selectedHookStyles, setSelectedHookStyles);
                        updateConfig();
                      }}
                      className={`p-3 rounded-lg text-left transition-all ${
                        selectedHookStyles.includes(hook.id)
                          ? "bg-green-500/20 border-green-500/50 border"
                          : "bg-accent/30 border border-transparent hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{hook.name}</span>
                        {selectedHookStyles.includes(hook.id) && (
                          <Check className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{hook.visualEffect}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {hook.emotionalTone}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{hook.duration}s</span>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              {/* Scene Recomposition */}
              <TabsContent value="scenes" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Recompose scenes to create new narratives without new footage
                </p>
                <div className="space-y-2">
                  {SCENE_RECOMPOSITION_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        toggleItem(option.id, selectedSceneOptions, setSelectedSceneOptions);
                        updateConfig();
                      }}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedSceneOptions.includes(option.id)
                          ? "bg-green-500/20 border-green-500/50 border"
                          : "bg-accent/30 border border-transparent hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{option.name}</span>
                          <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {option.strategy}
                          </Badge>
                          {selectedSceneOptions.includes(option.id) && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              {/* Creative Pipelines */}
              <TabsContent value="pipelines" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pre-configured pipelines for different variation goals
                </p>
                <div className="space-y-2">
                  {FREE_CREATIVE_PIPELINES.map((pipeline) => (
                    <button
                      key={pipeline.id}
                      onClick={() => {
                        toggleItem(pipeline.id, selectedPipelines, setSelectedPipelines);
                        updateConfig();
                      }}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedPipelines.includes(pipeline.id)
                          ? "bg-green-500/20 border-green-500/50 border"
                          : "bg-accent/30 border border-transparent hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{pipeline.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                            $0.00
                          </Badge>
                          {selectedPipelines.includes(pipeline.id) && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pipeline.steps.map((step) => (
                          <Badge key={step} variant="secondary" className="text-[10px]">
                            {step}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Generate Button */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500 text-white">
                    <DollarSign className="w-3 h-3 mr-1" />
                    $0.00 Estimated Cost
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTransformations.length} transforms • {selectedMotionEffects.length} effects • {selectedPipelines.length} pipelines
                </p>
              </div>

              <Button
                onClick={onGenerateFree}
                disabled={isGenerating || isProcessing}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {isGenerating || isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating... {progress}%
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate {freeCapacity.freeCount} FREE
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default FreeTierCreativePanel;
