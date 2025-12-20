import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Zap, DollarSign, Crown, Sparkles } from 'lucide-react';

export interface VideoEngine {
  id: string;
  name: string;
  tier: 'free' | 'low' | 'medium' | 'premium';
  description: string;
  maxDuration: number;
  costPerSecond?: number;
  apiProvider?: string;
}

// Tier-based video engines - only video-capable models
export const VIDEO_ENGINES: VideoEngine[] = [
  // FREE TIER
  { id: 'nano-banana', name: 'NanoBanana', tier: 'free', description: 'Free image-to-video via Gemini', maxDuration: 10 },
  { id: 'stability-free', name: 'Stability Video (Free)', tier: 'free', description: 'Open source video diffusion', maxDuration: 4 },
  
  // LOW COST
  { id: 'wan-2.5', name: 'Wan 2.5', tier: 'low', description: 'Fast affordable video generation', maxDuration: 10, costPerSecond: 0.02 },
  { id: 'kling-2.5', name: 'Kling 2.5 Pro', tier: 'low', description: 'Advanced motion & physics', maxDuration: 10, costPerSecond: 0.03 },
  { id: 'minimax', name: 'MiniMax Video', tier: 'low', description: 'Quick video clips', maxDuration: 6, costPerSecond: 0.02 },
  { id: 'ovi', name: 'Ovi', tier: 'low', description: 'Budget video generation', maxDuration: 8, costPerSecond: 0.01 },
  { id: 'haiper', name: 'HaiperAI', tier: 'low', description: 'Ultra-fast social clips', maxDuration: 4, costPerSecond: 0.02 },
  { id: 'flux-video', name: 'Flux Video', tier: 'low', description: 'Flux-based video generation', maxDuration: 6, costPerSecond: 0.02 },
  
  // MEDIUM COST
  { id: 'veo-3.1', name: 'Google Veo 3.1', tier: 'medium', description: 'Cinematic product shots', maxDuration: 10, costPerSecond: 0.08 },
  { id: 'runway-gen3', name: 'Runway Gen-3', tier: 'medium', description: 'Professional video creation', maxDuration: 10, costPerSecond: 0.10 },
  { id: 'luma', name: 'Luma Dream Machine', tier: 'medium', description: 'Smooth cinematic motion', maxDuration: 5, costPerSecond: 0.04 },
  { id: 'pika-2.1', name: 'Pika 2.1', tier: 'medium', description: 'Fast social content', maxDuration: 16, costPerSecond: 0.05 },
  { id: 'kling-2.6', name: 'Kling 2.6', tier: 'medium', description: 'Premium physics simulation', maxDuration: 10, costPerSecond: 0.06 },
  { id: 'stable-video', name: 'Stable Video Pro', tier: 'medium', description: 'High-quality open model', maxDuration: 8, costPerSecond: 0.04 },
  
  // PREMIUM / EXPENSIVE
  { id: 'sora-2', name: 'Sora 2', tier: 'premium', description: 'OpenAI cinematic storytelling', maxDuration: 20, costPerSecond: 0.20 },
  { id: 'sora-2-pro', name: 'Sora 2 Pro', tier: 'premium', description: 'Highest quality cinematic', maxDuration: 60, costPerSecond: 0.35 },
  { id: 'omnihuman', name: 'OmniHuman Actors', tier: 'premium', description: 'Ultra-realistic human actors', maxDuration: 30, costPerSecond: 0.25 },
  { id: 'heygen-premium', name: 'HeyGen Premium', tier: 'premium', description: 'Premium avatar generation', maxDuration: 60, costPerSecond: 0.15, apiProvider: 'heygen' },
];

const TIER_CONFIG = {
  free: { label: 'Free Tier', icon: Sparkles, color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  low: { label: 'Low Cost', icon: DollarSign, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  medium: { label: 'Medium Cost', icon: Zap, color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  premium: { label: 'Premium', icon: Crown, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
};

interface VideoEngineTierSelectorProps {
  selectedTier: 'free' | 'low' | 'medium' | 'premium' | 'all';
  onTierChange: (tier: 'free' | 'low' | 'medium' | 'premium' | 'all') => void;
  selectedEngines: string[];
  onEnginesChange: (engines: string[]) => void;
  randomizeEngines: boolean;
  onRandomizeEnginesChange: (randomize: boolean) => void;
}

export function VideoEngineTierSelector({
  selectedTier,
  onTierChange,
  selectedEngines,
  onEnginesChange,
  randomizeEngines,
  onRandomizeEnginesChange,
}: VideoEngineTierSelectorProps) {
  const filteredEngines = selectedTier === 'all' 
    ? VIDEO_ENGINES 
    : VIDEO_ENGINES.filter(e => e.tier === selectedTier);

  const toggleEngine = (engineId: string) => {
    if (selectedEngines.includes(engineId)) {
      onEnginesChange(selectedEngines.filter(id => id !== engineId));
    } else {
      onEnginesChange([...selectedEngines, engineId]);
    }
  };

  const selectAllInTier = () => {
    const tierEngineIds = filteredEngines.map(e => e.id);
    onEnginesChange(tierEngineIds);
  };

  const clearSelection = () => {
    onEnginesChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Tier Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Engine Tier</Label>
        <RadioGroup 
          value={selectedTier} 
          onValueChange={(v) => onTierChange(v as typeof selectedTier)}
          className="grid grid-cols-5 gap-2"
        >
          {(['free', 'low', 'medium', 'premium', 'all'] as const).map((tier) => {
            const config = tier === 'all' ? null : TIER_CONFIG[tier];
            return (
              <div key={tier} className="flex items-center">
                <RadioGroupItem value={tier} id={`tier-${tier}`} className="peer sr-only" />
                <Label
                  htmlFor={`tier-${tier}`}
                  className={`flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-md border cursor-pointer text-xs font-medium transition-all
                    peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                    ${config ? config.borderColor : 'border-border'} 
                    ${config ? config.bgColor : 'bg-muted/50'}
                    hover:border-primary/50`}
                >
                  {config && <config.icon className={`w-3.5 h-3.5 ${config.color}`} />}
                  {tier === 'all' ? 'All' : config?.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {/* Engine Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Select Engines ({selectedEngines.length})</Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="randomize-engines"
                checked={randomizeEngines}
                onCheckedChange={(checked) => onRandomizeEnginesChange(checked as boolean)}
              />
              <Label htmlFor="randomize-engines" className="text-xs cursor-pointer">
                Randomize
              </Label>
            </div>
            <Button variant="ghost" size="sm" onClick={selectAllInTier} className="text-xs h-7">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs h-7">
              Clear
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
          {filteredEngines.map((engine) => {
            const tierConfig = TIER_CONFIG[engine.tier];
            const isSelected = selectedEngines.includes(engine.id);
            
            return (
              <div
                key={engine.id}
                onClick={() => toggleEngine(engine.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/10' 
                    : `${tierConfig.borderColor} ${tierConfig.bgColor} hover:border-primary/50`
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{engine.name}</span>
                  <Checkbox checked={isSelected} className="pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{engine.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-[10px] ${tierConfig.color}`}>
                    {engine.tier}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{engine.maxDuration}s max</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
