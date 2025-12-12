// Video Backend Strategy Selector

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Monitor, Cloud, Code, Sparkles, Zap, DollarSign } from 'lucide-react';
import { ProcessingBackend, EngineTier } from '@/lib/video-processing/types';
import { getTierInfo, getEnginesByTier } from '@/lib/video-processing/engine-registry';

interface VideoBackendSelectorProps {
  backend: ProcessingBackend;
  tier: EngineTier;
  onBackendChange: (backend: ProcessingBackend) => void;
  onTierChange: (tier: EngineTier) => void;
}

const BACKEND_OPTIONS: { value: ProcessingBackend; label: string; description: string; icon: typeof Monitor }[] = [
  { value: 'browser', label: 'Browser', description: 'FFmpeg.wasm + WebCodecs (No server)', icon: Monitor },
  { value: 'remotion', label: 'Code-Based', description: 'Remotion React templates', icon: Code },
  { value: 'cloud-api', label: 'Cloud APIs', description: 'Cloudinary, Mux, fal.ai', icon: Cloud },
  { value: 'auto', label: 'Auto', description: 'AI selects best option', icon: Sparkles },
];

const TIER_OPTIONS: EngineTier[] = ['free', 'low', 'medium', 'premium', 'ai-chooses'];

export function VideoBackendSelector({ 
  backend, 
  tier, 
  onBackendChange, 
  onTierChange 
}: VideoBackendSelectorProps) {
  const tierInfo = getTierInfo(tier);
  const engines = getEnginesByTier(tier);

  return (
    <div className="space-y-4">
      {/* Backend Strategy */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Processing Backend</Label>
        <div className="grid grid-cols-2 gap-2">
          {BACKEND_OPTIONS.map((option) => (
            <Card 
              key={option.value}
              className={`cursor-pointer transition-all ${
                backend === option.value 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => onBackendChange(option.value)}
            >
              <CardContent className="p-3 flex items-start gap-2">
                <option.icon className={`w-4 h-4 mt-0.5 ${backend === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Engine Tier */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Cost Tier</Label>
        <RadioGroup 
          value={tier} 
          onValueChange={(v) => onTierChange(v as EngineTier)}
          className="grid grid-cols-5 gap-1"
        >
          {TIER_OPTIONS.map((t) => {
            const info = getTierInfo(t);
            return (
              <div key={t} className="flex items-center">
                <RadioGroupItem value={t} id={`tier-${t}`} className="peer sr-only" />
                <Label
                  htmlFor={`tier-${t}`}
                  className={`flex-1 cursor-pointer rounded-md border p-2 text-center text-xs peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 hover:bg-muted/50 transition-colors`}
                >
                  {info.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        <p className="text-xs text-muted-foreground mt-1">{tierInfo.description}</p>
      </div>

      {/* Available Engines Preview */}
      <div className="flex flex-wrap gap-1">
        {engines.slice(0, 6).map((engine) => (
          <Badge key={engine.id} variant="outline" className="text-xs">
            {engine.name}
          </Badge>
        ))}
        {engines.length > 6 && (
          <Badge variant="secondary" className="text-xs">+{engines.length - 6} more</Badge>
        )}
      </div>
    </div>
  );
}
