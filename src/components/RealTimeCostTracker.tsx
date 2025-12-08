import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, Cpu, Clock } from 'lucide-react';
import { useRealTimeCost } from '@/hooks/useRealTimeCost';

interface RealTimeCostTrackerProps {
  projectId?: string;
  budget?: number;
}

const STAGE_LABELS: Record<string, string> = {
  product_content: 'Product Content',
  image_generation: 'Image Generation',
  landing_page: 'Landing Page',
  voiceover: 'Voiceover',
  scene_builder: 'Scene Builder',
  video_generation: 'Video Generation',
  assembly: 'Assembly',
  export: 'Export',
};

const ENGINE_COLORS: Record<string, string> = {
  gemini: 'bg-blue-500',
  gpt: 'bg-emerald-500',
  runway: 'bg-purple-500',
  sora: 'bg-orange-500',
  veo: 'bg-cyan-500',
  pika: 'bg-pink-500',
  heygen: 'bg-indigo-500',
  elevenlabs: 'bg-amber-500',
  nanobanana: 'bg-lime-500',
  ffmpeg: 'bg-slate-500',
};

export function RealTimeCostTracker({ projectId, budget = 10 }: RealTimeCostTrackerProps) {
  const { costs, isLoading, projectCost, estimatedTotal } = useRealTimeCost(projectId);

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const budgetUsed = (projectCost / budget) * 100;
  const isOverBudget = projectCost > budget;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="h-4 w-4 text-primary" />
          Real-Time Cost Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Cost */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">
              ${projectCost.toFixed(2)}
              <span className="text-sm text-muted-foreground font-normal ml-1">
                / ${budget.toFixed(2)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Est. total: ${estimatedTotal.toFixed(2)}
            </p>
          </div>
          <Badge variant={isOverBudget ? 'destructive' : 'secondary'}>
            {budgetUsed.toFixed(0)}% used
          </Badge>
        </div>

        {/* Budget Progress */}
        <Progress 
          value={Math.min(budgetUsed, 100)} 
          className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
        />

        {/* Cost by Stage */}
        {Object.keys(costs.byStage).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">By Stage</p>
            <div className="space-y-1">
              {Object.entries(costs.byStage).map(([stage, cost]) => (
                <div key={stage} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {STAGE_LABELS[stage] || stage}
                  </span>
                  <span className="font-mono">${cost.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost by Engine */}
        {Object.keys(costs.byEngine).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              By Engine
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(costs.byEngine).map(([engine, cost]) => (
                <Badge 
                  key={engine} 
                  variant="outline" 
                  className="text-xs"
                >
                  <span 
                    className={`w-2 h-2 rounded-full mr-1 ${ENGINE_COLORS[engine.toLowerCase()] || 'bg-gray-500'}`} 
                  />
                  {engine}: ${cost.toFixed(3)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {costs.transactions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Recent
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {costs.transactions.slice(0, 5).map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                >
                  <span className="truncate flex-1">
                    {tx.engine_name} • {tx.operation_type}
                  </span>
                  <span className="font-mono text-primary ml-2">
                    +${tx.cost_usd.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
