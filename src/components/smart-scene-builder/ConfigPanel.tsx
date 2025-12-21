// Config Panel - Video format and budget settings

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Smartphone, 
  Square, 
  Clock, 
  DollarSign,
  Sparkles,
  Zap,
  Crown,
  Brain,
} from 'lucide-react';
import { 
  VideoConfig, 
  AspectRatio, 
  Resolution, 
  SceneDuration, 
  BudgetPreference 
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

const BUDGETS: { value: BudgetPreference; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'free', label: 'Free', icon: Sparkles, description: 'Use only free engines' },
  { value: 'low', label: 'Low Cost', icon: DollarSign, description: 'Budget-friendly options' },
  { value: 'balanced', label: 'Balanced', icon: Zap, description: 'Quality vs cost balance' },
  { value: 'premium', label: 'Premium', icon: Crown, description: 'Best quality available' },
  { value: 'auto', label: 'AI Chooses', icon: Brain, description: 'Optimal per scene' },
];

export function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Video Configuration</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        
        {/* Default Duration */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Scene Duration</Label>
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
                <SelectItem key={d} value={d.toString()}>{d} seconds</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Text Overlays */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Text Safe Areas</Label>
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={config.enableTextOverlays}
              onCheckedChange={(v) => onConfigChange({ enableTextOverlays: v })}
            />
            <span className="text-sm">
              {config.enableTextOverlays ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Budget Preference */}
      <div className="mt-4 pt-4 border-t border-border">
        <Label className="text-xs text-muted-foreground mb-2 block">Budget Preference</Label>
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map(b => {
            const Icon = b.icon;
            const isActive = config.budgetPreference === b.value;
            return (
              <button
                key={b.value}
                onClick={() => onConfigChange({ budgetPreference: b.value })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <div className="text-left">
                  <span className="text-sm font-medium block">{b.label}</span>
                  <span className="text-xs opacity-70">{b.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
