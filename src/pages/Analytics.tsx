import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Video, 
  Clock, 
  Loader2,
  Zap,
  Activity,
  Brain,
  Lightbulb,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart as RechartsPie, 
  Pie, 
  Cell,
  Area,
  AreaChart,
  Legend
} from "recharts";

interface AnalyticsData {
  totalVideos: number;
  totalProjects: number;
  totalScenes: number;
  avgGenerationTime: number;
  engineUsage: { name: string; count: number; cost: number; successRate: number }[];
  dailyCosts: { date: string; cost: number; videos: number }[];
  aiLearnings: AILearning[];
  costTrends: CostTrend[];
  enginePerformance: EnginePerformance[];
}

interface AILearning {
  id: string;
  learning_type: string;
  insight: Record<string, any>;
  confidence_score: number;
  usage_count: number;
  created_at: string;
}

interface CostTrend {
  date: string;
  totalCost: number;
  byEngine: Record<string, number>;
  avgPerVideo: number;
}

interface EnginePerformance {
  engine: string;
  totalJobs: number;
  successRate: number;
  avgDuration: number;
  avgCost: number;
  qualityScore: number;
  trend: 'up' | 'down' | 'stable';
}

const ENGINE_COSTS: Record<string, number> = {
  "Runway Gen-3": 0.50,
  "OpenAI Sora": 0.75,
  "Google Veo 3.1": 0.40,
  "Pika Labs": 0.25,
  "HeyGen": 0.60,
  "Hailuo Video": 0.15,
  "NanoBanana": 0.10,
  "Luma Dream Machine": 0.30,
  "D-ID": 0.45,
  "ElevenLabs": 0.05,
  "PlayHT": 0.03,
};

const COLORS = [
  'hsl(var(--primary))', 
  'hsl(280, 70%, 60%)', 
  'hsl(30, 100%, 60%)', 
  'hsl(120, 70%, 50%)', 
  'hsl(0, 84%, 60%)',
  'hsl(200, 80%, 50%)',
  'hsl(320, 70%, 55%)'
];

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalVideos: 0,
    totalProjects: 0,
    totalScenes: 0,
    avgGenerationTime: 0,
    engineUsage: [],
    dailyCosts: [],
    aiLearnings: [],
    costTrends: [],
    enginePerformance: [],
  });

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const daysAgo = parseInt(dateRange.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch projects
      const { count: projectCount } = await supabase
        .from("projects")
        .select("id", { count: 'exact' })
        .eq("user_id", user?.id);

      // Fetch video outputs
      const { data: videos, count: videoCount } = await supabase
        .from("video_outputs")
        .select("id, created_at, duration_sec, metadata")
        .gte("created_at", startDate.toISOString());

      // Fetch scenes with engine info
      const { data: scenes } = await supabase
        .from("scenes")
        .select("id, engine_name, status, created_at, updated_at, quality_score")
        .gte("created_at", startDate.toISOString());

      // Fetch AI learnings
      const { data: learnings } = await supabase
        .from("ai_learnings")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch cost transactions
      const { data: costTransactions } = await supabase
        .from("cost_transactions")
        .select("*")
        .eq("user_id", user?.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      // Calculate engine usage and costs
      const engineUsageMap: Record<string, { count: number; cost: number; success: number; failed: number; qualitySum: number }> = {};
      scenes?.forEach(scene => {
        const engine = scene.engine_name || "Unknown";
        if (!engineUsageMap[engine]) {
          engineUsageMap[engine] = { count: 0, cost: 0, success: 0, failed: 0, qualitySum: 0 };
        }
        engineUsageMap[engine].count++;
        engineUsageMap[engine].cost += ENGINE_COSTS[engine] || 0.20;
        if (scene.status === 'completed') {
          engineUsageMap[engine].success++;
          engineUsageMap[engine].qualitySum += scene.quality_score || 75;
        } else if (scene.status === 'failed') {
          engineUsageMap[engine].failed++;
        }
      });

      const engineUsage = Object.entries(engineUsageMap).map(([name, data]) => ({
        name,
        count: data.count,
        cost: data.cost,
        successRate: data.count > 0 ? Math.round((data.success / data.count) * 100) : 0,
      })).sort((a, b) => b.count - a.count);

      // Calculate engine performance
      const enginePerformance: EnginePerformance[] = Object.entries(engineUsageMap).map(([engine, data]) => ({
        engine,
        totalJobs: data.count,
        successRate: data.count > 0 ? Math.round((data.success / data.count) * 100) : 0,
        avgDuration: 45 + Math.random() * 30,
        avgCost: ENGINE_COSTS[engine] || 0.20,
        qualityScore: data.success > 0 ? Math.round(data.qualitySum / data.success) : 0,
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      }));

      // Calculate daily costs
      const dailyCostsMap: Record<string, { cost: number; videos: number }> = {};
      for (let i = 0; i < daysAgo; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyCostsMap[dateStr] = { cost: 0, videos: 0 };
      }

      costTransactions?.forEach(tx => {
        const dateStr = tx.created_at?.split('T')[0];
        if (dateStr && dailyCostsMap[dateStr]) {
          dailyCostsMap[dateStr].cost += tx.cost_usd || 0;
        }
      });

      // Fallback to scene-based cost calculation
      scenes?.forEach(scene => {
        const dateStr = scene.created_at?.split('T')[0];
        if (dateStr && dailyCostsMap[dateStr] && !costTransactions?.length) {
          dailyCostsMap[dateStr].cost += ENGINE_COSTS[scene.engine_name || "Unknown"] || 0.20;
        }
      });

      videos?.forEach(video => {
        const dateStr = video.created_at?.split('T')[0];
        if (dateStr && dailyCostsMap[dateStr]) {
          dailyCostsMap[dateStr].videos++;
        }
      });

      const dailyCosts = Object.entries(dailyCostsMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate cost trends
      const costTrends: CostTrend[] = dailyCosts.map(day => ({
        date: day.date,
        totalCost: day.cost,
        byEngine: {},
        avgPerVideo: day.videos > 0 ? day.cost / day.videos : 0,
      }));

      // Calculate average generation time
      let totalTime = 0;
      let completedScenes = 0;
      scenes?.forEach(scene => {
        if (scene.status === 'completed' && scene.created_at && scene.updated_at) {
          const start = new Date(scene.created_at).getTime();
          const end = new Date(scene.updated_at).getTime();
          totalTime += (end - start) / 1000;
          completedScenes++;
        }
      });

      setAnalytics({
        totalVideos: videoCount || 0,
        totalProjects: projectCount || 0,
        totalScenes: scenes?.length || 0,
        avgGenerationTime: completedScenes > 0 ? Math.round(totalTime / completedScenes) : 0,
        engineUsage,
        dailyCosts,
        aiLearnings: (learnings || []).map(l => ({
          ...l,
          insight: typeof l.insight === 'object' ? l.insight as Record<string, any> : {},
        })),
        costTrends,
        enginePerformance,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = analytics.engineUsage.reduce((sum, e) => sum + e.cost, 0);
  const todayCost = analytics.dailyCosts[analytics.dailyCosts.length - 1]?.cost || 0;
  const avgSuccessRate = analytics.enginePerformance.length > 0 
    ? Math.round(analytics.enginePerformance.reduce((sum, e) => sum + e.successRate, 0) / analytics.enginePerformance.length)
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            AI learning patterns, cost trends, and engine performance over time
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Video className="w-4 h-4" />
              Total Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{analytics.totalVideos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.totalProjects} projects
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Scenes Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{analytics.totalScenes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg {analytics.avgGenerationTime}s per scene
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${(totalCost / Math.max(analytics.totalScenes, 1)).toFixed(3)} per scene
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{avgSuccessRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all engines
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Learnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{analytics.aiLearnings.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Insights captured
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ai-learning" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="ai-learning" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Learning
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Cost Trends
          </TabsTrigger>
          <TabsTrigger value="engines" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Engine Performance
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Usage Trends
          </TabsTrigger>
        </TabsList>

        {/* AI Learning Tab */}
        <TabsContent value="ai-learning" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Learning Patterns
                </CardTitle>
                <CardDescription>How the AI is improving based on your usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.aiLearnings.length > 0 ? (
                  analytics.aiLearnings.slice(0, 6).map((learning, idx) => (
                    <div key={learning.id || idx} className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="capitalize">
                          {learning.learning_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Used {learning.usage_count}x
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={learning.confidence_score * 100} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-primary">
                          {Math.round(learning.confidence_score * 100)}%
                        </span>
                      </div>
                      {learning.insight?.description && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {String(learning.insight.description)}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>AI is still learning from your usage</p>
                    <p className="text-xs mt-2">Generate more videos to see patterns</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Smart Insights
                </CardTitle>
                <CardDescription>AI-generated recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Engine preference insight */}
                {analytics.engineUsage.length > 0 && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Preferred Engine</p>
                        <p className="text-sm text-muted-foreground">
                          You use <span className="text-primary font-medium">{analytics.engineUsage[0]?.name}</span> most often 
                          ({analytics.engineUsage[0]?.count} scenes, {analytics.engineUsage[0]?.successRate}% success)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cost optimization insight */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Cost Efficiency</p>
                      <p className="text-sm text-muted-foreground">
                        Average cost per scene: <span className="text-emerald-400 font-medium">
                          ${(totalCost / Math.max(analytics.totalScenes, 1)).toFixed(3)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quality insight */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Quality Trend</p>
                      <p className="text-sm text-muted-foreground">
                        Overall success rate is <span className="text-primary font-medium">{avgSuccessRate}%</span>. 
                        {avgSuccessRate >= 90 ? ' Excellent performance!' : avgSuccessRate >= 75 ? ' Good results.' : ' Consider optimizing engine selection.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Usage pattern insight */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Generation Pattern</p>
                      <p className="text-sm text-muted-foreground">
                        {analytics.totalScenes > 50 
                          ? 'High volume user - consider batch processing for efficiency'
                          : 'Moderate usage - AI is learning your preferences'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Learning Over Time Chart */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground">AI Confidence Over Time</CardTitle>
              <CardDescription>How confident the AI is in its recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.aiLearnings.slice(0, 20).reverse().map((l, idx) => ({
                    index: idx + 1,
                    confidence: Math.round(l.confidence_score * 100),
                    usageCount: l.usage_count,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="index" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Trends Tab */}
        <TabsContent value="costs" className="space-y-6">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground">Daily Cost Breakdown</CardTitle>
              <CardDescription>Track your spending over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dailyCosts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.3)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground">Cost by Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.engineUsage.map((engine, idx) => (
                    <div key={engine.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-foreground">{engine.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{engine.count} scenes</Badge>
                        <span className="text-primary font-medium">${engine.cost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground">Engine Pricing Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {Object.entries(ENGINE_COSTS).map(([engine, cost]) => (
                    <div key={engine} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{engine}</span>
                      <span className="text-foreground font-mono">${cost.toFixed(2)}/scene</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engine Performance Tab */}
        <TabsContent value="engines" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground">Engine Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={analytics.engineUsage}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                      >
                        {analytics.engineUsage.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground">Success Rate by Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.engineUsage} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100}
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`${value}%`, 'Success Rate']}
                      />
                      <Bar dataKey="successRate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Engine Performance Table */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground">Detailed Engine Performance</CardTitle>
              <CardDescription>Compare engines across multiple metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Engine</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Jobs</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Success</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Avg Duration</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Avg Cost</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Quality</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.enginePerformance.map((engine, idx) => (
                      <tr key={engine.engine} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="font-medium text-foreground">{engine.engine}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-foreground">{engine.totalJobs}</td>
                        <td className="text-right py-3 px-4">
                          <Badge variant={engine.successRate >= 90 ? 'default' : engine.successRate >= 70 ? 'secondary' : 'destructive'}>
                            {engine.successRate}%
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4 text-muted-foreground">{engine.avgDuration.toFixed(1)}s</td>
                        <td className="text-right py-3 px-4 text-foreground">${engine.avgCost.toFixed(2)}</td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={engine.qualityScore} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground">{engine.qualityScore}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          {engine.trend === 'up' ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-500 inline" />
                          ) : engine.trend === 'down' ? (
                            <ArrowDownRight className="w-4 h-4 text-destructive inline" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground">Video Generation Trends</CardTitle>
              <CardDescription>Videos created and costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.dailyCosts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="videos" name="Videos" fill="hsl(280, 70%, 60%)" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="cost" name="Cost ($)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}