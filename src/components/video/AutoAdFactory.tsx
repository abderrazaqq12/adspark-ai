import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, Zap, Film, Music, Clock, Loader2, CheckCircle2, 
  XCircle, Play, Download, Shuffle, Settings2, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutoAdFactoryProps {
  projectId: string;
  scriptId?: string;
  scenesCount: number;
  videosToGenerate: number;
  onComplete?: (videos: any[]) => void;
}

const TRANSITION_STYLES = [
  { id: 'cut', label: 'Hard Cut' },
  { id: 'fade', label: 'Fade' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'slide', label: 'Slide' },
  { id: 'whip', label: 'Whip Pan' },
  { id: 'mixed', label: 'Mixed (Random)' },
];

const PACING_STYLES = [
  { id: 'fast', label: 'Fast (TikTok)', maxDuration: 15 },
  { id: 'medium', label: 'Medium (Reels)', maxDuration: 30 },
  { id: 'dynamic', label: 'Dynamic', maxDuration: 30 },
];

const EXPORT_RATIOS = [
  { id: '9:16', label: '9:16 (Vertical)', width: 1080, height: 1920 },
  { id: '1:1', label: '1:1 (Square)', width: 1080, height: 1080 },
  { id: '16:9', label: '16:9 (Horizontal)', width: 1920, height: 1080 },
  { id: '4:5', label: '4:5 (Instagram)', width: 1080, height: 1350 },
];

export function AutoAdFactory({
  projectId,
  scriptId,
  scenesCount,
  videosToGenerate,
  onComplete,
}: AutoAdFactoryProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState<any[]>([]);
  
  // Config
  const [transitionStyle, setTransitionStyle] = useState('mixed');
  const [pacingStyle, setPacingStyle] = useState('fast');
  const [selectedRatios, setSelectedRatios] = useState(['9:16']);
  const [randomizeHooks, setRandomizeHooks] = useState(true);
  const [randomizeOrder, setRandomizeOrder] = useState(true);
  const [randomizePacing, setRandomizePacing] = useState(true);
  const [autoAddMusic, setAutoAddMusic] = useState(true);
  const [autoTrim, setAutoTrim] = useState(true);
  const [maxDuration, setMaxDuration] = useState(30);

  const toggleRatio = (ratioId: string) => {
    if (selectedRatios.includes(ratioId)) {
      if (selectedRatios.length > 1) {
        setSelectedRatios(selectedRatios.filter(r => r !== ratioId));
      }
    } else {
      setSelectedRatios([...selectedRatios, ratioId]);
    }
  };

  const startAutoAssembly = async () => {
    if (!scriptId || scenesCount === 0) {
      toast.error('No scenes available');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setCompletedCount(0);
    setFailedCount(0);
    setGeneratedVideos([]);

    const totalVideos = videosToGenerate * selectedRatios.length;
    let completed = 0;
    const videos: any[] = [];

    try {
      for (let i = 0; i < videosToGenerate; i++) {
        for (const ratio of selectedRatios) {
          const transition = transitionStyle === 'mixed' 
            ? TRANSITION_STYLES[Math.floor(Math.random() * (TRANSITION_STYLES.length - 1))].id
            : transitionStyle;

          try {
            const { data, error } = await supabase.functions.invoke('assemble-video', {
              body: {
                scriptId,
                aspectRatio: ratio,
                outputFormat: 'mp4',
                addSubtitles: true,
                transitionType: transition,
                transitionDuration: 0.3,
                randomizeSceneOrder: randomizeOrder && Math.random() > 0.5,
                addBackgroundMusic: autoAddMusic,
                maxDuration: maxDuration,
                autoTrim: autoTrim,
                variationIndex: i + 1,
                pacingStyle: randomizePacing ? PACING_STYLES[Math.floor(Math.random() * PACING_STYLES.length)].id : pacingStyle,
              },
            });

            if (error) throw error;

            videos.push({ 
              id: `video-${i}-${ratio}`, 
              ratio, 
              url: data?.finalVideoUrl,
              variation: i + 1
            });
            setCompletedCount(prev => prev + 1);
          } catch (err) {
            setFailedCount(prev => prev + 1);
          }

          completed++;
          setProgress((completed / totalVideos) * 100);

          if (completed < totalVideos) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      setGeneratedVideos(videos);
      toast.success(`Created ${videos.length} video ads under ${maxDuration}s!`);
      onComplete?.(videos);
    } catch (error: any) {
      toast.error(error.message || 'Assembly failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const estimatedTime = Math.ceil((videosToGenerate * selectedRatios.length * 5) / 60);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Auto Ad Factory
          </h2>
          <p className="text-sm text-muted-foreground">
            Mass-produce {videosToGenerate}+ ads under {maxDuration}s with one click
          </p>
        </div>
        <Badge variant="outline" className="text-primary">Step 7</Badge>
      </div>

      {!isGenerating && generatedVideos.length === 0 && (
        <>
          {/* Duration Limit */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Max Duration
              </Label>
              <Badge variant="secondary">{maxDuration}s</Badge>
            </div>
            <Slider value={[maxDuration]} onValueChange={([v]) => setMaxDuration(v)} min={10} max={30} step={5} />
          </Card>

          {/* Export Ratios */}
          <Card className="p-4 bg-card border-border">
            <Label className="text-sm mb-3 block">Export Ratios</Label>
            <div className="grid grid-cols-4 gap-2">
              {EXPORT_RATIOS.map((ratio) => (
                <Button
                  key={ratio.id}
                  variant={selectedRatios.includes(ratio.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleRatio(ratio.id)}
                >
                  {ratio.label}
                </Button>
              ))}
            </div>
          </Card>

          {/* Options Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-card border-border space-y-3">
              <Label className="text-sm flex items-center gap-2"><Shuffle className="w-4 h-4" /> Randomization</Label>
              {[
                { id: 'hooks', label: 'Randomize Hooks', checked: randomizeHooks, onChange: setRandomizeHooks },
                { id: 'order', label: 'Randomize Scene Order', checked: randomizeOrder, onChange: setRandomizeOrder },
                { id: 'pacing', label: 'Randomize Pacing', checked: randomizePacing, onChange: setRandomizePacing },
              ].map((opt) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Checkbox id={opt.id} checked={opt.checked} onCheckedChange={(c) => opt.onChange(c as boolean)} />
                  <Label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </Card>
            
            <Card className="p-4 bg-card border-border space-y-3">
              <Label className="text-sm flex items-center gap-2"><Settings2 className="w-4 h-4" /> Assembly</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="music" checked={autoAddMusic} onCheckedChange={(c) => setAutoAddMusic(c as boolean)} />
                <Label htmlFor="music" className="text-sm cursor-pointer">Auto-add Background Music</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="trim" checked={autoTrim} onCheckedChange={(c) => setAutoTrim(c as boolean)} />
                <Label htmlFor="trim" className="text-sm cursor-pointer">Auto-trim to {maxDuration}s</Label>
              </div>
              <Select value={transitionStyle} onValueChange={setTransitionStyle}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSITION_STYLES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>
          </div>

          {/* Generate Button */}
          <Button onClick={startAutoAssembly} disabled={scenesCount === 0} size="lg" className="w-full gap-2">
            <Sparkles className="w-5 h-5" />
            Create {videosToGenerate * selectedRatios.length} Video Ads (~{estimatedTime}min)
          </Button>
        </>
      )}

      {/* Progress */}
      {(isGenerating || generatedVideos.length > 0) && (
        <Card className="p-4 bg-card border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {isGenerating ? 'Generating...' : 'Complete!'}
            </span>
            <Badge>{completedCount}/{videosToGenerate * selectedRatios.length}</Badge>
          </div>
          <Progress value={progress} className="h-2" />
          
          {!isGenerating && generatedVideos.length > 0 && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="w-4 h-4" /> Download All
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGeneratedVideos([])}>Reset</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
