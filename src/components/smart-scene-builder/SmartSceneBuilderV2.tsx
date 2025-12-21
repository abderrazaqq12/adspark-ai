// Smart Scene Builder V2 - Main Component
// AI-driven scene generation with automatic engine selection

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  Sparkles,
  Plus,
  Play,
  Loader2,
  Film,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Wand2,
  LayoutTemplate,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSmartSceneBuilder } from '@/hooks/useSmartSceneBuilder';
import { ConfigPanel } from './ConfigPanel';
import { AssetUploader } from './AssetUploader';
import { SceneCard } from './SceneCard';
import { DebugPanel } from './DebugPanel';
import { SmartScenePlan, SceneDuration, SceneStructure } from '@/lib/smart-scene-builder/types';

interface SmartSceneBuilderV2Props {
  projectId: string;
  onProceedToAssembly?: (scenePlan: any) => void;
}

const TEMPLATES = [
  { id: 'product_focused', label: 'Product Focus', icon: '📦', description: 'Highlight product features' },
  { id: 'problem_solution', label: 'Problem/Solution', icon: '💡', description: 'PAS framework' },
  { id: 'testimonial', label: 'Testimonial', icon: '💬', description: 'Customer stories' },
  { id: 'unboxing', label: 'Unboxing', icon: '🎁', description: 'First impressions' },
  { id: 'comparison', label: 'Comparison', icon: '⚖️', description: 'vs competitors' },
];

export function SmartSceneBuilderV2({ projectId, onProceedToAssembly }: SmartSceneBuilderV2Props) {
  const [activeTab, setActiveTab] = useState('build');
  
  const {
    config,
    updateConfig,
    assets,
    addAsset,
    removeAsset,
    scenes,
    addScene,
    removeScene,
    updateScene,
    updateSceneStructure,
    updateDuration,
    moveScene,
    regenerateEngine,
    isGenerating,
    generatingSceneId,
    generateFromAssets,
    generateFromTemplate,
    generateSceneVideo,
    generateAllScenes,
    getScenePlan,
    validate,
    totalDuration,
    totalCost,
    enginesUsed,
    completedCount,
  } = useSmartSceneBuilder({ projectId });
  
  const handleProceed = () => {
    const validation = validate();
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }
    
    if (validation.warnings.length > 0) {
      toast.warning(validation.warnings[0]);
    }
    
    const scenePlan = getScenePlan();
    onProceedToAssembly?.(scenePlan);
    toast.success('Scene plan ready for assembly');
  };

  const progress = scenes.length > 0 ? (completedCount / scenes.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Smart Scene Builder
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-driven video scenes with automatic engine selection
          </p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">v2.0</Badge>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-primary" />
            <div>
              <p className="text-lg font-bold">{scenes.length}</p>
              <p className="text-xs text-muted-foreground">Scenes</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold">{totalDuration}s</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-lg font-bold">${totalCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Est. Cost</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-lg font-bold">{enginesUsed.length}</p>
              <p className="text-xs text-muted-foreground">Engines</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-lg font-bold">{completedCount}/{scenes.length}</p>
              <p className="text-xs text-muted-foreground">Complete</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress */}
      {scenes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Generation Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="build">
            <Wand2 className="w-4 h-4 mr-2" />
            Build Scenes
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Advanced
          </TabsTrigger>
          <TabsTrigger value="debug">
            <Brain className="w-4 h-4 mr-2" />
            Debug
          </TabsTrigger>
        </TabsList>

        {/* Build Tab */}
        <TabsContent value="build" className="space-y-4">
          {/* Config Panel */}
          <ConfigPanel config={config} onConfigChange={updateConfig} />

          {/* Asset Uploader */}
          <AssetUploader
            assets={assets}
            onAddAsset={addAsset}
            onRemoveAsset={removeAsset}
            onGenerateScenes={generateFromAssets}
          />

          {/* Template Selector (when no scenes) */}
          {scenes.length === 0 && assets.length === 0 && (
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-4">
                <LayoutTemplate className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Quick Start Templates</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => generateFromTemplate(template.id)}
                    className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
                  >
                    <span className="text-2xl block mb-2">{template.icon}</span>
                    <span className="text-sm font-medium block">{template.label}</span>
                    <span className="text-xs text-muted-foreground">{template.description}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Scene List */}
          {scenes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Scenes</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addScene}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Scene
                  </Button>
                  <Button
                    size="sm"
                    onClick={generateAllScenes}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    Generate All
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {scenes.map((scene, index) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      isGenerating={generatingSceneId === scene.id}
                      onUpdate={(updates) => updateScene(scene.id, updates)}
                      onUpdateStructure={(structure) => updateSceneStructure(scene.id, structure)}
                      onUpdateDuration={(duration) => updateDuration(scene.id, duration)}
                      onRegenerate={() => regenerateEngine(scene.id)}
                      onGenerateVideo={() => generateSceneVideo(scene.id)}
                      onRemove={() => removeScene(scene.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card className="p-4 bg-card border-border">
            <h3 className="font-semibold text-sm mb-4">Manual Scene Creation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create custom scenes with full control over structure, duration, and engine selection.
            </p>
            <Button onClick={addScene} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Scene
            </Button>
          </Card>

          {/* Full scene list with more controls */}
          {scenes.length > 0 && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {scenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    isGenerating={generatingSceneId === scene.id}
                    onUpdate={(updates) => updateScene(scene.id, updates)}
                    onUpdateStructure={(structure) => updateSceneStructure(scene.id, structure)}
                    onUpdateDuration={(duration) => updateDuration(scene.id, duration)}
                    onRegenerate={() => regenerateEngine(scene.id)}
                    onGenerateVideo={() => generateSceneVideo(scene.id)}
                    onRemove={() => removeScene(scene.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Debug Tab */}
        <TabsContent value="debug" className="space-y-4">
          <DebugPanel scenePlan={getScenePlan()} />
        </TabsContent>
      </Tabs>

      {/* Proceed Button */}
      {scenes.length > 0 && (
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => toast.info('Scene plan exported to console')}>
            Export JSON
          </Button>
          <Button onClick={handleProceed} disabled={completedCount === 0}>
            Proceed to Assembly
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
