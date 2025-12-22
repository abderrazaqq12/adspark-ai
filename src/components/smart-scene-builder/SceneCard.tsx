// Scene Card Component - Individual scene display and controls

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  GripVertical,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
  Loader2,
  Sparkles,
  Clock,
  DollarSign,
  Zap,
  Upload,
  Image as ImageIcon,
  Info,
  Star,
  Brain,
} from 'lucide-react';
import { 
  SmartScenePlan, 
  SceneStructure, 
  SceneDuration,
  MotionIntensity,
} from '@/lib/smart-scene-builder/types';

interface SceneCardProps {
  scene: SmartScenePlan;
  isGenerating: boolean;
  onUpdate: (updates: Partial<SmartScenePlan>) => void;
  onUpdateStructure: (structure: SceneStructure) => void;
  onUpdateDuration: (duration: SceneDuration) => void;
  onRegenerate: () => void;
  onGenerateVideo: () => void;
  onRemove: () => void;
  onUploadAsset?: (file: File) => void;
  dragHandleProps?: any;
}

const SCENE_STRUCTURES: { value: SceneStructure; label: string; icon: string }[] = [
  { value: 'product_closeup', label: 'Product Close-up', icon: '📦' },
  { value: 'problem_visualization', label: 'Problem', icon: '😤' },
  { value: 'lifestyle_usage', label: 'Lifestyle', icon: '🏃' },
  { value: 'social_proof', label: 'Social Proof', icon: '⭐' },
  { value: 'cta_background', label: 'CTA', icon: '🎯' },
  { value: 'before_after', label: 'Before/After', icon: '🔄' },
  { value: 'unboxing', label: 'Unboxing', icon: '📦' },
  { value: 'testimonial', label: 'Testimonial', icon: '💬' },
  { value: 'feature_highlight', label: 'Feature', icon: '✨' },
  { value: 'comparison', label: 'Comparison', icon: '⚖️' },
];

const DURATIONS: SceneDuration[] = [3, 5, 7, 10];

const MOTION_LABELS: Record<MotionIntensity, { label: string; color: string }> = {
  low: { label: 'Static', color: 'bg-blue-500/20 text-blue-400' },
  medium: { label: 'Subtle', color: 'bg-amber-500/20 text-amber-400' },
  high: { label: 'Dynamic', color: 'bg-red-500/20 text-red-400' },
};

const TIER_COLORS: Record<string, string> = {
  free: 'bg-green-500/20 text-green-400 border-green-500/30',
  budget: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  premium: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const getQualityColor = (score: number): string => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
};

const STATUS_STYLES = {
  pending: 'border-muted-foreground/30 bg-muted/20',
  generating: 'border-primary bg-primary/10 animate-pulse',
  completed: 'border-green-500 bg-green-500/10',
  failed: 'border-destructive bg-destructive/10',
};

export function SceneCard({
  scene,
  isGenerating,
  onUpdate,
  onUpdateStructure,
  onUpdateDuration,
  onRegenerate,
  onGenerateVideo,
  onRemove,
  onUploadAsset,
  dragHandleProps,
}: SceneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const structureItem = SCENE_STRUCTURES.find(s => s.value === scene.structure);
  const motionStyle = MOTION_LABELS[scene.motionIntensity];
  
  return (
    <Card className={`transition-all ${STATUS_STYLES[scene.status]}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/50">
        <div 
          {...dragHandleProps}
          className="cursor-grab hover:text-primary"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        
        <Badge variant="outline" className="font-mono text-xs">
          {scene.index + 1}
        </Badge>
        
        <span className="text-lg">{structureItem?.icon}</span>
        
        <Select
          value={scene.structure}
          onValueChange={(v) => onUpdateStructure(v as SceneStructure)}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCENE_STRUCTURES.map(s => (
              <SelectItem key={s.value} value={s.value}>
                {s.icon} {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Badge className={motionStyle.color}>
          {motionStyle.label}
        </Badge>
        
        <div className="flex-1" />
        
        {/* Duration */}
        <Select
          value={scene.duration.toString()}
          onValueChange={(v) => onUpdateDuration(parseInt(v) as SceneDuration)}
        >
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATIONS.map(d => (
              <SelectItem key={d} value={d.toString()}>{d}s</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* AI Engine Selection Indicator */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${TIER_COLORS[scene.selectedEngine.tier]}`}>
          <Brain className="w-3 h-3" />
          <span className="text-xs font-medium">{scene.selectedEngine.engineName}</span>
        </div>
        
        {/* Quality Score */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
          <Star className={`w-3 h-3 ${getQualityColor(scene.selectedEngine.qualityScore || 75)}`} />
          <span className={`text-xs font-medium ${getQualityColor(scene.selectedEngine.qualityScore || 75)}`}>
            {scene.selectedEngine.qualityScore || 75}
          </span>
        </div>
        
        {/* Cost */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
          <DollarSign className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            ${scene.selectedEngine.estimatedCost.toFixed(3)}
          </span>
        </div>
        
        {/* Expand toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>
      
      {/* Preview Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-20 h-14 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {scene.thumbnailUrl || scene.videoUrl ? (
            <video 
              src={scene.videoUrl} 
              className="w-full h-full object-cover"
              poster={scene.thumbnailUrl}
            />
          ) : scene.productImageUrl || scene.sourceAsset?.url ? (
            <img 
              src={scene.productImageUrl || scene.sourceAsset?.url} 
              className="w-full h-full object-cover"
              alt="Scene asset"
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        
        {/* Visual Intent Preview */}
        <p className="text-sm text-muted-foreground flex-1 line-clamp-2">
          {scene.visualIntent}
        </p>
        
        {/* Status & Actions */}
        <div className="flex items-center gap-2">
          {scene.status === 'completed' && scene.videoUrl && (
            <Button variant="outline" size="sm" className="h-8" asChild>
              <a href={scene.videoUrl} target="_blank" rel="noreferrer">
                <Play className="w-3 h-3 mr-1" />
                Preview
              </a>
            </Button>
          )}
          
          {scene.status === 'failed' && (
            <Badge variant="destructive" className="text-xs">
              Failed
            </Badge>
          )}
          
          {scene.status === 'generating' && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onGenerateVideo}
            disabled={isGenerating}
          >
            {isGenerating && scene.status === 'generating' ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 mr-1" />
            )}
            Generate
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Expanded Content */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 border-t border-border/50">
            {/* Visual Intent Editor */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Visual Intent
              </label>
              <Textarea
                value={scene.visualIntent}
                onChange={(e) => onUpdate({ visualIntent: e.target.value })}
                placeholder="Describe the visual scene..."
                className="min-h-[60px] text-sm"
              />
            </div>
            
            {/* Asset Upload */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Custom Image/Video
                </label>
                <div className="flex gap-2">
                  <Input
                    value={scene.productImageUrl || ''}
                    onChange={(e) => onUpdate({ productImageUrl: e.target.value })}
                    placeholder="Image URL..."
                    className="text-sm"
                  />
                  <Button variant="outline" size="icon" className="flex-shrink-0">
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Debug Panel */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium">AI Decision Details</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Engine:</span>{' '}
                  <span className="font-medium">{scene.selectedEngine.engineName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tier:</span>{' '}
                  <Badge className={`text-xs ${TIER_COLORS[scene.selectedEngine.tier]}`}>
                    {scene.selectedEngine.tier}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Quality:</span>{' '}
                  <span className={`font-medium ${getQualityColor(scene.selectedEngine.qualityScore || 75)}`}>
                    {scene.selectedEngine.qualityScore || 75}/100
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cost/sec:</span>{' '}
                  <span className="font-medium">${scene.selectedEngine.costPerSecond.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Est. Total:</span>{' '}
                  <span className="font-medium text-primary">${scene.selectedEngine.estimatedCost.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>{' '}
                  <span className="font-medium">{scene.duration}s</span>
                </div>
                <div className="col-span-3 mt-1">
                  <span className="text-muted-foreground">Reason:</span>{' '}
                  <span>{scene.selectedEngine.reason}</span>
                </div>
                
                {scene.selectedEngine.alternatives.length > 0 && (
                  <div className="col-span-2 mt-2">
                    <span className="text-muted-foreground block mb-1">Alternatives considered:</span>
                    {scene.selectedEngine.alternatives.map((alt, i) => (
                      <div key={i} className="flex justify-between text-muted-foreground">
                        <span>{alt.engineName} (${alt.costPerSecond}/s)</span>
                        <span className="text-xs">{alt.rejectionReason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={onRegenerate}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Re-select Engine
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
