// Config Panel - Output constraints and budget/engine strategy settings

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Monitor, 
  Smartphone, 
  Square, 
  Clock, 
  Brain,
  Settings2,
  Info,
  Film,
  Timer,
} from 'lucide-react';
import { 
  VideoConfig, 
  AspectRatio, 
  Resolution, 
  SceneDuration,
} from '@/lib/smart-scene-builder/types';

interface ConfigPanelProps {
  config: VideoConfig;
  onConfigChange: (updates: Partial<VideoConfig>) => void;
}

const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: React.ElementType }[] = [
  { value: '9:16', label: 'Vertical (9:16)', icon: Smartphone },
  { value: '1:1', label: 'Square (1:1)', icon: Square },
  { value: '16:9', label: 'Horizontal (16:9)', icon: Monitor },
];

const RESOLUTIONS: { value: Resolution; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
];

const DURATIONS: SceneDuration[] = [3, 5, 7, 10];

const VIDEO_COUNTS = [1, 2, 3, 5, 10];

// AI automatically decides the best engine based on scene complexity, cost efficiency, and quality

export function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  return (
    <Card className="p-4 bg-card border-border">
      {/* Output Constraints Section */}
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">Output Constraints</h4>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Video Count */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Number of Videos
          </Label>
          <Select
            value={(config.videoCount || 3).toString()}
            onValueChange={(v) => onConfigChange({ videoCount: parseInt(v) })}
          >
            <SelectTrigger>
              <Film className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_COUNTS.map(c => (
                <SelectItem key={c} value={c.toString()}>
                  {c} video{c > 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Video Duration Range */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Video Length
            <span className="text-muted-foreground/60 ml-1">(seconds)</span>
          </Label>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 flex-1">
              <Input 
                type="number" 
                min={15} 
                max={60}
                value={config.minVideoDuration || 20}
                onChange={(e) => onConfigChange({ minVideoDuration: parseInt(e.target.value) || 20 })}
                className="h-9 w-14 text-xs text-center"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input 
                type="number" 
                min={15} 
                max={60}
                value={config.maxVideoDuration || 35}
                onChange={(e) => onConfigChange({ maxVideoDuration: parseInt(e.target.value) || 35 })}
                className="h-9 w-14 text-xs text-center"
              />
              <Timer className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        
        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
          <div className="flex gap-1">
            {ASPECT_RATIOS.map(ar => {
              const Icon = ar.icon;
              return (
                <button
                  key={ar.value}
                  onClick={() => onConfigChange({ aspectRatio: ar.value })}
                  className={`flex-1 p-2 rounded-lg border transition-all ${
                    config.aspectRatio === ar.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className="w-4 h-4 mx-auto" />
                  <span className="text-xs block mt-1">{ar.value}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Resolution */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Resolution</Label>
          <Select
            value={config.resolution}
            onValueChange={(v) => onConfigChange({ resolution: v as Resolution })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTIONS.map(r => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Default Scene Duration */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Scene Duration
          </Label>
          <Select
            value={config.defaultSceneDuration.toString()}
            onValueChange={(v) => onConfigChange({ defaultSceneDuration: parseInt(v) as SceneDuration })}
          >
            <SelectTrigger>
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map(d => (
                <SelectItem key={d} value={d.toString()}>
                  {d}s {d === 5 && '(rec.)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Text Safe Areas */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Text Safe Areas</Label>
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={config.enableTextOverlays}
              onCheckedChange={(v) => onConfigChange({ enableTextOverlays: v })}
            />
            <span className="text-sm">
              {config.enableTextOverlays ? 'On' : 'Off'}
            </span>
          </div>
        </div>
      </div>
      
      <Separator className="my-4" />
      
      {/* AI Engine Strategy Section */}
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">Engine Strategy</h4>
        <Badge variant="secondary" className="text-xs">AI Powered</Badge>
      </div>
      
      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h5 className="text-sm font-medium">AI Automatically Selects Best Engine</h5>
            <p className="text-xs text-muted-foreground mt-1">
              For each scene, AI analyzes complexity and selects the optimal engine balancing 
              <span className="text-primary font-medium"> low cost</span>, 
              <span className="text-primary font-medium"> high quality</span>, and 
              <span className="text-primary font-medium"> best model fit</span>.
            </p>
          </div>
        </div>
        
        <div className="flex gap-4 mt-3 pt-3 border-t border-primary/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Cost Optimized</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Quality Focused</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>Scene-Aware</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
