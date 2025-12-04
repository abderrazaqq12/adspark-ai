import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Video, 
  Clock, 
  Loader2,
  Zap,
  PieChart,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, Pie, Cell } from "recharts";

interface AnalyticsData {
  totalVideos: number;
  totalProjects: number;
  totalScenes: number;
  avgGenerationTime: number;
  engineUsage: { name: string; count: number; cost: number }[];
  dailyCosts: { date: string; cost: number; videos: number }[];
  monthlyUsage: { month: string; videos: number; cost: number }[];
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

const COLORS = ['hsl(180, 95%, 50%)', 'hsl(280, 70%, 60%)', 'hsl(30, 100%, 60%)', 'hsl(120, 70%, 50%)', 'hsl(0, 84%, 60%)'];

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
    monthlyUsage: [],
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
      const { data: projects, count: projectCount } = await supabase
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
        .select("id, engine_name, status, created_at, updated_at")
        .gte("created_at", startDate.toISOString());

      // Calculate engine usage and costs
      const engineUsageMap: Record<string, { count: number; cost: number }> = {};
      scenes?.forEach(scene => {
        const engine = scene.engine_name || "Unknown";
        if (!engineUsageMap[engine]) {
          engineUsageMap[engine] = { count: 0, cost: 0 };
        }
        engineUsageMap[engine].count++;
        engineUsageMap[engine].cost += ENGINE_COSTS[engine] || 0.20;
      });

      const engineUsage = Object.entries(engineUsageMap).map(([name, data]) => ({
        name,
        count: data.count,
        cost: data.cost,
      })).sort((a, b) => b.count - a.count);

      // Calculate daily costs
      const dailyCostsMap: Record<string, { cost: number; videos: number }> = {};
      for (let i = 0; i < daysAgo; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyCostsMap[dateStr] = { cost: 0, videos: 0 };
      }

      scenes?.forEach(scene => {
        const dateStr = scene.created_at?.split('T')[0];
        if (dateStr && dailyCostsMap[dateStr]) {
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
        monthlyUsage: [], // Simplified for now
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = analytics.engineUsage.reduce((sum, e) => sum + e.cost, 0);
  const todayCost = analytics.dailyCosts[analytics.dailyCosts.length - 1]?.cost || 0;

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
          <h1 className="text-4xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Track video performance, generation costs, and usage statistics
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <Activity className="w-4 h-4" />
              Today's Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">${todayCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on API usage
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="costs" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="engines">Engine Usage</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="costs" className="space-y-6">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground">Daily Costs</CardTitle>
              <CardDescription>API and generation costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.dailyCosts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(180, 5%, 65%)"
                      tick={{ fill: 'hsl(180, 5%, 65%)', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="hsl(180, 5%, 65%)"
                      tick={{ fill: 'hsl(180, 5%, 65%)', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(220, 13%, 9%)', 
                        border: '1px solid hsl(220, 10%, 18%)',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: 'hsl(180, 5%, 98%)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="hsl(180, 95%, 50%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(180, 95%, 50%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
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
                <div className="space-y-2">
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
                        labelLine={{ stroke: 'hsl(180, 5%, 65%)' }}
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
                <CardTitle className="text-foreground">Usage by Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.engineUsage} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                      <XAxis type="number" stroke="hsl(180, 5%, 65%)" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100}
                        stroke="hsl(180, 5%, 65%)"
                        tick={{ fill: 'hsl(180, 5%, 65%)', fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(220, 13%, 9%)', 
                          border: '1px solid hsl(220, 10%, 18%)',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(180, 95%, 50%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground">Video Generation Trends</CardTitle>
              <CardDescription>Videos created over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.dailyCosts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(180, 5%, 65%)"
                      tick={{ fill: 'hsl(180, 5%, 65%)', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="hsl(180, 5%, 65%)"
                      tick={{ fill: 'hsl(180, 5%, 65%)', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(220, 13%, 9%)', 
                        border: '1px solid hsl(220, 10%, 18%)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="videos" fill="hsl(280, 70%, 60%)" radius={[4, 4, 0, 0]} />
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
