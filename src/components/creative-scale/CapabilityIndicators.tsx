/**
 * Capability Indicators Component
 * Shows required capabilities and selected engine for each variation
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Scissors, 
  Gauge, 
  Volume2, 
  Layers, 
  Wand2, 
  Move,
  FileVideo,
  Monitor,
  Cloud,
  Server,
  FileCode,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import { 
  extractRequiredCapabilities, 
  routePlan,
  Capability,
  EngineId 
} from '@/lib/creative-scale/capability-router';

// Capability display configuration
const CAPABILITY_CONFIG: Record<Capability, { 
  label: string; 
  icon: typeof Scissors; 
  color: string;
  description: string;
}> = {
  'trim': {
    label: 'Trim',
    icon: Scissors,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    description: 'Video trimming and segment extraction'
  },
  'speed_change': {
    label: 'Speed',
    icon: Gauge,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    description: 'Playback speed adjustment'
  },
  'resize': {
    label: 'Resize',
    icon: Move,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
    description: 'Resolution/aspect ratio change'
  },
  'format_convert': {
    label: 'Format',
    icon: FileVideo,
    color: 'text-teal-500 bg-teal-500/10 border-teal-500/30',
    description: 'Container format conversion'
  },
  'segment_replace': {
    label: 'Replace',
    icon: Layers,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    description: 'Segment replacement/reordering'
  },
  'audio_mux': {
    label: 'Audio',
    icon: Volume2,
    color: 'text-pink-500 bg-pink-500/10 border-pink-500/30',
    description: 'Audio track mixing'
  },
  'audio_fade': {
    label: 'Fade',
    icon: Volume2,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
    description: 'Audio fade in/out effects'
  },
  'advanced_filters': {
    label: 'Filters',
    icon: Wand2,
    color: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
    description: 'Advanced video filters'
  },
  'overlay': {
    label: 'Overlay',
    icon: Layers,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    description: 'Overlay tracks and compositing'
  },
  'transition': {
    label: 'Transition',
    icon: ArrowRight,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    description: 'Scene transitions'
  },
  'text_overlay': {
    label: 'Text',
    icon: FileCode,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
    description: 'Text/subtitle overlay'
  },
};

// Engine display configuration  
const ENGINE_CONFIG: Record<EngineId, {
  label: string;
  icon: typeof Monitor;
  color: string;
  bgColor: string;
  description: string;
}> = {
  'webcodecs': {
    label: 'WebCodecs',
    icon: Monitor,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    description: 'Browser-native processing (fastest)'
  },
  'cloudinary': {
    label: 'Cloudinary',
    icon: Cloud,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    description: 'Cloud video transformation API'
  },
  'server_ffmpeg': {
    label: 'Server FFmpeg',
    icon: Server,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    description: 'Advanced server-side rendering'
  },
  'plan_export': {
    label: 'Plan Export',
    icon: FileCode,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    description: 'Manual execution required'
  },
};

interface VariationCapabilitiesProps {
  plan: ExecutionPlan;
  index: number;
}

function VariationCapabilities({ plan, index }: VariationCapabilitiesProps) {
  const routing = routePlan(plan);
  const capabilities = [...routing.requiredCapabilities.capabilities];
  const selectedEngine = routing.selection.selectedEngineId;
  const engineConfig = ENGINE_CONFIG[selectedEngine];
  const EngineIcon = engineConfig.icon;

  return (
    <div className="p-3 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Variation {index + 1}</span>
        
        {/* Selected Engine Badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${engineConfig.bgColor}`}>
                <EngineIcon className={`w-3 h-3 ${engineConfig.color}`} />
                <span className={engineConfig.color}>{engineConfig.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{engineConfig.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Capability Pills */}
      <div className="flex flex-wrap gap-1.5">
        {capabilities.length === 0 ? (
          <span className="text-xs text-muted-foreground">No special capabilities required</span>
        ) : (
          capabilities.map(cap => {
            const config = CAPABILITY_CONFIG[cap];
            if (!config) return null;
            const Icon = config.icon;
            
            return (
              <TooltipProvider key={cap}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium cursor-help ${config.color}`}>
                      <Icon className="w-2.5 h-2.5" />
                      <span>{config.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{config.description}</p>
                    {routing.requiredCapabilities.reasons.get(cap) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {routing.requiredCapabilities.reasons.get(cap)}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })
        )}
      </div>
    </div>
  );
}

interface CapabilityIndicatorsProps {
  plans: ExecutionPlan[];
}

export function CapabilityIndicators({ plans }: CapabilityIndicatorsProps) {
  // Group by selected engine for summary
  const engineGroups = plans.reduce((acc, plan) => {
    const routing = routePlan(plan);
    const engine = routing.selection.selectedEngineId;
    if (!acc[engine]) acc[engine] = 0;
    acc[engine]++;
    return acc;
  }, {} as Record<EngineId, number>);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Capability Routing</CardTitle>
          <div className="flex gap-2">
            {Object.entries(engineGroups).map(([engine, count]) => {
              const config = ENGINE_CONFIG[engine as EngineId];
              return (
                <Badge 
                  key={engine} 
                  variant="outline" 
                  className={`text-xs ${config.bgColor}`}
                >
                  <span className={config.color}>{count}× {config.label}</span>
                </Badge>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {plans.map((plan, idx) => (
            <VariationCapabilities key={plan.plan_id} plan={plan} index={idx} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
