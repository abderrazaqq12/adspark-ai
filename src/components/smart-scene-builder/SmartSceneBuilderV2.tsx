// Smart Scene Builder V2 - Main Component
// AI-driven scene generation with automatic engine selection

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  Sparkles,
  Plus,
  Loader2,
  Film,
  Clock,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Wand2,
  LayoutTemplate,
  Settings2,
  Upload,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSmartSceneBuilder } from '@/hooks/useSmartSceneBuilder';
import { ConfigPanel } from './ConfigPanel';
import { AssetUploader } from './AssetUploader';
import { SceneCard } from './SceneCard';
import { DebugPanel } from './DebugPanel';
import { RealTimeCostEstimator } from './RealTimeCostEstimator';
import { VariationPreview } from './VariationPreview';
import { DistributionPreview } from './DistributionPreview';
import { ProductDataInput } from './ProductDataInput';
import { SmartScenePlan, SceneDuration, SceneStructure, ProductData } from '@/lib/smart-scene-builder/types';

// Script interface for props
interface VideoScriptInput {
  id: string;
  text: string;
  hooks?: string[];
  style?: string;
  language?: string;
}

interface ProductDataInput {
  name: string;
  description?: string;
  imageUrl?: string;
}

interface SmartSceneBuilderV2Props {
  projectId: string;
  scripts?: VideoScriptInput[];
  productData?: ProductDataInput;
  onProceedToAssembly?: (scenePlan: any) => void;
}

const TEMPLATES = [
  { id: 'product_focused', label: 'Product Focus', icon: '📦', description: 'Highlight product features' },
  { id: 'problem_solution', label: 'Problem/Solution', icon: '💡', description: 'PAS framework' },
  { id: 'testimonial', label: 'Testimonial', icon: '💬', description: 'Customer stories' },
  { id: 'unboxing', label: 'Unboxing', icon: '🎁', description: 'First impressions' },
  { id: 'comparison', label: 'Comparison', icon: '⚖️', description: 'vs competitors' },
];

// Step indicator component
function StepIndicator({ step, title, description, isActive, isComplete }: { 
  step: number; 
  title: string; 
  description: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
      <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
        isComplete 
          ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
          : isActive 
            ? 'bg-primary/20 text-primary border border-primary/30' 
            : 'bg-muted text-muted-foreground border border-border'
      }`}>
        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </div>
  );
}

export function SmartSceneBuilderV2({ projectId, scripts = [], productData, onProceedToAssembly }: SmartSceneBuilderV2Props) {
  const {
    config,
    updateConfig,
    assets,
    addAsset,
    removeAsset,
    product,
    setProduct,
    videoScripts,
    updateScripts,
    scriptAnalysis,
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
    generateFromScripts,
    generateFromAITemplate,
    getTemplateRecommendation,
    generateSceneVideo,
    generateAllScenes,
    getScenePlan,
    validate,
    totalDuration,
    totalCost,
    enginesUsed,
    completedCount,
    reusableSceneCount,
    scriptSpecificSceneCount,
  } = useSmartSceneBuilder({ projectId, scripts, productData });
  
  // Get AI recommendation
  const aiRecommendation = getTemplateRecommendation();
  
  // Has scripts from voiceover stage
  const hasScripts = scripts.length > 0 || videoScripts.length > 0;
  
  // Has product data
  const hasProductData = productData?.name || product?.name;
  
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

  // Determine current step based on state
  const hasAssets = assets.length > 0;
  const hasScenes = scenes.length > 0;
  const hasCompletedScenes = completedCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Scene Builder
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

      {/* Step Progress Sidebar (Mobile: horizontal, Desktop: inline) */}
      <Card className="p-4 bg-muted/30 border-border">
        <div className="grid grid-cols-5 gap-4">
          <StepIndicator 
            step={1} 
            title="Visual Context" 
            description="Upload assets (optional)"
            isActive={!hasScenes}
            isComplete={hasAssets}
          />
          <div className="flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <StepIndicator 
            step={2} 
            title="Output Settings" 
            description="Format, duration, budget"
            isActive={!hasScenes}
            isComplete={hasScenes}
          />
          <div className="flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <StepIndicator 
            step={3} 
            title="Scene Construction" 
            description="Build & generate scenes"
            isActive={hasScenes}
            isComplete={hasCompletedScenes}
          />
        </div>
      </Card>

      <div className="space-y-6">
        {/* STEP 1: Visual Context & Product Data */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</div>
            <h3 className="text-sm font-semibold">Visual Context & Product Data</h3>
            <Badge variant="secondary" className="text-xs">Optional</Badge>
          </div>
          
          {/* Product Data Input */}
          <ProductDataInput
            productData={productData ? {
              name: productData.name,
              description: productData.description,
              imageUrl: productData.imageUrl,
            } : product}
            onProductDataChange={setProduct}
            isFromProductInput={!!productData?.name}
          />
          
          {/* Asset Uploader */}
          <div className="mt-4">
            <AssetUploader
              assets={assets}
              onAddAsset={addAsset}
              onRemoveAsset={removeAsset}
              onGenerateScenes={generateFromAssets}
            />
          </div>
        </section>

        <Separator />

        {/* STEP 2: Output Constraints */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</div>
            <h3 className="text-sm font-semibold">Output Settings & Engine Strategy</h3>
          </div>
          <ConfigPanel config={config} onConfigChange={updateConfig} />
          
          {/* Real-Time Cost Estimator */}
          <div className="mt-4">
            <RealTimeCostEstimator 
              scenes={scenes} 
              config={config} 
              assets={assets} 
            />
          </div>
          
          {/* Distribution Preview - Show before generation */}
          {scenes.length === 0 && (
            <div className="mt-4">
              <DistributionPreview 
                config={config}
                productName={product?.name || productData?.name}
                scriptsCount={scripts.length || videoScripts.length}
              />
            </div>
          )}
        </section>

        <Separator />

        {/* STEP 3: Scene Construction */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</div>
            <h3 className="text-sm font-semibold">Scene Construction</h3>
          </div>
          
          {/* Script-based generation (when scripts are available but no scenes) */}
          {scenes.length === 0 && hasScripts && (
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Generate from Video Scripts</h4>
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                AI will analyze your {scripts.length || videoScripts.length} video script{(scripts.length || videoScripts.length) > 1 ? 's' : ''} to identify:
              </p>
              <ul className="text-xs text-muted-foreground mb-4 space-y-1 ml-4">
                <li>• <span className="text-primary font-medium">Reusable scenes</span> that work across all video variations</li>
                <li>• <span className="text-blue-500 font-medium">Script-specific scenes</span> unique to each video</li>
                <li>• <span className="text-green-500 font-medium">Scaled scenes</span> using your uploaded assets</li>
              </ul>
              <Button onClick={generateFromScripts} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Scenes from Scripts
              </Button>
            </Card>
          )}
          
          {/* Script analysis summary (when scenes generated from scripts) */}
          {scriptAnalysis && scenes.length > 0 && (
            <Card className="p-3 bg-muted/30 border-border mb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">
                      {reusableSceneCount} reusable
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-muted-foreground">
                      {scriptSpecificSceneCount} script-specific
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">
                      ×{scriptAnalysis.scalingFactor} scaling factor
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  AI Analyzed
                </Badge>
              </div>
            </Card>
          )}
          
          {/* AI Template Recommendation (when no scenes) */}
          {scenes.length === 0 && !hasScripts && (
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">AI Scene Generator</h4>
                <Badge variant="secondary" className="text-xs">Smart</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                AI recommends scenes based on your product data, video count ({config.videoCount} videos), 
                and duration constraints ({config.minVideoDuration || 20}-{config.maxVideoDuration || 35}s per video).
              </p>
              
              {/* AI Recommendation Card */}
              <Card className="p-3 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Recommended: {aiRecommendation.templateName}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {aiRecommendation.confidence}% match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{aiRecommendation.reason}</p>
                <Button onClick={generateFromAITemplate} className="w-full">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate {aiRecommendation.sceneCount} Scenes for {config.videoCount} Videos
                </Button>
              </Card>
              
              {/* Manual Template Options */}
              <div className="flex items-center gap-2 mb-2">
                <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Or choose manually:</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => generateFromTemplate(template.id)}
                    className={`p-2 rounded-lg border transition-all text-center ${
                      aiRecommendation.templateId === template.id 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <span className="text-lg block">{template.icon}</span>
                    <span className="text-xs font-medium block">{template.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Scene List */}
          {scenes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-semibold text-sm">Scenes</h4>
                  <span className="text-xs text-muted-foreground">
                    (Engine selection happens per-scene based on complexity and cost efficiency)
                  </span>
                </div>
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
              
              {/* Variation Preview - Shows how scenes appear across videos */}
              {scriptAnalysis && (
                <div className="mt-4">
                  <VariationPreview
                    scenes={scenes}
                    scriptAnalysis={scriptAnalysis}
                    scriptsCount={videoScripts.length}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Empty state with assets */}
          {scenes.length === 0 && assets.length > 0 && (
            <Card className="p-6 bg-card border-border text-center">
              <Wand2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                You have {assets.length} asset{assets.length > 1 ? 's' : ''} uploaded. Generate scenes from them or choose a template.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={generateFromAssets}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate from Assets
                </Button>
              </div>
            </Card>
          )}
        </section>

        <Separator />

        {/* Debug Panel - Always visible, contextual */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground">AI Decisions & Debug</h3>
          </div>
          <DebugPanel scenePlan={getScenePlan()} />
        </section>
      </div>

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
