/**
 * Step 2: Analyze
 * AI deconstruction of uploaded videos
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  RefreshCw, 
  ArrowRight,
  CheckCircle2,
  Brain
} from 'lucide-react';
import { SignalsDisplay } from '@/components/creative-scale/SignalsDisplay';
import type { VideoAnalysis } from '@/lib/creative-scale/types';

interface AnalyzeStepProps {
  analysis: VideoAnalysis | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onContinue: () => void;
}

export function AnalyzeStep({ 
  analysis, 
  isAnalyzing, 
  onAnalyze,
  onContinue 
}: AnalyzeStepProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Analyze Video</h2>
        <p className="text-muted-foreground mt-1">
          AI deconstructs your video to extract structure, pacing, and marketing signals.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1">
        {!analysis && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
            <p className="text-muted-foreground max-w-md mb-8">
              Our AI will identify hooks, benefits, CTAs, pacing patterns, 
              and marketing frameworks used in your video.
            </p>
            <Button 
              size="lg"
              onClick={onAnalyze}
              className="h-12 px-8"
            >
              <Brain className="w-5 h-5 mr-2" />
              Start Analysis
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
              <Brain className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Analyzing Video...</h3>
            <p className="text-muted-foreground max-w-md">
              Extracting marketing signals, identifying structure, and detecting patterns.
            </p>
            <RefreshCw className="w-6 h-6 text-primary animate-spin mt-6" />
          </div>
        )}

        {analysis && !isAnalyzing && (
          <ScrollArea className="h-[calc(100vh-350px)] min-h-[300px]">
            <div className="space-y-6">
              {/* Analysis Complete Badge */}
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">Analysis Complete</span>
              </div>

              {/* Signals Display */}
              <SignalsDisplay analysis={analysis} />

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Segments</p>
                  <p className="text-xl font-bold">{analysis.segments?.length || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-xl font-bold">{analysis.metadata?.duration_ms ? (analysis.metadata.duration_ms / 1000).toFixed(1) + 's' : 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Style</p>
                  <p className="text-xl font-bold capitalize">{analysis.detected_style || 'Mixed'}</p>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Continue CTA */}
      {analysis && (
        <div className="pt-6 border-t border-border mt-auto">
          <Button 
            className="w-full h-12 text-base"
            onClick={onContinue}
          >
            Continue to Strategy
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
