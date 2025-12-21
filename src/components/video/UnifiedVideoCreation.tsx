import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Video, 
  Zap,
  Sparkles, 
  Film, 
  DollarSign,
  Cpu,
  Server,
  ChevronDown,
  Play,
  Loader2,
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  CostMode, 
  QualityPreference, 
  ExecutionMode,
  VideoGenerationInput,
  VideoGenerationOutput,
} from '@/lib/video-generation/types';
import { selectEngine, estimateCost } from '@/lib/video-generation/engine-selector';
import { executeVideoGeneration } from '@/lib/video-generation/executor';
import { useProject } from '@/contexts/ProjectContext';

interface UnifiedVideoCreationProps {
  script?: string;
  voiceoverUrl?: string;
  scenes?: any[];
  images?: string[];
  onComplete?: (output: VideoGenerationOutput) => void;
}

export const UnifiedVideoCreation: React.FC<UnifiedVideoCreationProps> = ({
  script,
  voiceoverUrl,
  scenes,
  images,
  onComplete,
}) => {
  const { projectId } = useProject();
  
  // User preferences (NOT engine selection)
  const [costMode, setCostMode] = useState<CostMode>('ai-chooses');
  const [qualityPreference, setQualityPreference] = useState<QualityPreference>('balanced');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('agent');
  const [duration, setDuration] = useState([15]);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');
  
  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<VideoGenerationOutput | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  // Build input from current state
  const input: VideoGenerationInput = useMemo(() => ({
    script,
    voiceoverUrl,
    scenes,
    images,
    aspectRatio,
    duration: duration[0],
    costMode,
    qualityPreference,
    executionMode,
    projectId,
  }), [script, voiceoverUrl, scenes, images, aspectRatio, duration, costMode, qualityPreference, executionMode, projectId]);

  // Preview engine selection (for transparency, not user choice)
  const previewSelection = useMemo(() => {
    try {
      return selectEngine(input);
    } catch {
      return null;
    }
  }, [input]);

  // Cost estimate
  const costEstimate = useMemo(() => {
    try {
      return estimateCost(input);
    } catch {
      return null;
    }
  }, [input]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setOutput(null);

    try {
      const result = await executeVideoGeneration(input);
      setOutput(result);
      
      if (result.status === 'success') {
        toast.success('Video generated successfully!');
        onComplete?.(result);
      } else if (result.status === 'processing') {
        toast.info('Video generation started. This may take a few minutes.');
      } else {
        toast.error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Controls */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Video Creation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Cost Mode */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Cost Mode
              </Label>
              <Select value={costMode} onValueChange={(v) => setCostMode(v as CostMode)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="free">Free — $0 cost</SelectItem>
                  <SelectItem value="budget">Budget — Low cost</SelectItem>
                  <SelectItem value="premium">Premium — Best quality</SelectItem>
                  <SelectItem value="ai-chooses">AI Chooses — Optimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quality Preference */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Quality
              </Label>
              <Select value={qualityPreference} onValueChange={(v) => setQualityPreference(v as QualityPreference)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="fast">Fast — Quick generation</SelectItem>
                  <SelectItem value="balanced">Balanced — Good quality</SelectItem>
                  <SelectItem value="cinematic">Cinematic — Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Execution Engine */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                Engine
              </Label>
              <Select value={executionMode} onValueChange={(v) => setExecutionMode(v as ExecutionMode)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="agent">AI Agent — Recommended</SelectItem>
                  <SelectItem value="edge">High-Performance — Direct API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as '9:16' | '16:9' | '1:1' | '4:5')}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="9:16">9:16 — TikTok/Reels</SelectItem>
                  <SelectItem value="16:9">16:9 — YouTube</SelectItem>
                  <SelectItem value="1:1">1:1 — Instagram</SelectItem>
                  <SelectItem value="4:5">4:5 — Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Duration</Label>
              <span className="text-sm text-muted-foreground">{duration[0]} seconds</span>
            </div>
            <Slider
              value={duration}
              onValueChange={setDuration}
              min={5}
              max={60}
              step={5}
              className="w-full"
            />
          </div>

          {/* Cost Preview */}
          {costEstimate && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Cost:</span>
                <span className="font-medium">
                  ${costEstimate.selectedEngineCost.toFixed(2)}
                  {costEstimate.minCost !== costEstimate.maxCost && (
                    <span className="text-muted-foreground ml-1">
                      (range: ${costEstimate.minCost.toFixed(2)} - ${costEstimate.maxCost.toFixed(2)})
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Create Video
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Output Display */}
      {output && (
        <Card className={`border-border/50 ${
          output.status === 'success' ? 'border-green-500/50' : 
          output.status === 'error' ? 'border-destructive/50' : ''
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {output.status === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : output.status === 'error' ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              {output.status === 'success' ? 'Video Ready' : 
               output.status === 'error' ? 'Generation Failed' : 'Processing...'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {output.videoUrl && (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <video 
                  src={output.videoUrl} 
                  controls 
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {output.error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {output.error}
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                Engine: {output.meta.engineName}
              </Badge>
              <Badge variant="outline">
                Mode: {output.meta.executionMode}
              </Badge>
              {output.meta.latencyMs && (
                <Badge variant="outline">
                  {(output.meta.latencyMs / 1000).toFixed(1)}s
                </Badge>
              )}
              {output.meta.actualCost && (
                <Badge variant="outline">
                  ${output.meta.actualCost.toFixed(3)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Panel */}
      <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
        <Card className="border-border/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Debug Panel
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${debugOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-3 text-sm font-mono">
                {previewSelection && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Selected Engine:</span>
                      <span>{previewSelection.engine.name} ({previewSelection.engine.engine_id})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reason:</span>
                      <span className="text-right max-w-[60%]">{previewSelection.reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tier:</span>
                      <span>{previewSelection.engine.tier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality:</span>
                      <span>{previewSelection.engine.quality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost/sec:</span>
                      <span>${previewSelection.engine.cost_per_second}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alternatives:</span>
                      <span>{previewSelection.alternativeEngines.map(e => e.name).join(', ') || 'None'}</span>
                    </div>
                  </>
                )}
                {output?.debug && (
                  <>
                    <div className="border-t border-border/50 pt-3 mt-3">
                      <span className="text-muted-foreground">Last Execution Debug:</span>
                    </div>
                    <pre className="p-2 rounded bg-muted/50 text-xs overflow-auto">
                      {JSON.stringify(output.debug, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default UnifiedVideoCreation;
