/**
 * RenderFlow Step 2: Analyze
 * Full Creative Scale-style AI deconstruction
 */

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  RefreshCw, 
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Brain
} from 'lucide-react';
import { SignalsDisplay } from '@/components/creative-scale/SignalsDisplay';
import type { VideoAnalysis } from '@/lib/creative-scale/types';

interface AnalyzeStepProps {
  sourceUrl: string;
  analysis: VideoAnalysis | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export function AnalyzeStep({ 
  sourceUrl,
  analysis, 
  isAnalyzing, 
  onAnalyze,
  onContinue,
  onBack
}: AnalyzeStepProps) {
  return (
    <div className="space-y-4">
      {/* Source Summary */}
      <div className="p-3 bg-muted rounded border border-border">
        <p className="text-xs text-muted-foreground mb-1">Source Video</p>
        <p className="font-mono text-sm truncate">{sourceUrl}</p>
      </div>

      {/* Content */}
      {!analysis && !isAnalyzing && (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-2">Ready to Analyze</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            AI will identify hooks, benefits, CTAs, pacing patterns, 
            and marketing frameworks in your video.
          </p>
          <Button onClick={onAnalyze} className="h-10 px-6">
            <Brain className="w-4 h-4 mr-2" />
            Start Analysis
          </Button>
        </div>
      )}

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-2">Analyzing Video...</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Extracting marketing signals and detecting patterns.
          </p>
          <RefreshCw className="w-5 h-5 text-primary animate-spin mt-4" />
        </div>
      )}

      {analysis && !isAnalyzing && (
        <ScrollArea className="h-[320px]">
          <div className="space-y-4">
            {/* Analysis Complete Badge */}
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Analysis Complete</span>
            </div>

            {/* Signals Display */}
            <SignalsDisplay analysis={analysis} />

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Segments</p>
                <p className="text-lg font-bold">{analysis.segments?.length || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-lg font-bold">{analysis.metadata?.duration_ms ? (analysis.metadata.duration_ms / 1000).toFixed(1) + 's' : 'N/A'}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Style</p>
                <p className="text-lg font-bold capitalize">{analysis.detected_style || 'Mixed'}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {analysis && (
          <Button onClick={onContinue} className="flex-1">
            Continue to Strategy
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
