import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Shuffle, 
  Zap, 
  Film, 
  Music, 
  Clock, 
  DollarSign,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoVarietyEngineProps {
  projectId: string;
  scriptId?: string;
  scenesCount: number;
  onComplete?: (variations: any[]) => void;
}

interface VariationConfig {
  totalVariations: number;
  hookStyles: string[];
  pacingOptions: string[];
  transitionStyles: string[];
  musicOptions: string[];
  randomizeSceneOrder: boolean;
  randomizeEngines: boolean;
  optimizeForCost: boolean;
}

const HOOK_STYLES = [
  { id: 'question', label: 'Question Hook', icon: '❓' },
  { id: 'statistic', label: 'Statistic Hook', icon: '📊' },
  { id: 'problem', label: 'Problem Hook', icon: '😰' },
  { id: 'story', label: 'Story Hook', icon: '📖' },
  { id: 'shock', label: 'Shock Hook', icon: '⚡' },
  { id: 'humor', label: 'Humor Hook', icon: '😂' },
];

const PACING_OPTIONS = [
  { id: 'fast', label: 'Fast (TikTok)', duration: 3 },
  { id: 'medium', label: 'Medium (Reels)', duration: 5 },
  { id: 'slow', label: 'Slow (YouTube)', duration: 8 },
  { id: 'dynamic', label: 'Dynamic Mix', duration: 0 },
];

const TRANSITION_STYLES = [
  { id: 'cut', label: 'Hard Cut' },
  { id: 'fade', label: 'Fade' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'slide', label: 'Slide' },
  { id: 'whip', label: 'Whip Pan' },
  { id: 'glitch', label: 'Glitch' },
];

export function VideoVarietyEngine({ 
  projectId, 
  scriptId, 
  scenesCount,
  onComplete 
}: VideoVarietyEngineProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  
  const [config, setConfig] = useState<VariationConfig>({
    totalVariations: 20,
    hookStyles: ['question', 'problem', 'story'],
    pacingOptions: ['fast', 'medium'],
    transitionStyles: ['cut', 'fade', 'zoom'],
    musicOptions: ['energetic', 'calm', 'dramatic'],
    randomizeSceneOrder: false,
    randomizeEngines: true,
    optimizeForCost: true,
  });

  const estimatedCost = config.totalVariations * scenesCount * 0.05;
  const estimatedTime = config.totalVariations * scenesCount * 15; // seconds

  const startGeneration = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCompletedCount(0);
    setFailedCount(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Generate variation configs
      const variations = generateVariationConfigs(config);

      // Insert variation records
      for (let i = 0; i < variations.length; i++) {
        const variation = variations[i];
        
        await supabase
          .from('video_variations')
          .insert({
            user_id: session.user.id,
            project_id: projectId,
            script_id: scriptId,
            variation_number: i + 1,
            variation_config: variation,
            status: 'pending',
          });
      }

      // Start processing queue
      await processVariations(variations.length);

    } catch (error: any) {
      console.error('Variety engine error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start variation generation',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const processVariations = async (total: number) => {
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`variations-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_variations',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const variation = payload.new as any;
          if (variation.status === 'completed') {
            setCompletedCount(prev => {
              const newCount = prev + 1;
              setProgress((newCount / total) * 100);
              return newCount;
            });
          } else if (variation.status === 'failed') {
            setFailedCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    // Simulate processing (in production, this would trigger actual generation)
    for (let i = 0; i < total; i++) {
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = setInterval(() => {
            if (!isPaused) {
              clearInterval(checkPause);
              resolve(null);
            }
          }, 500);
        });
      }

      // Update variation status
      const { data: variations } = await supabase
        .from('video_variations')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .limit(1);

      if (variations && variations.length > 0) {
        await supabase
          .from('video_variations')
          .update({ 
            status: 'generating',
            started_at: new Date().toISOString(),
          })
          .eq('id', variations[0].id);

        // Simulate generation time
        await new Promise(resolve => setTimeout(resolve, 1000));

        await supabase
          .from('video_variations')
          .update({ 
            status: Math.random() > 0.1 ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
            quality_score: 70 + Math.random() * 30,
          })
          .eq('id', variations[0].id);
      }
    }

    setIsGenerating(false);
    supabase.removeChannel(channel);

    // Fetch all completed variations
    const { data: completed } = await supabase
      .from('video_variations')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'completed');

    toast({
      title: 'Generation Complete',
      description: `Created ${completed?.length || 0} video variations`,
    });

    onComplete?.(completed || []);
  };

  const generateVariationConfigs = (config: VariationConfig) => {
    const variations = [];
    
    for (let i = 0; i < config.totalVariations; i++) {
      const hookStyle = config.hookStyles[i % config.hookStyles.length];
      const pacing = config.pacingOptions[i % config.pacingOptions.length];
      const transition = config.transitionStyles[i % config.transitionStyles.length];
      const music = config.musicOptions[i % config.musicOptions.length];

      variations.push({
        hook_style: hookStyle,
        pacing,
        transition_style: transition,
        music_style: music,
        randomize_scene_order: config.randomizeSceneOrder,
        randomize_engines: config.randomizeEngines,
        optimize_for_cost: config.optimizeForCost,
        seed: Math.floor(Math.random() * 1000000),
      });
    }

    return variations;
  };

  const toggleHookStyle = (styleId: string) => {
    setConfig(prev => ({
      ...prev,
      hookStyles: prev.hookStyles.includes(styleId)
        ? prev.hookStyles.filter(s => s !== styleId)
        : [...prev.hookStyles, styleId],
    }));
  };

  const togglePacing = (pacingId: string) => {
    setConfig(prev => ({
      ...prev,
      pacingOptions: prev.pacingOptions.includes(pacingId)
        ? prev.pacingOptions.filter(p => p !== pacingId)
        : [...prev.pacingOptions, pacingId],
    }));
  };

  const toggleTransition = (transitionId: string) => {
    setConfig(prev => ({
      ...prev,
      transitionStyles: prev.transitionStyles.includes(transitionId)
        ? prev.transitionStyles.filter(t => t !== transitionId)
        : [...prev.transitionStyles, transitionId],
    }));
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Video Variety Engine
        </CardTitle>
        <CardDescription>
          Generate {config.totalVariations} unique video variations with different hooks, pacing, and styles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isGenerating ? (
          <>
            {/* Variation Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  Total Variations
                </Label>
                <Badge variant="secondary">{config.totalVariations}</Badge>
              </div>
              <Slider
                value={[config.totalVariations]}
                onValueChange={([value]) => setConfig(prev => ({ ...prev, totalVariations: value }))}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            {/* Hook Styles */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Hook Styles
              </Label>
              <div className="flex flex-wrap gap-2">
                {HOOK_STYLES.map((style) => (
                  <Button
                    key={style.id}
                    variant={config.hookStyles.includes(style.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleHookStyle(style.id)}
                    className="gap-1"
                  >
                    <span>{style.icon}</span>
                    {style.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Pacing Options */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pacing
              </Label>
              <div className="flex flex-wrap gap-2">
                {PACING_OPTIONS.map((pacing) => (
                  <Button
                    key={pacing.id}
                    variant={config.pacingOptions.includes(pacing.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => togglePacing(pacing.id)}
                  >
                    {pacing.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Transition Styles */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Transitions
              </Label>
              <div className="flex flex-wrap gap-2">
                {TRANSITION_STYLES.map((transition) => (
                  <Button
                    key={transition.id}
                    variant={config.transitionStyles.includes(transition.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleTransition(transition.id)}
                  >
                    {transition.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="randomize-order" className="text-sm">
                  Randomize Scene Order
                </Label>
                <Switch
                  id="randomize-order"
                  checked={config.randomizeSceneOrder}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, randomizeSceneOrder: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="randomize-engines" className="text-sm">
                  Randomize AI Engines
                </Label>
                <Switch
                  id="randomize-engines"
                  checked={config.randomizeEngines}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, randomizeEngines: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="optimize-cost" className="text-sm">
                  Optimize for Cost
                </Label>
                <Switch
                  id="optimize-cost"
                  checked={config.optimizeForCost}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, optimizeForCost: checked }))
                  }
                />
              </div>
            </div>

            {/* Estimates */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold">${estimatedCost.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Est. Cost</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{Math.ceil(estimatedTime / 60)}m</p>
                  <p className="text-xs text-muted-foreground">Est. Time</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{config.totalVariations}</p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </div>
              </div>
              <Button onClick={startGeneration} size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate All
              </Button>
            </div>
          </>
        ) : (
          /* Generation Progress */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Generating Variations</p>
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {config.totalVariations} completed
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGenerating(false)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Progress value={progress} className="h-3" />

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-emerald-500">
                <CheckCircle className="h-4 w-4" />
                {completedCount} completed
              </div>
              {failedCount > 0 && (
                <div className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {failedCount} failed
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {config.totalVariations - completedCount - failedCount} remaining
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
