import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, CheckCircle, XCircle, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EngineStats {
  engine_name: string;
  total_uses: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_duration_ms: number;
  total_cost: number;
}

export default function EngineUsageAnalytics() {
  const [stats, setStats] = useState<EngineStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalGenerations, setTotalGenerations] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch raw analytics data
      const { data, error } = await supabase
        .from("engine_usage_analytics")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      // Aggregate by engine
      const aggregated: Record<string, EngineStats> = {};
      
      (data || []).forEach((record: any) => {
        const name = record.engine_name;
        if (!aggregated[name]) {
          aggregated[name] = {
            engine_name: name,
            total_uses: 0,
            success_count: 0,
            failure_count: 0,
            success_rate: 0,
            avg_duration_ms: 0,
            total_cost: 0,
          };
        }
        
        aggregated[name].total_uses++;
        if (record.success) {
          aggregated[name].success_count++;
        } else {
          aggregated[name].failure_count++;
        }
        aggregated[name].avg_duration_ms += record.duration_ms || 0;
        aggregated[name].total_cost += parseFloat(record.cost_estimate) || 0;
      });

      // Calculate averages and rates
      const statsArray = Object.values(aggregated).map(s => ({
        ...s,
        success_rate: s.total_uses > 0 ? (s.success_count / s.total_uses) * 100 : 0,
        avg_duration_ms: s.total_uses > 0 ? s.avg_duration_ms / s.total_uses : 0,
      })).sort((a, b) => b.total_uses - a.total_uses);

      setStats(statsArray);
      setTotalGenerations(data?.length || 0);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  const totalSuccess = stats.reduce((acc, s) => acc + s.success_count, 0);
  const totalFailure = stats.reduce((acc, s) => acc + s.failure_count, 0);
  const overallSuccessRate = totalGenerations > 0 ? (totalSuccess / totalGenerations) * 100 : 0;

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Engine Usage Analytics
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Track which AI engines are used most and their success rates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{totalGenerations}</p>
            <p className="text-xs text-muted-foreground">Total Generations</p>
          </div>
          <div className="p-4 bg-green-500/10 rounded-lg text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-500">{overallSuccessRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stats.length}</p>
            <p className="text-xs text-muted-foreground">Engines Used</p>
          </div>
        </div>

        {/* Per-Engine Stats */}
        {stats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No usage data yet</p>
            <p className="text-sm">Start generating videos to see analytics</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Engine Breakdown</h4>
            {stats.map((engine) => (
              <div key={engine.engine_name} className="p-3 bg-muted/20 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{engine.engine_name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {engine.total_uses} uses
                    </Badge>
                    <Badge 
                      className={`text-xs ${
                        engine.success_rate >= 80 
                          ? "bg-green-500/20 text-green-500" 
                          : engine.success_rate >= 50 
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {engine.success_rate.toFixed(0)}% success
                    </Badge>
                  </div>
                </div>
                <Progress value={engine.success_rate} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {engine.success_count} success
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-500" />
                    {engine.failure_count} failed
                  </span>
                  <span>~{(engine.avg_duration_ms / 1000).toFixed(1)}s avg</span>
                  {engine.total_cost > 0 && (
                    <span>${engine.total_cost.toFixed(2)} spent</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
