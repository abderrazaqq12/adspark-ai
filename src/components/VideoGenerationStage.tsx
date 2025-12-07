import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Video, 
  Play, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Eye,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EngineTierBadge from "@/components/EngineTierBadge";
import VideoPreviewPlayer from "@/components/VideoPreviewPlayer";

interface Scene {
  id: string;
  index: number;
  text: string;
  scene_type: string | null;
  visual_prompt: string | null;
  engine_name: string | null;
  engine_id: string | null;
  status: string;
  video_url: string | null;
  duration_sec: number;
  quality_score?: number;
  retry_count?: number;
}

interface Engine {
  id: string;
  name: string;
  type: string;
  status: string;
  cost_tier: string;
}

interface VideoGenerationStageProps {
  scenes?: Scene[];
  engines?: Engine[];
  onScenesUpdate?: (scenes: Scene[]) => void;
  projectId?: string | null;
  scriptId?: string | null;
  onComplete?: () => void;
}

export default function VideoGenerationStage({ 
  scenes: propScenes, 
  engines: propEngines, 
  onScenesUpdate,
  projectId,
  scriptId,
  onComplete
}: VideoGenerationStageProps) {
  const [scenes, setScenes] = useState<Scene[]>(propScenes || []);
  const [engines, setEngines] = useState<Engine[]>(propEngines || []);
  const [generatingScenes, setGeneratingScenes] = useState<Set<string>>(new Set());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [previewScene, setPreviewScene] = useState<Scene | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync with props
  useEffect(() => {
    if (propScenes) setScenes(propScenes);
  }, [propScenes]);

  useEffect(() => {
    if (propEngines) setEngines(propEngines);
  }, [propEngines]);

  // Load scenes and engines if scriptId is provided
  useEffect(() => {
    if (scriptId && !propScenes) {
      loadScenes();
    }
    if (!propEngines) {
      loadEngines();
    }
  }, [scriptId]);

  const loadScenes = async () => {
    if (!scriptId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('script_id', scriptId)
        .order('index');

      if (error) throw error;
      setScenes(data || []);
    } catch (error) {
      console.error('Error loading scenes:', error);
      toast.error('Failed to load scenes');
    } finally {
      setLoading(false);
    }
  };

  const loadEngines = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_engines')
        .select('*')
        .eq('status', 'active')
        .order('priority_score', { ascending: false });

      if (error) throw error;
      setEngines(data || []);
    } catch (error) {
      console.error('Error loading engines:', error);
    }
  };

  // Update scenes helper
  const updateScenes = (newScenes: Scene[]) => {
    setScenes(newScenes);
    onScenesUpdate?.(newScenes);
  };

  // Subscribe to realtime scene updates
  useEffect(() => {
    if (!scriptId && !projectId) return;

    const channel = supabase
      .channel('scenes-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scenes'
        },
        (payload) => {
          const updatedScene = payload.new as Scene;
          updateScenes(scenes.map(s => 
            s.id === updatedScene.id ? { ...s, ...updatedScene } : s
          ));

          if (updatedScene.status === 'completed') {
            toast.success(`Scene ${updatedScene.index + 1} generated!`);
            setGeneratingScenes(prev => {
              const next = new Set(prev);
              next.delete(updatedScene.id);
              return next;
            });
          } else if (updatedScene.status === 'failed') {
            toast.error(`Scene ${updatedScene.index + 1} failed`);
            setGeneratingScenes(prev => {
              const next = new Set(prev);
              next.delete(updatedScene.id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, scriptId, scenes]);

  const generateScene = async (scene: Scene) => {
    setGeneratingScenes(prev => new Set(prev).add(scene.id));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-scene-video', {
        body: {
          sceneId: scene.id,
          engineName: scene.engine_name,
          prompt: scene.visual_prompt || scene.text,
        },
      });

      if (error) throw error;

      if (data.videoUrl) {
        updateScenes(scenes.map(s => 
          s.id === scene.id ? { ...s, video_url: data.videoUrl, status: 'completed' } : s
        ));
        toast.success('Scene video generated!');
      } else if (data.taskId) {
        toast.info('Video generation started. Check back soon.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate scene');
      setGeneratingScenes(prev => {
        const next = new Set(prev);
        next.delete(scene.id);
        return next;
      });
    }
  };

  const generateAllScenes = async () => {
    const pendingScenes = scenes.filter(s => s.status === 'pending' || s.status === 'failed');
    
    if (pendingScenes.length === 0) {
      toast.info('All scenes already generated');
      return;
    }

    setIsGeneratingAll(true);

    // First, smart route all scenes
    try {
      await supabase.functions.invoke('smart-route-engine', {
        body: { sceneIds: pendingScenes.map(s => s.id), optimizeFor: 'balanced' }
      });
    } catch (e) {
      console.error('Smart routing failed:', e);
    }

    // Generate scenes in batches of 3
    const batchSize = 3;
    for (let i = 0; i < pendingScenes.length; i += batchSize) {
      const batch = pendingScenes.slice(i, i + batchSize);
      await Promise.all(batch.map(scene => generateScene(scene)));
      
      // Small delay between batches
      if (i + batchSize < pendingScenes.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsGeneratingAll(false);
  };

  const updateSceneEngine = async (sceneId: string, engineId: string) => {
    const engine = engines.find(e => e.id === engineId);
    if (!engine) return;

    try {
      await supabase
        .from('scenes')
        .update({ engine_id: engineId, engine_name: engine.name })
        .eq('id', sceneId);

      updateScenes(scenes.map(s => 
        s.id === sceneId ? { ...s, engine_id: engineId, engine_name: engine.name } : s
      ));
    } catch (error) {
      toast.error('Failed to update engine');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'generating': return <Loader2 className="w-4 h-4 text-secondary animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <Video className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const completedCount = useMemo(() => scenes.filter(s => s.status === 'completed').length, [scenes]);
  const progressPercent = scenes.length > 0 ? (completedCount / scenes.length) * 100 : 0;

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (scenes.length === 0) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="text-center py-12 text-muted-foreground">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No scenes available. Please create scenes in the Scene Builder first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          Step 3: Video Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header with Progress */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">🎬 Scene Videos</h3>
            <p className="text-sm text-muted-foreground">
              {completedCount}/{scenes.length} scenes completed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const failedScenes = scenes.filter(s => s.status === 'failed');
                failedScenes.forEach(scene => generateScene(scene));
              }}
              disabled={!scenes.some(s => s.status === 'failed')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Failed
            </Button>
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={generateAllScenes}
              disabled={isGeneratingAll || generatingScenes.size > 0}
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate All Videos
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedCount} completed</span>
            <span>{scenes.filter(s => s.status === 'generating').length} generating</span>
            <span>{scenes.filter(s => s.status === 'failed').length} failed</span>
          </div>
        </div>

        {/* Scene Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenes.map((scene, index) => (
            <Card 
              key={scene.id} 
              className={`bg-muted/30 border-border transition-all ${
                scene.status === 'completed' ? 'border-primary/30' : 
                scene.status === 'failed' ? 'border-destructive/30' : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <Badge variant="outline" className="border-border text-xs">
                      {scene.scene_type || 'Scene'}
                    </Badge>
                  </div>
                  {getStatusIcon(scene.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Video Preview */}
                <div 
                  className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden relative group cursor-pointer"
                  onClick={() => scene.video_url && setPreviewScene(scene)}
                >
                  {scene.video_url ? (
                    <>
                      <video 
                        src={scene.video_url} 
                        className="w-full h-full object-cover"
                        muted
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : scene.status === 'generating' || generatingScenes.has(scene.id) ? (
                    <div className="flex flex-col items-center gap-2 text-secondary">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-xs">Generating...</span>
                    </div>
                  ) : (
                    <Video className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>

                {/* Scene Text */}
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {scene.text}
                </p>

                {/* Engine Selection */}
                <div className="flex items-center gap-2">
                  <Select
                    value={scene.engine_id || ''}
                    onValueChange={(value) => updateSceneEngine(scene.id, value)}
                  >
                    <SelectTrigger className="flex-1 h-8 text-xs bg-muted/50 border-border">
                      <SelectValue placeholder="Select engine" />
                    </SelectTrigger>
                    <SelectContent>
                      {engines.map((engine) => (
                        <SelectItem key={engine.id} value={engine.id}>
                          <div className="flex items-center gap-2">
                            <span>{engine.name}</span>
                            <EngineTierBadge tier={engine.cost_tier} size="sm" />
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {scene.status !== 'generating' && !generatingScenes.has(scene.id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => generateScene(scene)}
                      title={scene.status === 'completed' ? 'Regenerate' : 'Generate'}
                    >
                      {scene.status === 'completed' ? (
                        <RefreshCw className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Quality Score */}
                {scene.quality_score && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Quality:</span>
                    <Badge 
                      variant="outline" 
                      className={`${
                        scene.quality_score >= 8 ? 'border-primary text-primary' :
                        scene.quality_score >= 5 ? 'border-secondary text-secondary' :
                        'border-destructive text-destructive'
                      }`}
                    >
                      {scene.quality_score}/10
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Next Step Button */}
        {completedCount === scenes.length && scenes.length > 0 && onComplete && (
          <Button
            onClick={onComplete}
            className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
          >
            <ChevronRight className="w-4 h-4 mr-2" />
            Next: Assembly & Export
          </Button>
        )}

        {/* Video Preview Modal */}
        {previewScene && previewScene.video_url && (
          <VideoPreviewPlayer
            open={!!previewScene}
            onOpenChange={(open) => !open && setPreviewScene(null)}
            videoUrl={previewScene.video_url}
            title={`Scene ${previewScene.index + 1}`}
            sceneIndex={previewScene.index}
            engineName={previewScene.engine_name || undefined}
          />
        )}
      </CardContent>
    </Card>
  );
}
