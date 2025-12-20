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
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  ArrowRight,
  Settings2,
  Brain,
  Image as ImageIcon,
  Zap,
  DollarSign,
  Crown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LocalAssetUploader, LocalAsset } from './LocalAssetUploader';
import { useAIBrain } from '@/hooks/useAIBrain';

export interface SmartScene {
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
  productImageUrl?: string;
  error?: string;
}

interface SmartSceneBuilderProps {
  projectId: string;
  scriptId?: string;
  scenes: SmartScene[];
  onScenesChange: (scenes: SmartScene[]) => void;
  onProceedToAssembly: () => void;
  videosToGenerate: number;
  onVideosToGenerateChange: (count: number) => void;
  productImages?: string[];
}

// Video types for selection
const VIDEO_TYPES = [
  { id: 'auto', label: 'Auto (AI Chooses)', icon: '🤖', description: 'AI selects optimal type' },
  { id: 'ugc', label: 'UGC Review', icon: '📱', description: 'User-generated style' },
  { id: 'testimonial', label: 'Testimonial', icon: '💬', description: 'Customer testimonials' },
  { id: 'before_after', label: 'Before/After', icon: '🔄', description: 'Transformation videos' },
  { id: 'unboxing', label: 'Unboxing', icon: '📦', description: 'Product unboxing' },
  { id: 'social_proof', label: 'Social Proof', icon: '⭐', description: 'Reviews & ratings' },
  { id: 'day_in_life', label: 'Day in the Life', icon: '🌅', description: 'Lifestyle content' },
  { id: 'pas', label: 'Problem-Agitate-Solve', icon: '💡', description: 'PAS formula' },
  { id: 'pov', label: 'POV', icon: '👁️', description: 'Point of view' },
  { id: 'skit', label: 'Skit/Roleplay', icon: '🎭', description: 'Entertainment skits' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎬', description: 'High production' },
  { id: 'trendjacking', label: 'Trendjacking', icon: '📈', description: 'Trending content' },
];

// Engine tier configuration
const ENGINE_TIERS = {
  free: { label: 'Free Tier', icon: Sparkles, color: 'text-green-500', engines: ['nano-banana', 'stability-free'] },
  low: { label: 'Low Cost', icon: DollarSign, color: 'text-blue-500', engines: ['wan-2.5', 'kling-2.5', 'minimax', 'ovi', 'haiper', 'flux-video'] },
  medium: { label: 'Medium', icon: Zap, color: 'text-amber-500', engines: ['veo-3.1', 'runway-gen3', 'luma', 'pika-2.1', 'kling-2.6', 'stable-video'] },
  premium: { label: 'Premium', icon: Crown, color: 'text-purple-500', engines: ['sora-2', 'sora-2-pro', 'omnihuman', 'heygen-premium'] },
  all: { label: 'All (AI Chooses)', icon: Brain, color: 'text-primary', engines: [] },
};

// Engine to video type mapping for AI selection
const VIDEO_TYPE_ENGINE_MAP: Record<string, string[]> = {
  ugc: ['omnihuman', 'stable-video', 'veo-3.1'],
  testimonial: ['omnihuman', 'heygen-premium', 'stable-video'],
  pov: ['omnihuman', 'stable-video', 'veo-3.1'],
  cinematic: ['veo-3.1', 'sora-2', 'kling-2.6', 'runway-gen3'],
  before_after: ['stable-video', 'veo-3.1', 'flux-video'],
  unboxing: ['runway-gen3', 'kling-2.6', 'veo-3.1'],
  social_proof: ['wan-2.5', 'minimax', 'haiper'],
  trendjacking: ['pika-2.1', 'haiper', 'minimax'],
  day_in_life: ['luma', 'stable-video', 'veo-3.1'],
  skit: ['omnihuman', 'heygen-premium', 'luma'],
  pas: ['stable-video', 'veo-3.1', 'runway-gen3'],
};

export function SmartSceneBuilder({
  projectId,
  scriptId,
  scenes,
  onScenesChange,
  onProceedToAssembly,
  videosToGenerate,
  onVideosToGenerateChange,
  productImages = [],
}: SmartSceneBuilderProps) {
  const { selectEngine } = useAIBrain();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Simplified settings
  const [videoType, setVideoType] = useState<string>('auto');
  const [engineTier, setEngineTier] = useState<'free' | 'low' | 'medium' | 'premium' | 'all'>('free');
  
  // Local assets
  const [localAssets, setLocalAssets] = useState<LocalAsset[]>([]);

  // Drag and drop state
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    setDraggedSceneId(sceneId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sceneId);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, sceneId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedSceneId !== sceneId) {
      setDragOverSceneId(sceneId);
    }
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverSceneId(null);
  };

  // Handle drop - reorder scenes
  const handleDrop = (e: React.DragEvent, targetSceneId: string) => {
    e.preventDefault();
    setDragOverSceneId(null);
    
    if (!draggedSceneId || draggedSceneId === targetSceneId) {
      setDraggedSceneId(null);
      return;
    }

    const draggedIndex = scenes.findIndex(s => s.id === draggedSceneId);
    const targetIndex = scenes.findIndex(s => s.id === targetSceneId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newScenes = [...scenes];
    const [draggedScene] = newScenes.splice(draggedIndex, 1);
    newScenes.splice(targetIndex, 0, draggedScene);

    // Re-index all scenes
    onScenesChange(newScenes.map((s, i) => ({ ...s, index: i })));
    setDraggedSceneId(null);
    toast.success('Scene reordered');
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedSceneId(null);
    setDragOverSceneId(null);
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-add product images as scenes
  useEffect(() => {
    if (productImages.length > 0 && scenes.length === 0) {
      const imageScenes: SmartScene[] = productImages.slice(0, 6).map((url, i) => ({
        id: `scene-img-${Date.now()}-${i}`,
        index: i,
        text: `Product showcase ${i + 1}`,
        visualPrompt: 'Animate product with Ken Burns effect, subtle zoom and pan motion',
        duration: 4,
        status: 'pending',
        engine: getEngineForTier(engineTier),
        productImageUrl: url,
        videoType: 'product_showcase',
      }));
      onScenesChange(imageScenes);
    }
  }, [productImages]);

  const loadSettings = async () => {
    // Settings loading simplified - n8n removed
  };

  const getEngineForTier = (tier: string): string => {
    const tierConfig = ENGINE_TIERS[tier as keyof typeof ENGINE_TIERS];
    if (!tierConfig || tierConfig.engines.length === 0) {
      return 'nano-banana'; // Default fallback
    }
    return tierConfig.engines[0];
  };

  const getOptimalEngineForScene = async (scene: SmartScene): Promise<string> => {
    // If specific video type is set, use video type engine mapping
    const sceneVideoType = scene.videoType || videoType;
    
    if (sceneVideoType && sceneVideoType !== 'auto') {
      const preferredEngines = VIDEO_TYPE_ENGINE_MAP[sceneVideoType] || [];
      const tierEngines = ENGINE_TIERS[engineTier]?.engines || [];
      
      // Find intersection of preferred engines and tier engines
      if (engineTier !== 'all') {
        const available = preferredEngines.filter(e => tierEngines.includes(e));
        if (available.length > 0) return available[0];
        // Fallback to tier default
        return tierEngines[0] || 'nano-banana';
      }
      
      // All tier - use best available from preferred
      return preferredEngines[0] || 'veo-3.1';
    }
    
    // For auto mode, use AI Brain to select
    try {
      const result = await selectEngine({
        project_id: projectId,
        scene_type: scene.creativeType || 'product',
        budget_tier: engineTier,
      }, {
        duration_sec: scene.duration,
        complexity: scene.productImageUrl ? 'image-to-video' : 'text-to-video',
      });
      return result.engine;
    } catch {
      return getEngineForTier(engineTier);
    }
  };

  const addScene = () => {
    const newScene: SmartScene = {
      id: `scene-${Date.now()}`,
      index: scenes.length,
      text: '',
      visualPrompt: '',
      duration: 5,
      status: 'pending',
      engine: getEngineForTier(engineTier),
      videoType: videoType !== 'auto' ? videoType : undefined,
    };
    onScenesChange([...scenes, newScene]);
    setExpandedSceneId(newScene.id);
  };

  const removeScene = (id: string) => {
    const updated = scenes.filter(s => s.id !== id).map((s, i) => ({ ...s, index: i }));
    onScenesChange(updated);
  };

  const updateScene = (id: string, updates: Partial<SmartScene>) => {
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

    setIsGenerating(true);
    setProgress(0);

    const pendingScenes = scenes.filter(s => s.status !== 'completed' && !s.localAssetId);
    let completed = 0;

    try {
      for (const scene of pendingScenes) {
        setGeneratingSceneId(scene.id);
        updateScene(scene.id, { status: 'generating' });

        // Get optimal engine
        const engine = await getOptimalEngineForScene(scene);

        try {
          const { data, error } = await supabase.functions.invoke('generate-scene-video', {
            body: {
              sceneId: scene.id,
              engineName: engine,
              prompt: scene.visualPrompt || scene.text,
              imageUrl: scene.productImageUrl,
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
          updateScene(scene.id, { status: 'failed', error: err.message });
        }

        completed++;
        setProgress((completed / pendingScenes.length) * 100);
        
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
      const engine = await getOptimalEngineForScene(scene);

      const { data, error } = await supabase.functions.invoke('generate-scene-video', {
        body: {
          sceneId: scene.id,
          engineName: engine,
          prompt: scene.visualPrompt || scene.text,
          imageUrl: scene.productImageUrl,
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
            AI-guided video generation with automatic engine selection
          </p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Step 5</Badge>
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

      {/* Visual Timeline Preview */}
      {scenes.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" />
              Timeline Preview
            </Label>
            <span className="text-xs text-muted-foreground">
              Total: {totalDuration}s
            </span>
          </div>
          <div className="relative">
            {/* Timeline bar */}
            <div className="flex gap-1 overflow-x-auto pb-2">
              {scenes.map((scene, idx) => {
                const widthPercent = Math.max(8, (scene.duration / Math.max(totalDuration, 1)) * 100);
                return (
                  <div
                    key={scene.id}
                    className={`relative flex-shrink-0 rounded-lg border-2 transition-all cursor-pointer group ${
                      scene.status === 'completed' ? 'border-green-500 bg-green-500/10' :
                      scene.status === 'generating' ? 'border-primary bg-primary/10 animate-pulse' :
                      scene.status === 'failed' ? 'border-destructive bg-destructive/10' :
                      dragOverSceneId === scene.id ? 'border-primary border-dashed bg-primary/20' :
                      'border-border bg-muted/50 hover:border-primary/50'
                    }`}
                    style={{ width: `${Math.max(80, widthPercent * 3)}px`, minWidth: '80px' }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, scene.id)}
                    onDragOver={(e) => handleDragOver(e, scene.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, scene.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setExpandedSceneId(expandedSceneId === scene.id ? null : scene.id)}
                  >
                    {/* Thumbnail */}
                    <div className="h-14 rounded-t overflow-hidden bg-muted">
                      {scene.videoUrl ? (
                        <video src={scene.videoUrl} className="w-full h-full object-cover" muted />
                      ) : scene.productImageUrl ? (
                        <img src={scene.productImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : scene.status === 'generating' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info bar */}
                    <div className="p-1.5 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium">Scene {idx + 1}</span>
                        <span className="text-[10px] text-muted-foreground">{scene.duration}s</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {scene.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />}
                        {scene.status === 'failed' && <AlertCircle className="w-2.5 h-2.5 text-destructive" />}
                        <span className="text-[9px] text-muted-foreground truncate">{scene.engine}</span>
                      </div>
                    </div>

                    {/* Drag indicator */}
                    {draggedSceneId === scene.id && (
                      <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center">
                        <GripVertical className="w-4 h-4 text-primary" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Duration markers */}
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-1">
              <span>0s</span>
              <span>{Math.round(totalDuration / 2)}s</span>
              <span>{totalDuration}s</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <GripVertical className="w-3 h-3" />
            Drag scenes to reorder • Click to expand
          </p>
        </Card>
      )}

      {/* Simplified Controls */}
      <Card className="p-4 bg-card border-border space-y-4">
        {/* Video Type Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Video className="w-4 h-4" />
            Video Type
          </Label>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {VIDEO_TYPES.slice(0, 6).map((type) => (
              <div
                key={type.id}
                onClick={() => setVideoType(type.id)}
                className={`p-2 rounded-lg border cursor-pointer transition-all text-center ${
                  videoType === type.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="text-lg">{type.icon}</span>
                <p className="text-xs font-medium mt-1">{type.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Engine Tier Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Engine Tier
          </Label>
          <div className="grid grid-cols-5 gap-2">
            {(Object.entries(ENGINE_TIERS) as [string, typeof ENGINE_TIERS.free][]).map(([key, tier]) => {
              const Icon = tier.icon;
              return (
                <div
                  key={key}
                  onClick={() => setEngineTier(key as keyof typeof ENGINE_TIERS)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                    engineTier === key
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 mx-auto ${tier.color}`} />
                  <p className="text-xs font-medium mt-1">{tier.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Videos to Generate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
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
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>10</span>
            <span>25</span>
            <span>50</span>
          </div>
        </div>
      </Card>

      {/* Product Images Preview */}
      {productImages && productImages.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Product Images ({productImages.length})
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Auto-assign product images to scenes
                const updatedScenes = scenes.map((scene, idx) => ({
                  ...scene,
                  productImageUrl: productImages[idx % productImages.length] || scene.productImageUrl
                }));
                onScenesChange(updatedScenes);
                toast.success('Product images assigned to scenes');
              }}
              className="text-xs gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Auto-Assign to Scenes
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {productImages.map((imgUrl, idx) => (
              <div 
                key={idx} 
                className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted group cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  // Find first scene without product image and assign
                  const targetScene = scenes.find(s => !s.productImageUrl);
                  if (targetScene) {
                    updateScene(targetScene.id, { productImageUrl: imgUrl });
                    toast.success(`Image assigned to Scene ${targetScene.index + 1}`);
                  } else {
                    toast.info('All scenes already have product images');
                  }
                }}
              >
                <img 
                  src={imgUrl} 
                  alt={`Product ${idx + 1}`} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <Badge 
                  variant="secondary" 
                  className="absolute bottom-0.5 right-0.5 text-[8px] px-1 py-0"
                >
                  {idx + 1}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Click an image to assign it to the next available scene, or use Auto-Assign
          </p>
        </Card>
      )}

      {/* Local Assets */}
      <LocalAssetUploader
        assets={localAssets}
        onAssetsChange={setLocalAssets}
        scenesCount={scenes.length}
        compact
      />

      {/* Advanced Mode Toggle */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Advanced Mode
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Card className="p-4 bg-muted/30 border-border space-y-3">
            <p className="text-xs text-muted-foreground">
              Advanced settings for fine-tuned control over scene generation.
            </p>
          </Card>
        </CollapsibleContent>
      </Collapsible>

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
              <span className="text-sm font-medium">AI is generating scenes...</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Scenes */}
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {scenes.map((scene) => {
              const isExpanded = expandedSceneId === scene.id;
              const isThisGenerating = generatingSceneId === scene.id;
              
              return (
                <div 
                  key={scene.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, scene.id)}
                  onDragOver={(e) => handleDragOver(e, scene.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, scene.id)}
                  onDragEnd={handleDragEnd}
                  className={`rounded-lg border transition-all ${
                    draggedSceneId === scene.id ? 'opacity-50 scale-95' :
                    dragOverSceneId === scene.id ? 'border-primary border-dashed bg-primary/10' :
                    scene.status === 'completed' ? 'border-green-500/30 bg-green-500/5' :
                    scene.status === 'generating' ? 'border-primary/30 bg-primary/5' :
                    scene.status === 'failed' ? 'border-destructive/30 bg-destructive/5' :
                    'border-border bg-muted/30'
                  }`}
                >
                  {/* Scene Header */}
                  <div className="flex items-center gap-3 p-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    
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
                      ) : scene.productImageUrl ? (
                        <img src={scene.productImageUrl} alt="" className="w-full h-full object-cover" />
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
                          {scene.engine}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{scene.duration}s</span>
                        {scene.productImageUrl && (
                          <Badge variant="secondary" className="text-[10px]">
                            <ImageIcon className="w-2 h-2 mr-1" />
                            Product
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
                              <Label className="text-xs">Duration (sec)</Label>
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
                          <div className="space-y-1">
                            <Label className="text-xs">Product Image</Label>
                            <div className="flex gap-2">
                              <Input
                                value={scene.productImageUrl || ''}
                                onChange={(e) => updateScene(scene.id, { productImageUrl: e.target.value })}
                                placeholder="https://..."
                                className="h-8 text-xs bg-background flex-1"
                              />
                              {scene.productImageUrl && (
                                <div className="w-8 h-8 rounded border border-border overflow-hidden flex-shrink-0">
                                  <img 
                                    src={scene.productImageUrl} 
                                    alt="Preview" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            {/* Quick select from product images */}
                            {productImages && productImages.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {productImages.slice(0, 4).map((imgUrl, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => updateScene(scene.id, { productImageUrl: imgUrl })}
                                    className={`w-6 h-6 rounded border overflow-hidden transition-all ${
                                      scene.productImageUrl === imgUrl 
                                        ? 'border-primary ring-1 ring-primary' 
                                        : 'border-border hover:border-primary/50'
                                    }`}
                                  >
                                    <img 
                                      src={imgUrl} 
                                      alt={`Option ${i + 1}`} 
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                                {scene.productImageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => updateScene(scene.id, { productImageUrl: undefined })}
                                    className="w-6 h-6 rounded border border-border hover:border-destructive flex items-center justify-center text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
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
                <p>No scenes yet. Add scenes or upload product images.</p>
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
