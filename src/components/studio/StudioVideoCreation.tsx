import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowRight, 
  Loader2, 
  Video, 
  Sparkles,
  Play,
  Upload,
  Plus,
  Trash2,
  GripVertical,
  RefreshCw,
  Clock,
  Film
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudioVideoCreationProps {
  onNext: () => void;
}

interface Scene {
  id: string;
  index: number;
  text: string;
  visualPrompt: string;
  videoUrl: string | null;
  duration: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  engine: string;
}

const videoEngines = [
  { id: 'runway', name: 'Runway Gen-3', tier: 'premium' },
  { id: 'pika', name: 'Pika 2.1', tier: 'standard' },
  { id: 'kling', name: 'Kling AI', tier: 'standard' },
  { id: 'hailuo', name: 'Hailuo', tier: 'budget' },
  { id: 'nano-banana', name: 'NanoBanana', tier: 'free' },
  { id: 'heygen', name: 'HeyGen', tier: 'premium' },
  { id: 'luma', name: 'Luma Dream Machine', tier: 'standard' },
];

export const StudioVideoCreation = ({ onNext }: StudioVideoCreationProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [maxDuration, setMaxDuration] = useState('30');
  const [addSubtitles, setAddSubtitles] = useState(true);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [defaultEngine, setDefaultEngine] = useState('nano-banana');

  useEffect(() => {
    // Initialize with sample scenes
    setScenes([
      { id: '1', index: 1, text: 'Hook scene', visualPrompt: 'Eye-catching product reveal', videoUrl: null, duration: 3, status: 'pending', engine: 'nano-banana' },
      { id: '2', index: 2, text: 'Problem scene', visualPrompt: 'Show the problem being solved', videoUrl: null, duration: 5, status: 'pending', engine: 'nano-banana' },
      { id: '3', index: 3, text: 'Solution scene', visualPrompt: 'Product in action', videoUrl: null, duration: 8, status: 'pending', engine: 'nano-banana' },
      { id: '4', index: 4, text: 'Benefits scene', visualPrompt: 'Happy customer using product', videoUrl: null, duration: 7, status: 'pending', engine: 'nano-banana' },
      { id: '5', index: 5, text: 'CTA scene', visualPrompt: 'Call to action with urgency', videoUrl: null, duration: 4, status: 'pending', engine: 'nano-banana' },
    ]);
  }, []);

  const addScene = () => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      index: scenes.length + 1,
      text: '',
      visualPrompt: '',
      videoUrl: null,
      duration: 5,
      status: 'pending',
      engine: defaultEngine,
    };
    setScenes([...scenes, newScene]);
  };

  const removeScene = (id: string) => {
    setScenes(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, index: i + 1 })));
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const generateAllScenes = async () => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Update all to generating
      setScenes(prev => prev.map(s => ({ ...s, status: 'generating' as const })));

      // Generate each scene
      for (const scene of scenes) {
        try {
          const response = await supabase.functions.invoke('generate-scene-video', {
            body: {
              sceneId: scene.id,
              engineName: scene.engine,
              prompt: scene.visualPrompt,
            }
          });

          setScenes(prev => prev.map(s => 
            s.id === scene.id 
              ? { 
                  ...s, 
                  videoUrl: response.data?.videoUrl || null,
                  status: response.error ? 'failed' : 'completed' 
                } 
              : s
          ));
        } catch (error) {
          setScenes(prev => prev.map(s => 
            s.id === scene.id ? { ...s, status: 'failed' } : s
          ));
        }
      }

      toast({
        title: "Video Generation Complete",
        description: `${scenes.length} scenes processed`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate videos",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateScene = async (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;

    setScenes(prev => prev.map(s => 
      s.id === id ? { ...s, status: 'generating' } : s
    ));

    try {
      const response = await supabase.functions.invoke('generate-scene-video', {
        body: {
          sceneId: scene.id,
          engineName: scene.engine,
          prompt: scene.visualPrompt,
        }
      });

      setScenes(prev => prev.map(s => 
        s.id === id 
          ? { 
              ...s, 
              videoUrl: response.data?.videoUrl || s.videoUrl,
              status: response.error ? 'failed' : 'completed' 
            } 
          : s
      ));
    } catch (error) {
      setScenes(prev => prev.map(s => 
        s.id === id ? { ...s, status: 'failed' } : s
      ));
    }
  };

  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
  const completedScenes = scenes.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Video Creation Pipeline</h2>
          <p className="text-muted-foreground text-sm mt-1">Build scenes and generate video content</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Step 6</Badge>
      </div>

      {/* Video Settings */}
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4">Video Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                <SelectItem value="16:9">16:9 (Horizontal)</SelectItem>
                <SelectItem value="1:1">1:1 (Square)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Max Duration</Label>
            <Select value={maxDuration} onValueChange={setMaxDuration}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">60 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Engine</Label>
            <Select value={defaultEngine} onValueChange={setDefaultEngine}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {videoEngines.map((engine) => (
                  <SelectItem key={engine.id} value={engine.id}>
                    {engine.name}
                    <Badge variant="outline" className="ml-2 text-xs capitalize">{engine.tier}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            <div className="flex items-center gap-2 h-10">
              <Checkbox 
                checked={addSubtitles} 
                onCheckedChange={(c) => setAddSubtitles(c as boolean)} 
                id="subtitles"
              />
              <label htmlFor="subtitles" className="text-sm">Add Subtitles</label>
            </div>
          </div>

          <div className="flex items-end">
            <Button onClick={generateAllScenes} disabled={isGenerating} className="w-full gap-2">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate All
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <Film className="w-5 h-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{scenes.length}</p>
              <p className="text-xs text-muted-foreground">Total Scenes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{totalDuration}s</p>
              <p className="text-xs text-muted-foreground">Total Duration</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{completedScenes}/{scenes.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Scene Builder */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Scene Builder</h3>
          <Button variant="outline" onClick={addScene} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Scene
          </Button>
        </div>

        <div className="space-y-4">
          {scenes.map((scene) => (
            <div 
              key={scene.id} 
              className={`p-4 rounded-lg border ${
                scene.status === 'completed' ? 'border-green-500/30 bg-green-500/5' :
                scene.status === 'generating' ? 'border-blue-500/30 bg-blue-500/5' :
                scene.status === 'failed' ? 'border-destructive/30 bg-destructive/5' :
                'border-border bg-muted/30'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-2 pt-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  <span className="text-sm font-medium text-muted-foreground">#{scene.index}</span>
                </div>

                {/* Video Preview */}
                <div className="w-24 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  {scene.status === 'generating' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : scene.videoUrl ? (
                    <video src={scene.videoUrl} className="w-full h-full object-cover rounded" />
                  ) : (
                    <Video className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                {/* Scene Details */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Scene Text</Label>
                    <Input
                      value={scene.text}
                      onChange={(e) => updateScene(scene.id, { text: e.target.value })}
                      placeholder="Scene description..."
                      className="h-8 text-sm bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Visual Prompt</Label>
                    <Input
                      value={scene.visualPrompt}
                      onChange={(e) => updateScene(scene.id, { visualPrompt: e.target.value })}
                      placeholder="Visual description..."
                      className="h-8 text-sm bg-background"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Engine</Label>
                      <Select 
                        value={scene.engine} 
                        onValueChange={(v) => updateScene(scene.id, { engine: v })}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {videoEngines.map((engine) => (
                            <SelectItem key={engine.id} value={engine.id}>{engine.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duration (s)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={scene.duration}
                        onChange={(e) => updateScene(scene.id, { duration: parseInt(e.target.value) || 5 })}
                        className="h-8 text-sm bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => regenerateScene(scene.id)}
                    disabled={scene.status === 'generating'}
                  >
                    <RefreshCw className={`w-4 h-4 ${scene.status === 'generating' ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeScene(scene.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Continue */}
      <div className="flex justify-end">
        <Button onClick={onNext} className="gap-2">
          Continue to Export
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};