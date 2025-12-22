/**
 * Cost & Usage Snapshot - SECTION 4
 * Shows aggregated AI + infra costs with breakdown
 * READ-ONLY - Estimates only, not invoices
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  FileText,
  Image,
  Video,
  Mic,
  Server,
  HardDrive,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CostBreakdown {
  llm: number;
  image: number;
  video: number;
  audio: number;
  vps: number;
  storage: number;
}

interface CostData {
  todayTotal: number;
  yesterdayTotal: number;
  changePercent: number;
  changeDirection: 'up' | 'down' | 'same';
  breakdown: CostBreakdown;
  mainDriver: keyof CostBreakdown | null;
  isAvailable: boolean;
}

const categoryConfig: Record<keyof CostBreakdown, { 
  label: string; 
  icon: any; 
  color: string;
}> = {
  llm: { label: 'AI Text / LLM', icon: FileText, color: 'text-purple-500' },
  image: { label: 'AI Image Generation', icon: Image, color: 'text-blue-500' },
  video: { label: 'AI Video Generation', icon: Video, color: 'text-green-500' },
  audio: { label: 'Audio / Voice', icon: Mic, color: 'text-amber-500' },
  vps: { label: 'VPS Rendering', icon: Server, color: 'text-cyan-500' },
  storage: { label: 'Storage Usage', icon: HardDrive, color: 'text-slate-500' }
};

export function CostUsageSnapshot() {
  const [costData, setCostData] = useState<CostData>({
    todayTotal: 0,
    yesterdayTotal: 0,
    changePercent: 0,
    changeDirection: 'same',
    breakdown: { llm: 0, image: 0, video: 0, audio: 0, vps: 0, storage: 0 },
    mainDriver: null,
    isAvailable: true
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCostData();

    // Subscribe to cost updates
    const channel = supabase
      .channel('cost-snapshot')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cost_transactions' }, fetchCostData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCostData = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      
      const yesterdayEnd = new Date(todayStart);

      // Fetch today's costs
      const { data: todayCosts, error: todayError } = await supabase
        .from('cost_transactions')
        .select('cost_usd, operation_type, engine_name, pipeline_stage')
        .gte('created_at', todayStart.toISOString());

      // Fetch yesterday's costs
      const { data: yesterdayCosts, error: yesterdayError } = await supabase
        .from('cost_transactions')
        .select('cost_usd')
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', yesterdayEnd.toISOString());

      if (todayError || yesterdayError) {
        setCostData(prev => ({ ...prev, isAvailable: false }));
        return;
      }

      // Calculate totals
      const todayTotal = todayCosts?.reduce((sum, c) => sum + (c.cost_usd || 0), 0) || 0;
      const yesterdayTotal = yesterdayCosts?.reduce((sum, c) => sum + (c.cost_usd || 0), 0) || 0;

      // Calculate change
      let changePercent = 0;
      let changeDirection: 'up' | 'down' | 'same' = 'same';
      
      if (yesterdayTotal > 0) {
        changePercent = Math.abs(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100);
        changeDirection = todayTotal > yesterdayTotal ? 'up' : todayTotal < yesterdayTotal ? 'down' : 'same';
      } else if (todayTotal > 0) {
        changePercent = 100;
        changeDirection = 'up';
      }

      // Calculate breakdown by category
      const breakdown: CostBreakdown = { llm: 0, image: 0, video: 0, audio: 0, vps: 0, storage: 0 };
      
      todayCosts?.forEach(cost => {
        const type = cost.operation_type?.toLowerCase() || '';
        const engine = cost.engine_name?.toLowerCase() || '';
        const stage = cost.pipeline_stage?.toLowerCase() || '';
        const amount = cost.cost_usd || 0;

        if (type.includes('text') || type.includes('llm') || type.includes('script') || type.includes('prompt') || engine.includes('gpt') || engine.includes('gemini') || engine.includes('claude')) {
          breakdown.llm += amount;
        } else if (type.includes('image') || stage.includes('image')) {
          breakdown.image += amount;
        } else if (type.includes('video') || stage.includes('video') || type.includes('generation')) {
          breakdown.video += amount;
        } else if (type.includes('audio') || type.includes('voice') || type.includes('speech') || engine.includes('elevenlabs')) {
          breakdown.audio += amount;
        } else if (engine.includes('ffmpeg') || engine.includes('vps') || type.includes('render')) {
          breakdown.vps += amount;
        } else if (type.includes('storage') || type.includes('upload')) {
          breakdown.storage += amount;
        } else {
          // Default to LLM for unclassified
          breakdown.llm += amount;
        }
      });

      // Find main cost driver
      let mainDriver: keyof CostBreakdown | null = null;
      let maxCost = 0;
      
      for (const [key, value] of Object.entries(breakdown)) {
        if (value > maxCost) {
          maxCost = value;
          mainDriver = key as keyof CostBreakdown;
        }
      }

      setCostData({
        todayTotal,
        yesterdayTotal,
        changePercent,
        changeDirection,
        breakdown,
        mainDriver: maxCost > 0 ? mainDriver : null,
        isAvailable: true
      });
    } catch (error) {
      console.error('Error fetching cost data:', error);
      setCostData(prev => ({ ...prev, isAvailable: false }));
    } finally {
      setIsLoading(false);
    }
  };

  const formatCost = (cost: number): string => {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return '<$0.01';
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  const nonZeroBreakdown = Object.entries(costData.breakdown)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a);

  if (!costData.isAvailable && !isLoading) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            Cost & Usage (Today)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-amber-600 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Cost tracking unavailable</p>
              <p className="text-xs text-amber-600/80">
                Backend cost service is not responding. Data will sync when connection is restored.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Cost & Usage (Today)
          <Badge variant="outline" className="text-[9px] ml-2">
            ESTIMATED
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Total Cost Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Cost Today</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {formatCost(costData.todayTotal)}
              </p>
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              costData.changeDirection === 'up' && "bg-amber-500/10 text-amber-600",
              costData.changeDirection === 'down' && "bg-green-500/10 text-green-600",
              costData.changeDirection === 'same' && "bg-muted text-muted-foreground"
            )}>
              {costData.changeDirection === 'up' && <TrendingUp className="w-3 h-3" />}
              {costData.changeDirection === 'down' && <TrendingDown className="w-3 h-3" />}
              {costData.changeDirection === 'same' && <Minus className="w-3 h-3" />}
              {costData.changePercent > 0 ? `${costData.changePercent.toFixed(0)}%` : 'Same'}
              <span className="text-muted-foreground ml-1">vs yesterday</span>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        {nonZeroBreakdown.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Breakdown
            </h4>
            <div className="space-y-2">
              {nonZeroBreakdown.map(([key, value]) => {
                const config = categoryConfig[key as keyof CostBreakdown];
                const Icon = config.icon;
                const percentage = costData.todayTotal > 0 
                  ? ((value / costData.todayTotal) * 100).toFixed(0) 
                  : '0';
                
                return (
                  <div 
                    key={key}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4", config.color)} />
                      <span className="text-sm text-foreground">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{percentage}%</span>
                      <span className="text-sm font-medium text-foreground w-16 text-right">
                        {formatCost(value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Cost Driver */}
        {costData.mainDriver && (
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Main Cost Driver Today:
              </span>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-600">
                {categoryConfig[costData.mainDriver].label}
              </Badge>
            </div>
          </div>
        )}

        {/* Empty state - with explanation */}
        {nonZeroBreakdown.length === 0 && !isLoading && costData.isAvailable && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">$0.00 today</p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                No AI jobs have been executed today.
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                Costs are tracked when you run AI generation, video rendering, or voice synthesis.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}