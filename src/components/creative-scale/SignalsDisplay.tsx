/**
 * Signals Display Component
 * PRD-aligned: Shows attention score, pacing curve, detected segments, framework candidates
 */

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  Zap, 
  Target,
  User,
  Package,
  TrendingUp
} from 'lucide-react';
import type { VideoAnalysis } from '@/lib/creative-scale/types';

interface SignalsDisplayProps {
  analysis: VideoAnalysis;
}

export function SignalsDisplay({ analysis }: SignalsDisplayProps) {
  // Calculate average attention score
  const avgAttention = analysis.segments.length > 0
    ? analysis.segments.reduce((sum, seg) => sum + seg.attention_score, 0) / analysis.segments.length
    : 0;

  // Extract pacing curve from segments
  const pacingCurve = analysis.segments.map(seg => seg.pacing_score);
  
  // Detect talking head & product demo from visual tags
  const hasTalkingHead = analysis.segments.some(seg => 
    seg.visual_tags.includes('face') || seg.visual_tags.includes('testimonial')
  );
  const hasProductDemo = analysis.segments.some(seg => 
    seg.visual_tags.includes('product') || seg.visual_tags.includes('demo')
  );

  // Framework candidates based on detected patterns
  const frameworkCandidates = detectFrameworks(analysis);

  return (
    <div className="space-y-6">
      {/* Primary Signals */}
      <div className="grid grid-cols-2 gap-4">
        {/* Attention Score */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Attention Score</span>
          </div>
          <div className="text-3xl font-bold mb-2">
            {Math.round(avgAttention * 100)}
          </div>
          <Progress value={avgAttention * 100} className="h-2" />
        </div>

        {/* CTA Strength */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">CTA Strength</span>
          </div>
          <div className="text-3xl font-bold mb-2">
            {Math.round(analysis.overall_scores.cta_effectiveness * 100)}%
          </div>
          <Progress value={analysis.overall_scores.cta_effectiveness * 100} className="h-2" />
        </div>
      </div>

      {/* Pacing Curve */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Pacing Curve</span>
        </div>
        <div className="flex items-end gap-1 h-12">
          {pacingCurve.map((value, idx) => (
            <div
              key={idx}
              className="flex-1 bg-primary/60 rounded-t transition-all hover:bg-primary"
              style={{ height: `${value * 100}%` }}
              title={`Segment ${idx + 1}: ${Math.round(value * 100)}%`}
            />
          ))}
          {pacingCurve.length === 0 && (
            <div className="text-xs text-muted-foreground">No pacing data</div>
          )}
        </div>
      </div>

      {/* Detection Badges */}
      <div className="flex items-center gap-3 flex-wrap">
        {hasTalkingHead && (
          <Badge variant="secondary" className="gap-1">
            <User className="w-3 h-3" />
            Talking Head
          </Badge>
        )}
        {hasProductDemo && (
          <Badge variant="secondary" className="gap-1">
            <Package className="w-3 h-3" />
            Product Demo
          </Badge>
        )}
        {analysis.audio.has_voiceover && (
          <Badge variant="secondary">Has Voiceover</Badge>
        )}
        {analysis.audio.has_music && (
          <Badge variant="secondary">Has Music</Badge>
        )}
      </div>

      {/* Detected Segments */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Detected Segments
        </h4>
        <div className="flex gap-1">
          {analysis.segments.map((seg, idx) => (
            <div
              key={idx}
              className="flex-1 h-8 rounded flex items-center justify-center text-xs font-medium"
              style={{
                backgroundColor: getSegmentColor(seg.type),
                minWidth: `${((seg.end_ms - seg.start_ms) / analysis.metadata.duration_ms) * 100}%`
              }}
            >
              {seg.type}
            </div>
          ))}
        </div>
      </div>

      {/* Framework Candidates */}
      <div>
        <h4 className="text-sm font-medium mb-2">Framework Candidates</h4>
        <div className="flex gap-2">
          {frameworkCandidates.map((fw, idx) => (
            <Badge 
              key={fw.name} 
              variant={idx === 0 ? 'default' : 'outline'}
              className="gap-1"
            >
              {fw.name}
              <span className="text-xs opacity-70">({fw.confidence}%)</span>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper: Detect framework candidates
function detectFrameworks(analysis: VideoAnalysis): { name: string; confidence: number }[] {
  const frameworks: { name: string; confidence: number }[] = [];
  
  const hasHook = analysis.segments.some(s => s.type === 'hook');
  const hasProblem = analysis.segments.some(s => s.type === 'problem');
  const hasSolution = analysis.segments.some(s => s.type === 'solution');
  const hasBenefit = analysis.segments.some(s => s.type === 'benefit');
  const hasCta = analysis.segments.some(s => s.type === 'cta');
  
  // PAS: Problem, Agitate, Solution
  if (hasProblem && hasSolution) {
    frameworks.push({ name: 'PAS', confidence: 85 });
  }
  
  // AIDA: Attention, Interest, Desire, Action
  if (hasHook && hasCta) {
    frameworks.push({ name: 'AIDA', confidence: 75 });
  }
  
  // FAB: Features, Advantages, Benefits
  if (hasBenefit) {
    frameworks.push({ name: 'FAB', confidence: 70 });
  }
  
  // UGC style
  if (analysis.detected_style === 'ugc') {
    frameworks.push({ name: 'UGC', confidence: 80 });
  }
  
  // Sort by confidence
  return frameworks.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

// Helper: Get segment color
function getSegmentColor(type: string): string {
  const colors: Record<string, string> = {
    hook: 'hsl(var(--primary) / 0.3)',
    problem: 'hsl(0, 60%, 50%, 0.3)',
    solution: 'hsl(120, 60%, 40%, 0.3)',
    benefit: 'hsl(200, 60%, 50%, 0.3)',
    proof: 'hsl(280, 60%, 50%, 0.3)',
    cta: 'hsl(45, 90%, 50%, 0.3)',
    filler: 'hsl(0, 0%, 50%, 0.2)',
    demo: 'hsl(180, 60%, 40%, 0.3)'
  };
  return colors[type] || 'hsl(0, 0%, 50%, 0.2)';
}
