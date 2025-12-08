import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useAIBrain } from '@/hooks/useAIBrain';

interface AIBrainRecommendationsProps {
  projectId?: string;
  stage?: string;
  language?: string;
  market?: string;
  onActionClick?: (action: string, data?: any) => void;
}

interface Recommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
  [key: string]: any;
}

const PRIORITY_STYLES = {
  high: {
    icon: AlertTriangle,
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    text: 'text-destructive',
    badge: 'destructive',
  },
  medium: {
    icon: Lightbulb,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-500',
    badge: 'secondary',
  },
  low: {
    icon: CheckCircle,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-500',
    badge: 'outline',
  },
};

const ACTION_LABELS: Record<string, string> = {
  go_to_stage_0: 'Go to Product Info',
  regenerate_scenes: 'Regenerate Scenes',
  apply_default: 'Apply Setting',
  learn_more: 'Learn More',
};

export function AIBrainRecommendations({ 
  projectId, 
  stage, 
  language, 
  market,
  onActionClick 
}: AIBrainRecommendationsProps) {
  const { getRecommendations } = useAIBrain();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const recs = await getRecommendations({
        project_id: projectId,
        stage,
        language,
        market,
      });
      setRecommendations(recs);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [projectId, stage]);

  const handleAction = (recommendation: Recommendation) => {
    onActionClick?.(recommendation.action, recommendation);
  };

  if (!projectId) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" />
            AI Brain Insights
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Analyzing your project...
          </div>
        ) : error ? (
          <div className="text-sm text-destructive py-2">
            Failed to load recommendations
          </div>
        ) : recommendations.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            No issues detected. Your project looks great!
          </div>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec, index) => {
              const style = PRIORITY_STYLES[rec.priority];
              const Icon = style.icon;

              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${style.bg} ${style.border}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 ${style.text}`} />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm">{rec.message}</p>
                        <Badge variant={style.badge as any} className="text-xs shrink-0">
                          {rec.priority}
                        </Badge>
                      </div>
                      {rec.action !== 'learn_more' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(rec)}
                          className="h-7 text-xs gap-1"
                        >
                          {ACTION_LABELS[rec.action] || rec.action}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
