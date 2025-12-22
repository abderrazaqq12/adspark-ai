/**
 * Operational Metrics Panel - Real cost and performance data
 * Shows avg cost per video, FFmpeg vs AI usage, render times
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  Clock, 
  Server, 
  Cpu,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Metrics {
  avgCost24h: number;
  avgCost7d: number;
  ffmpegUsagePercent: number;
  aiFallbackCount: number;
  avgRenderTime: number;
  totalJobs24h: number;
}

export function OperationalMetricsPanel() {
  const [metrics, setMetrics] = useState<Metrics>({
    avgCost24h: 0,
    avgCost7d: 0,
    ffmpegUsagePercent: 100,
    aiFallbackCount: 0,
    avgRenderTime: 0,
    totalJobs24h: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch cost data from cost_transactions
      const { data: costs24h } = await supabase
        .from('cost_transactions')
        .select('cost_usd, engine_name, duration_sec')
        .gte('created_at', last24h);

      const { data: costs7d } = await supabase
        .from('cost_transactions')
        .select('cost_usd')
        .gte('created_at', last7d);

      // Fetch completed jobs for render time calculation
      const { data: completedJobs } = await supabase
        .from('pipeline_jobs')
        .select('started_at, completed_at, input_data')
        .eq('status', 'completed')
        .gte('completed_at', last24h);

      // Calculate metrics
      let avgCost24h = 0;
      let ffmpegCount = 0;
      let aiCount = 0;
      let aiFallbackCount = 0;

      if (costs24h && costs24h.length > 0) {
        const totalCost = costs24h.reduce((sum, c) => sum + (c.cost_usd || 0), 0);
        avgCost24h = totalCost / costs24h.length;

        costs24h.forEach(c => {
          const engine = c.engine_name?.toLowerCase() || '';
          if (engine.includes('ffmpeg') || engine.includes('vps')) {
            ffmpegCount++;
          } else {
            aiCount++;
            if (engine.includes('fallback') || engine.includes('lovable')) {
              aiFallbackCount++;
            }
          }
        });
      }

      const avgCost7d = costs7d && costs7d.length > 0
        ? costs7d.reduce((sum, c) => sum + (c.cost_usd || 0), 0) / costs7d.length
        : 0;

      const totalEngineUsage = ffmpegCount + aiCount;
      const ffmpegUsagePercent = totalEngineUsage > 0 
        ? Math.round((ffmpegCount / totalEngineUsage) * 100) 
        : 100;

      // Calculate average render time
      let totalRenderTime = 0;
      let renderCount = 0;

      if (completedJobs) {
        completedJobs.forEach(job => {
          if (job.started_at && job.completed_at) {
            const start = new Date(job.started_at).getTime();
            const end = new Date(job.completed_at).getTime();
            const duration = (end - start) / 1000; // seconds
            if (duration > 0 && duration < 3600) { // Ignore invalid durations
              totalRenderTime += duration;
              renderCount++;
            }
          }
        });
      }

      const avgRenderTime = renderCount > 0 ? Math.round(totalRenderTime / renderCount) : 0;

      setMetrics({
        avgCost24h,
        avgCost7d,
        ffmpegUsagePercent,
        aiFallbackCount,
        avgRenderTime,
        totalJobs24h: completedJobs?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const MetricCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subvalue,
    highlight = false 
  }: { 
    icon: any; 
    label: string; 
    value: string; 
    subvalue?: string;
    highlight?: boolean;
  }) => (
    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
      {subvalue && (
        <p className="text-xs text-muted-foreground mt-1">{subvalue}</p>
      )}
    </div>
  );

  const formatCost = (cost: number): string => {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '-';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            icon={DollarSign}
            label="Avg Cost (24h)"
            value={formatCost(metrics.avgCost24h)}
            subvalue={`7d avg: ${formatCost(metrics.avgCost7d)}`}
          />
          <MetricCard 
            icon={Server}
            label="VPS/FFmpeg Usage"
            value={`${metrics.ffmpegUsagePercent}%`}
            subvalue={`${100 - metrics.ffmpegUsagePercent}% AI`}
            highlight={metrics.ffmpegUsagePercent >= 80}
          />
          <MetricCard 
            icon={AlertCircle}
            label="AI Fallback Triggers"
            value={metrics.aiFallbackCount.toString()}
            subvalue="Last 24 hours"
          />
          <MetricCard 
            icon={Clock}
            label="Avg Render Time"
            value={formatTime(metrics.avgRenderTime)}
            subvalue={`${metrics.totalJobs24h} jobs today`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
