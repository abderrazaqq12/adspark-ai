import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Wand2, 
  Video, 
  Plus, 
  Trash2, 
  GripVertical, 
  RefreshCw, 
  Upload,
  Play,
  Loader2,
  Sparkles,
  Film,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoEngineTierSelector, VIDEO_ENGINES } from './VideoEngineTierSelector';
import { LocalAssetUploader, LocalAsset } from './LocalAssetUploader';
import { videoTypes } from '@/data/aiModels';

export interface UnifiedScene {
  id: string;
  index: number;
  text: string;
  visualPrompt: string;
  hookType?: string;
  videoType?: string;
  creativeType?: string;
  duration: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  engine: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  localAssetId?: string;
  error?: string;
}

interface UnifiedSceneBuilderProps {
  projectId: string;
  scriptId?: string;
  scenes: UnifiedScene[];
  onScenesChange: (scenes: UnifiedScene[]) => void;
  onProceedToAssembly: () => void;
  videosToGenerate: number;
  onVideosToGenerateChange: (count: number) => void;
}

const HOOK_TYPES = [
  { id: 'question', label: 'Question Hook', icon: '❓' },
  { id: 'statistic', label: 'Statistic Hook', icon: '📊' },
  { id: 'problem', label: 'Problem Hook', icon: '😰' },
  { id: 'story', label: 'Story Hook', icon: '📖' },
  { id: 'shock', label: 'Shock/Curiosity', icon: '⚡' },
  { id: 'humor', label: 'Humor Hook', icon: '😂' },
  { id: 'cta', label: 'Direct CTA', icon: '🎯' },
];

const CREATIVE_TYPES = [
  { id: 'pov', label: 'POV (Point of View)' },
  { id: 'skit', label: 'Skit/Roleplay' },
  { id: 'interactive', label: 'Interactive Ad' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'influencer', label: 'Influencer Style' },
  { id: 'ugc', label: 'UGC Style' },
  { id: 'testimonial', label: 'Testimonial' },
  { id: 'unboxing', label: 'Unboxing' },
  { id: 'before_after', label: 'Before/After' },
];

export function UnifiedSceneBuilder({
  projectId,
  scriptId,
  scenes,
  onScenesChange,
  onProceedToAssembly,
  videosToGenerate,
  onVideosToGenerateChange,
}: UnifiedSceneBuilderProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);
  
  // Engine selection state
  const [selectedTier, setSelectedTier] = useState<'free' | 'low' | 'medium' | 'premium' | 'all'>('free');
  const [selectedEngines, setSelectedEngines] = useState<string[]>(['nano-banana']);
  const [randomizeEngines, setRandomizeEngines] = useState(true);
  
  // Local assets
  const [localAssets, setLocalAssets] = useState<LocalAsset[]>([]);

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Settings loading simplified - n8n removed
  };

  const addScene = () => {
    const newScene: UnifiedScene = {
      id: `scene-${Date.now()}`,
      index: scenes.length,
      text: '',
      visualPrompt: '',
      duration: 5,
      status: 'pending',
      engine: selectedEngines[0] || 'nano-banana',
    };
    onScenesChange([...scenes, newScene]);
    setExpandedSceneId(newScene.id);
  };

  const removeScene = (id: string) => {
    const updatedScenes = scenes
      .filter(s => s.id !== id)
      .map((s, i) => ({ ...s, index: i }));
    onScenesChange(updatedScenes);
  };

  const updateScene = (id: string, updates: Partial<UnifiedScene>) => {
    onScenesChange(scenes.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const moveScene = (id: string, direction: 'up' | 'down') => {
    const index = scenes.findIndex(s => s.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === scenes.length - 1)) return;
    
    const newScenes = [...scenes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newScenes[index], newScenes[targetIndex]] = [newScenes[targetIndex], newScenes[index]];
    
    onScenesChange(newScenes.map((s, i) => ({ ...s, index: i })));
  };

  const generateAllScenes = async () => {
    if (scenes.length === 0) {
      toast.error('Add at least one scene first');
      return;
    }

    if (selectedEngines.length === 0) {
      toast.error('Select at least one engine');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    const pendingScenes = scenes.filter(s => s.status !== 'completed' && !s.localAssetId);
    let completed = 0;

    try {
      for (const scene of pendingScenes) {
        setGeneratingSceneId(scene.id);
        updateScene(scene.id, { status: 'generating' });

        // Select engine (randomize if enabled)
        const engine = randomizeEngines && selectedEngines.length > 1
          ? selectedEngines[Math.floor(Math.random() * selectedEngines.length)]
          : selectedEngines[0];

        try {
          const { data, error } = await supabase.functions.invoke('generate-scene-video', {
            body: {
              sceneId: scene.id,
              engineName: engine,
              prompt: scene.visualPrompt || scene.text,
            },
          });

          if (error) throw error;

          updateScene(scene.id, { 
            status: data?.error ? 'failed' : 'completed',
            videoUrl: data?.videoUrl,
            engine,
            error: data?.error,
          });
        } catch (err: any) {
          updateScene(scene.id, { 
            status: 'failed', 
            error: err.message 
          });
        }

        completed++;
        setProgress((completed / pendingScenes.length) * 100);
        
        // Small delay between requests
        if (completed < pendingScenes.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const successCount = scenes.filter(s => s.status === 'completed').length;
      toast.success(`Generated ${successCount}/${scenes.length} scene videos`);
    } catch (error: any) {
      toast.error(error.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
      setGeneratingSceneId(null);
    }
  };

  const regenerateScene = async (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;

    setGeneratingSceneId(id);
    updateScene(id, { status: 'generating' });

    try {
      const engine = randomizeEngines && selectedEngines.length > 1
        ? selectedEngines[Math.floor(Math.random() * selectedEngines.length)]
        : selectedEngines[0] || 'nano-banana';

      const { data, error } = await supabase.functions.invoke('generate-scene-video', {
        body: {
          sceneId: scene.id,
          engineName: engine,
          prompt: scene.visualPrompt || scene.text,
        },
      });

      if (error) throw error;

      updateScene(id, { 
        status: data?.error ? 'failed' : 'completed',
        videoUrl: data?.videoUrl,
        engine,
        error: data?.error,
      });

      toast.success('Scene regenerated');
    } catch (err: any) {
      updateScene(id, { status: 'failed', error: err.message });
      toast.error('Regeneration failed');
    } finally {
      setGeneratingSceneId(null);
    }
  };

  const attachLocalAsset = (sceneId: string, assetId: string | undefined) => {
    const asset = localAssets.find(a => a.id === assetId);
    updateScene(sceneId, { 
      localAssetId: assetId,
      videoUrl: asset?.url,
      status: assetId ? 'completed' : 'pending',
    });
  };

  const completedScenes = scenes.filter(s => s.status === 'completed').length;
  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
  const canProceed = completedScenes >= Math.ceil(scenes.length * 0.5); // At least 50% complete

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Scene Builder & Video Generation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Build scenes, select engines, and generate videos in one unified workflow
          </p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Step 5-6</Badge>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
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
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-lg font-bold">{completedScenes}/{scenes.length}</p>
              <p className="text-xs text-muted-foreground">Complete</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-lg font-bold">{videosToGenerate}</p>
              <p className="text-xs text-muted-foreground">Videos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Number of Videos Slider */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <Label className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Videos to Generate
          </Label>
          <Badge variant="secondary">{videosToGenerate}</Badge>
        </div>
        <Slider
          value={[videosToGenerate]}
          onValueChange={([v]) => onVideosToGenerateChange(v)}
          min={1}
          max={50}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>1</span>
          <span>10</span>
          <span>25</span>
          <span>50</span>
        </div>
      </Card>

      {/* Engine Selection */}
      <Card className="p-4 bg-card border-border">
        <VideoEngineTierSelector
          selectedTier={selectedTier}
          onTierChange={setSelectedTier}
          selectedEngines={selectedEngines}
          onEnginesChange={setSelectedEngines}
          randomizeEngines={randomizeEngines}
          onRandomizeEnginesChange={setRandomizeEngines}
        />
      </Card>

      {/* Local Assets */}
      <LocalAssetUploader
        assets={localAssets}
        onAssetsChange={setLocalAssets}
        scenesCount={scenes.length}
        compact
      />

      {/* Scene List */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-medium">Scenes</Label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addScene} className="gap-1">
              <Plus className="w-4 h-4" />
              Add Scene
            </Button>
            <Button 
              onClick={generateAllScenes} 
              disabled={isGenerating || scenes.length === 0}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate All
            </Button>
          </div>
        </div>

        {/* Generation Progress */}
        {isGenerating && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Generating scenes...</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Scenes */}
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {scenes.map((scene) => {
              const isExpanded = expandedSceneId === scene.id;
              const isThisGenerating = generatingSceneId === scene.id;
              
              return (
                <div 
                  key={scene.id}
                  className={`rounded-lg border transition-all ${
                    scene.status === 'completed' ? 'border-green-500/30 bg-green-500/5' :
                    scene.status === 'generating' ? 'border-primary/30 bg-primary/5' :
                    scene.status === 'failed' ? 'border-destructive/30 bg-destructive/5' :
                    'border-border bg-muted/30'
                  }`}
                >
                  {/* Scene Header */}
                  <div className="flex items-center gap-3 p-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                    
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => moveScene(scene.id, 'up')}
                        disabled={scene.index === 0}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">{scene.index + 1}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => moveScene(scene.id, 'down')}
                        disabled={scene.index === scenes.length - 1}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Video Preview */}
                    <div className="w-20 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {isThisGenerating ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : scene.videoUrl ? (
                        <video src={scene.videoUrl} className="w-full h-full object-cover" />
                      ) : scene.status === 'failed' ? (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Video className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Quick Info */}
                    <div className="flex-1 min-w-0">
                      <Input
                        value={scene.text}
                        onChange={(e) => updateScene(scene.id, { text: e.target.value })}
                        placeholder="Scene description..."
                        className="h-8 text-sm bg-transparent border-0 p-0 focus-visible:ring-0"
                      />
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {VIDEO_ENGINES.find(e => e.id === scene.engine)?.name || scene.engine}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{scene.duration}s</span>
                        {scene.hookType && (
                          <Badge variant="secondary" className="text-[10px]">
                            {HOOK_TYPES.find(h => h.id === scene.hookType)?.icon}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setExpandedSceneId(isExpanded ? null : scene.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => regenerateScene(scene.id)}
                        disabled={isThisGenerating}
                      >
                        <RefreshCw className={`w-4 h-4 ${isThisGenerating ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => removeScene(scene.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Visual Prompt</Label>
                          <Textarea
                            value={scene.visualPrompt}
                            onChange={(e) => updateScene(scene.id, { visualPrompt: e.target.value })}
                            placeholder="Describe the visual content..."
                            className="text-sm min-h-[60px] bg-background"
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Video Type</Label>
                              <Select 
                                value={scene.videoType || ''} 
                                onValueChange={(v) => updateScene(scene.id, { videoType: v })}
                              >
                                <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {videoTypes.slice(0, 12).map((type) => (
                                    <SelectItem key={type.id} value={type.id} className="text-xs">
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Creative Type</Label>
                              <Select 
                                value={scene.creativeType || ''} 
                                onValueChange={(v) => updateScene(scene.id, { creativeType: v })}
                              >
                                <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {CREATIVE_TYPES.map((type) => (
                                    <SelectItem key={type.id} value={type.id} className="text-xs">
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Hook</Label>
                              <Select 
                                value={scene.hookType || ''} 
                                onValueChange={(v) => updateScene(scene.id, { hookType: v })}
                              >
                                <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {HOOK_TYPES.map((hook) => (
                                    <SelectItem key={hook.id} value={hook.id} className="text-xs">
                                      {hook.icon} {hook.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Duration</Label>
                              <Input
                                type="number"
                                min="1"
                                max="30"
                                value={scene.duration}
                                onChange={(e) => updateScene(scene.id, { duration: parseInt(e.target.value) || 5 })}
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Local Asset</Label>
                              <Select 
                                value={scene.localAssetId || ''} 
                                onValueChange={(v) => attachLocalAsset(scene.id, v || undefined)}
                              >
                                <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">None (Generate)</SelectItem>
                                  {localAssets.filter(a => a.type === 'video' || a.type === 'broll').map((asset) => (
                                    <SelectItem key={asset.id} value={asset.id} className="text-xs">
                                      {asset.name.slice(0, 20)}...
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {scenes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No scenes yet. Add scenes manually or analyze your script.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Proceed Button */}
      <div className="flex justify-end">
        <Button 
          onClick={onProceedToAssembly}
          disabled={scenes.length === 0}
          size="lg"
          className="gap-2"
        >
          Proceed to Assembly
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
