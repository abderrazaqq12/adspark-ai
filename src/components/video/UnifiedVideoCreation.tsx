import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Video, 
  Zap, 
  Sparkles, 
  Film, 
  DollarSign,
  Cpu,
  Workflow,
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
        <CardContent className="space-y-6">
          {/* Cost Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Mode
            </Label>
            <RadioGroup 
              value={costMode} 
              onValueChange={(v) => setCostMode(v as CostMode)}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              <Label 
                htmlFor="cost-free" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  costMode === 'free' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="free" id="cost-free" />
                <div>
                  <span className="font-medium">Free</span>
                  <p className="text-xs text-muted-foreground">$0 cost</p>
                </div>
              </Label>
              <Label 
                htmlFor="cost-budget" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  costMode === 'budget' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="budget" id="cost-budget" />
                <div>
                  <span className="font-medium">Budget</span>
                  <p className="text-xs text-muted-foreground">Low cost</p>
                </div>
              </Label>
              <Label 
                htmlFor="cost-premium" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  costMode === 'premium' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="premium" id="cost-premium" />
                <div>
                  <span className="font-medium">Premium</span>
                  <p className="text-xs text-muted-foreground">Best quality</p>
                </div>
              </Label>
              <Label 
                htmlFor="cost-ai" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  costMode === 'ai-chooses' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="ai-chooses" id="cost-ai" />
                <div>
                  <span className="font-medium">AI Chooses</span>
                  <p className="text-xs text-muted-foreground">Optimal value</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Quality Preference */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Quality Preference
            </Label>
            <RadioGroup 
              value={qualityPreference} 
              onValueChange={(v) => setQualityPreference(v as QualityPreference)}
              className="grid grid-cols-3 gap-3"
            >
              <Label 
                htmlFor="quality-fast" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  qualityPreference === 'fast' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="fast" id="quality-fast" />
                <div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Fast</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Quick generation</p>
                </div>
              </Label>
              <Label 
                htmlFor="quality-balanced" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  qualityPreference === 'balanced' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="balanced" id="quality-balanced" />
                <div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Balanced</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Good quality</p>
                </div>
              </Label>
              <Label 
                htmlFor="quality-cinematic" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  qualityPreference === 'cinematic' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="cinematic" id="quality-cinematic" />
                <div>
                  <div className="flex items-center gap-1">
                    <Film className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Cinematic</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Premium quality</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Execution Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Execution Engine
            </Label>
            <RadioGroup 
              value={executionMode} 
              onValueChange={(v) => setExecutionMode(v as ExecutionMode)}
              className="grid grid-cols-3 gap-3"
            >
              <Label 
                htmlFor="exec-agent" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  executionMode === 'agent' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="agent" id="exec-agent" />
                <div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium">AI Agent</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Recommended</p>
                </div>
              </Label>
              <Label 
                htmlFor="exec-n8n" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  executionMode === 'n8n' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="n8n" id="exec-n8n" />
                <div>
                  <div className="flex items-center gap-1">
                    <Workflow className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Automation</span>
                  </div>
                  <p className="text-xs text-muted-foreground">n8n workflows</p>
                </div>
              </Label>
              <Label 
                htmlFor="exec-edge" 
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  executionMode === 'edge' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="edge" id="exec-edge" />
                <div>
                  <div className="flex items-center gap-1">
                    <Server className="h-4 w-4 text-green-500" />
                    <span className="font-medium">High-Performance</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Direct API</p>
                </div>
              </Label>
            </RadioGroup>
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

          {/* Aspect Ratio */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Aspect Ratio</Label>
            <div className="flex gap-2 flex-wrap">
              {(['9:16', '16:9', '1:1', '4:5'] as const).map((ratio) => (
                <Button
                  key={ratio}
                  variant={aspectRatio === ratio ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAspectRatio(ratio)}
                >
                  {ratio}
                </Button>
              ))}
            </div>
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
