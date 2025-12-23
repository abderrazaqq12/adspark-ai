import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Video,
  Zap,
  Activity,
  Brain,
  Lightbulb,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  FileText,
  Music,
  Image,
  Film,
  CalendarIcon,
  RefreshCw
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
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { SectionCard, StatCard } from "@/components/ui/section-card";
import { LoadingState, EmptyState } from "@/components/ui/page-components";

// Content type categories mapped to pipeline stages
const CONTENT_TYPES = {
  text: ['product_content', 'script_generation', 'landing_page', 'marketing_content', 'creative_scale_analyze', 'creative_scale_strategy'],
  audio: ['voiceover', 'audio_generation', 'voice_synthesis'],
  image: ['image_generation', 'thumbnail', 'product_image'],
  video: ['video_generation', 'scene_generation', 'assembly', 'export', 'creative_scale_render']
};

const CONTENT_TYPE_ICONS = {
  text: FileText,
  audio: Music,
  image: Image,
  video: Film
};

const CONTENT_TYPE_COLORS = {
  text: 'hsl(200, 80%, 50%)',
  audio: 'hsl(280, 70%, 60%)',
  image: 'hsl(30, 100%, 60%)',
  video: 'hsl(var(--primary))'
};

interface ContentTypeStats {
  type: 'text' | 'audio' | 'image' | 'video';
  count: number;
  cost: number;
  avgCost: number;
  successRate: number;
}

interface AnalyticsData {
  totalVideos: number;
  totalProjects: number;
  totalScenes: number;
  avgGenerationTime: number;
  engineUsage: { name: string; count: number; cost: number; successRate: number }[];
  dailyCosts: { date: string; cost: number; videos: number; text: number; audio: number; image: number; video: number }[];
  aiLearnings: AILearning[];
  costTrends: CostTrend[];
  enginePerformance: EnginePerformance[];
  contentTypeStats: ContentTypeStats[];
  totalCost: number;
  totalGenerations: number;
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
  "Gemini": 0.01,
  "ChatGPT": 0.02,
  "Lovable AI": 0.005,
  "google/gemini-2.5-flash": 0.002,
  "google/gemini-2.5-pro": 0.005,
  "openai/gpt-5": 0.01,
  "openai/gpt-5-mini": 0.003,
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

const DATE_PRESETS = [
  { label: 'Today', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 },
];

function getContentType(stage: string): 'text' | 'audio' | 'image' | 'video' | null {
  for (const [type, stages] of Object.entries(CONTENT_TYPES)) {
    if (stages.some(s => stage.toLowerCase().includes(s.toLowerCase()))) {
      return type as 'text' | 'audio' | 'image' | 'video';
    }
  }
  return null;
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
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
    contentTypeStats: [],
    totalCost: 0,
    totalGenerations: 0,
  });

  useEffect(() => {
    const isSelfHosted = import.meta.env.VITE_DEPLOYMENT_MODE === 'self-hosted' || import.meta.env.VITE_DEPLOYMENT_MODE === 'vps';
    if ((user || isSelfHosted) && dateRange.from && dateRange.to) fetchAnalytics();
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    if (!dateRange.from || !dateRange.to) return;

    setLoading(true);
    try {
      const isSelfHosted = import.meta.env.VITE_DEPLOYMENT_MODE === 'self-hosted';
      const startDate = startOfDay(dateRange.from);
      const endDate = endOfDay(dateRange.to);

      // In self-hosted mode, we fetch from our local API health stats which contains the specific counters
      if (isSelfHosted) {
        try {
          const apiUrl = import.meta.env.VITE_REST_API_URL;
          const healthUrl = `${apiUrl || ''}/health`.replace('//health', '/health');
          const res = await fetch(healthUrl);
          const data = await res.json();

          // Transform health queue stats into analytics format
          // The backend exposes: completed, failed, total, failed24h
          const queue = data.queue || { completed: 0, failed: 0, total: 0 };

          setAnalytics({
            totalVideos: queue.completed, // Real completed jobs
            totalProjects: 1, // Single user project mostly
            totalScenes: queue.total,
            avgGenerationTime: 45, // Estimate
            engineUsage: [{ name: 'FFmpeg (Local)', count: queue.total, cost: 0, successRate: 100 }],
            dailyCosts: [], // No costs in self-hosted
            aiLearnings: [],
            costTrends: [],
            enginePerformance: [],
            contentTypeStats: [
              { type: 'video', count: queue.completed, cost: 0, avgCost: 0, successRate: queue.total > 0 ? (queue.completed / queue.total) * 100 : 0 }
            ],
            totalCost: 0, // Always $0 in VPS
            totalGenerations: queue.total,
          });
          setLoading(false);
          return;
        } catch (e) {
          console.warn("Used fallback analytics due to API fetch failure");
        }
      }

      // Fetch cost transactions (primary source of truth)
      const { data: costTransactions } = await supabase
        .from("cost_transactions")
        .select("*")
        .eq("user_id", user?.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      // Fetch projects
      const { count: projectCount } = await supabase
        .from("projects")
        .select("id", { count: 'exact' })
        .eq("user_id", user?.id);

      // Fetch video outputs
      const { data: videos, count: videoCount } = await supabase
        .from("video_outputs")
        .select("id, created_at, duration_sec, metadata")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch scenes with engine info
      const { data: scenes } = await supabase
        .from("scenes")
        .select("id, engine_name, status, created_at, updated_at, quality_score")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch generated images
      const { data: images } = await supabase
        .from("generated_images")
        .select("id, engine_name, status, created_at")
        .eq("user_id", user?.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch marketing content (text)
      const { data: marketingContent } = await supabase
        .from("marketing_content")
        .select("id, content_type, created_at")
        .eq("user_id", user?.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch landing pages (text)
      const { data: landingPages } = await supabase
        .from("landing_pages")
        .select("id, created_at")
        .eq("user_id", user?.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch scripts (text)
      const { data: scripts } = await supabase
        .from("scripts")
        .select("id, created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch AI learnings
      const { data: learnings } = await supabase
        .from("ai_learnings")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Calculate content type stats from cost_transactions
      const contentStats: Record<string, { count: number; cost: number; success: number; failed: number }> = {
        text: { count: 0, cost: 0, success: 0, failed: 0 },
        audio: { count: 0, cost: 0, success: 0, failed: 0 },
        image: { count: 0, cost: 0, success: 0, failed: 0 },
        video: { count: 0, cost: 0, success: 0, failed: 0 },
      };

      let totalCost = 0;
      let totalGenerations = 0;

      costTransactions?.forEach(tx => {
        totalCost += tx.cost_usd || 0;
        totalGenerations++;

        const contentType = getContentType(tx.pipeline_stage || tx.operation_type || '');
        if (contentType) {
          contentStats[contentType].count++;
          contentStats[contentType].cost += tx.cost_usd || 0;
          contentStats[contentType].success++;
        }
      });

      // Add counts from actual tables if no cost transactions
      if (!costTransactions?.length) {
        contentStats.text.count = (marketingContent?.length || 0) + (landingPages?.length || 0) + (scripts?.length || 0);
        contentStats.image.count = images?.length || 0;
        contentStats.video.count = (scenes?.length || 0) + (videos?.length || 0);
      }

      const contentTypeStats: ContentTypeStats[] = Object.entries(contentStats).map(([type, data]) => ({
        type: type as 'text' | 'audio' | 'image' | 'video',
        count: data.count,
        cost: data.cost,
        avgCost: data.count > 0 ? data.cost / data.count : 0,
        successRate: data.count > 0 ? Math.round((data.success / data.count) * 100) : 0,
      }));

      // Calculate engine usage and costs
      const engineUsageMap: Record<string, { count: number; cost: number; success: number; failed: number; qualitySum: number }> = {};

      costTransactions?.forEach(tx => {
        const engine = tx.engine_name || "Unknown";
        if (!engineUsageMap[engine]) {
          engineUsageMap[engine] = { count: 0, cost: 0, success: 0, failed: 0, qualitySum: 0 };
        }
        engineUsageMap[engine].count++;
        engineUsageMap[engine].cost += tx.cost_usd || 0;
        engineUsageMap[engine].success++;
      });

      // Fallback to scenes if no cost transactions
      if (!costTransactions?.length) {
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
      }

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
        avgCost: data.count > 0 ? data.cost / data.count : ENGINE_COSTS[engine] || 0.20,
        qualityScore: data.success > 0 ? Math.round(data.qualitySum / data.success) : 75,
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      }));

      // Calculate daily costs with content type breakdown
      const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dailyCostsMap: Record<string, { cost: number; videos: number; text: number; audio: number; image: number; video: number }> = {};

      for (let i = 0; i < dayCount; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = format(date, 'yyyy-MM-dd');
        dailyCostsMap[dateStr] = { cost: 0, videos: 0, text: 0, audio: 0, image: 0, video: 0 };
      }

      costTransactions?.forEach(tx => {
        const dateStr = tx.created_at?.split('T')[0];
        if (dateStr && dailyCostsMap[dateStr]) {
          dailyCostsMap[dateStr].cost += tx.cost_usd || 0;
          const contentType = getContentType(tx.pipeline_stage || tx.operation_type || '');
          if (contentType) {
            dailyCostsMap[dateStr][contentType]++;
          }
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
        contentTypeStats,
        totalCost,
        totalGenerations,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePreset = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date()
    });
  };

  const avgSuccessRate = analytics.enginePerformance.length > 0
    ? Math.round(analytics.enginePerformance.reduce((sum, e) => sum + e.successRate, 0) / analytics.enginePerformance.length)
    : 0;

  const dateRangeLabel = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return 'Select dates';
    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
  }, [dateRange]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Date Range Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {DATE_PRESETS.slice(0, 4).map(preset => (
            <Button
              key={preset.days}
              variant="outline"
              size="sm"
              onClick={() => handleDatePreset(preset.days)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{dateRangeLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range)}
                numberOfMonths={2}
                defaultMonth={dateRange.from}
              />
              <div className="p-3 border-t border-border">
                <div className="flex flex-wrap gap-1">
                  {DATE_PRESETS.map(preset => (
                    <Button
                      key={preset.days}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDatePreset(preset.days)}
                      className="text-xs"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Type Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {analytics.contentTypeStats.map(stat => {
          const Icon = CONTENT_TYPE_ICONS[stat.type];
          return (
            <StatCard
              key={stat.type}
              label={`${stat.type.charAt(0).toUpperCase() + stat.type.slice(1)} Content`}
              value={stat.count}
              icon={Icon}
              trend={stat.cost > 0 ? { value: `$${stat.cost.toFixed(2)}`, positive: true } : undefined}
            />
          );
        })}
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Generations"
          value={analytics.totalGenerations}
          icon={Zap}
          trend={{ value: `${analytics.totalProjects} projects`, positive: true }}
        />
        <StatCard
          label="Videos Created"
          value={analytics.totalVideos}
          icon={Video}
          trend={{ value: `${analytics.totalScenes} scenes`, positive: true }}
        />
        <StatCard
          label="Total Cost"
          value={`$${analytics.totalCost.toFixed(2)}`}
          icon={DollarSign}
          trend={{ value: `$${(analytics.totalCost / Math.max(analytics.totalGenerations, 1)).toFixed(3)} avg`, positive: true }}
        />
        <StatCard
          label="Success Rate"
          value={`${avgSuccessRate}%`}
          icon={Target}
          trend={{ value: "Across engines", positive: avgSuccessRate >= 80 }}
        />
        <StatCard
          label="AI Learnings"
          value={analytics.aiLearnings.length}
          icon={Brain}
          trend={{ value: "Insights captured", positive: true }}
        />
      </div>

      <Tabs defaultValue="content-types" className="space-y-6">
        <TabsList className="bg-muted/50 flex-wrap h-auto p-1">
          <TabsTrigger value="content-types" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Content Types
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Cost Trends
          </TabsTrigger>
          <TabsTrigger value="engines" className="gap-2">
            <Zap className="w-4 h-4" />
            Engine Performance
          </TabsTrigger>
          <TabsTrigger value="ai-learning" className="gap-2">
            <Brain className="w-4 h-4" />
            AI Learning
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Usage Trends
          </TabsTrigger>
        </TabsList>

        {/* Content Types Tab */}
        <TabsContent value="content-types" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Generation by Content Type" description="Breakdown of all content generated">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={analytics.contentTypeStats.filter(s => s.count > 0)}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                    >
                      {analytics.contentTypeStats.map((stat) => (
                        <Cell key={stat.type} fill={CONTENT_TYPE_COLORS[stat.type]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Cost by Content Type" description="How much each content type costs">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.contentTypeStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <YAxis
                      dataKey="type"
                      type="category"
                      width={60}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                    />
                    <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                      {analytics.contentTypeStats.map((stat) => (
                        <Cell key={stat.type} fill={CONTENT_TYPE_COLORS[stat.type]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* Daily Content Type Breakdown */}
          <SectionCard title="Daily Content Generation" description="Content types generated over time">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyCosts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(v) => format(new Date(v), 'MMM d')}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(v) => format(new Date(v), 'MMM d, yyyy')}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="text" name="Text" stackId="1" stroke={CONTENT_TYPE_COLORS.text} fill={CONTENT_TYPE_COLORS.text} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="audio" name="Audio" stackId="1" stroke={CONTENT_TYPE_COLORS.audio} fill={CONTENT_TYPE_COLORS.audio} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="image" name="Image" stackId="1" stroke={CONTENT_TYPE_COLORS.image} fill={CONTENT_TYPE_COLORS.image} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="video" name="Video" stackId="1" stroke={CONTENT_TYPE_COLORS.video} fill={CONTENT_TYPE_COLORS.video} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Detailed Content Type Table */}
          <SectionCard title="Content Type Details">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Type</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Count</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Total Cost</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Avg Cost</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.contentTypeStats.map(stat => {
                    const Icon = CONTENT_TYPE_ICONS[stat.type];
                    const percentage = analytics.totalGenerations > 0
                      ? Math.round((stat.count / analytics.totalGenerations) * 100)
                      : 0;
                    return (
                      <tr key={stat.type} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CONTENT_TYPE_COLORS[stat.type] }}
                            />
                            <Icon className="w-4 h-4" style={{ color: CONTENT_TYPE_COLORS[stat.type] }} />
                            <span className="font-medium text-foreground capitalize">{stat.type}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-foreground">{stat.count}</td>
                        <td className="text-right py-3 px-4 text-foreground">${stat.cost.toFixed(2)}</td>
                        <td className="text-right py-3 px-4 text-muted-foreground">${stat.avgCost.toFixed(4)}</td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={percentage} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground w-10 text-right">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Cost Trends Tab */}
        <TabsContent value="costs" className="space-y-6">
          <SectionCard title="Daily Cost Breakdown" description="Track your spending over time">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyCosts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(v) => format(new Date(v), 'MMM d')}
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
                    labelFormatter={(v) => format(new Date(v), 'MMM d, yyyy')}
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
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Cost by Engine" description="Which engines cost the most">
              <div className="space-y-3">
                {analytics.engineUsage.slice(0, 8).map((engine, idx) => (
                  <div key={engine.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-sm text-foreground">{engine.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{engine.count} uses</span>
                      <span className="text-sm font-medium text-foreground">${engine.cost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {analytics.engineUsage.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No engine usage data</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Cost Efficiency" description="Cost per generation over time">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.costTrends.filter(t => t.avgPerVideo > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(v) => format(new Date(v), 'MMM d')}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(v) => `$${v.toFixed(2)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Avg per video']}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgPerVideo"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* Engine Performance Tab */}
        <TabsContent value="engines" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Engine Distribution" description="Usage share by engine">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={analytics.engineUsage.slice(0, 7)}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                    >
                      {analytics.engineUsage.slice(0, 7).map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Success Rate by Engine" description="How reliable each engine is">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.enginePerformance.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      dataKey="engine"
                      type="category"
                      width={100}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value}%`, 'Success Rate']}
                    />
                    <Bar dataKey="successRate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Engine Performance Details">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-sm">Engine</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Jobs</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Success</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Avg Cost</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Quality</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.enginePerformance.map((engine, idx) => (
                    <tr key={engine.engine} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
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
                      <td className="text-right py-3 px-4 text-foreground">${engine.avgCost.toFixed(3)}</td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={engine.qualityScore} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground">{engine.qualityScore}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        {engine.trend === 'up' ? (
                          <ArrowUpRight className="w-4 h-4 text-success inline" />
                        ) : engine.trend === 'down' ? (
                          <ArrowDownRight className="w-4 h-4 text-destructive inline" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {analytics.enginePerformance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No engine performance data yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        {/* AI Learning Tab */}
        <TabsContent value="ai-learning" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title="Learning Patterns"
              description="How the AI is improving based on your usage"
              icon={Sparkles}
            >
              {analytics.aiLearnings.length > 0 ? (
                <div className="space-y-3">
                  {analytics.aiLearnings.slice(0, 6).map((learning, idx) => (
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
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Brain}
                  title="AI is still learning"
                  description="Generate more content to see patterns"
                />
              )}
            </SectionCard>

            <SectionCard
              title="Smart Insights"
              description="AI-generated recommendations"
              icon={Lightbulb}
            >
              <div className="space-y-3">
                {analytics.engineUsage.length > 0 && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Preferred Engine</p>
                        <p className="text-sm text-muted-foreground">
                          You use <span className="text-primary font-medium">{analytics.engineUsage[0]?.name}</span> most often
                          ({analytics.engineUsage[0]?.count} uses, {analytics.engineUsage[0]?.successRate}% success)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Cost Efficiency</p>
                      <p className="text-sm text-muted-foreground">
                        Average cost per generation: <span className="text-success font-medium">
                          ${(analytics.totalCost / Math.max(analytics.totalGenerations, 1)).toFixed(4)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

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

                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Generation Pattern</p>
                      <p className="text-sm text-muted-foreground">
                        {analytics.totalGenerations > 100
                          ? 'High volume user - consider batch processing for efficiency'
                          : analytics.totalGenerations > 20
                            ? 'Active user - AI is learning your preferences'
                            : 'Getting started - generate more to unlock insights'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="AI Confidence Over Time" description="How confident the AI is in its recommendations">
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
          </SectionCard>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <SectionCard title="Generation Trends" description="Content created and costs over time">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyCosts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(v) => format(new Date(v), 'MMM d')}
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
                    labelFormatter={(v) => format(new Date(v), 'MMM d, yyyy')}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="videos" name="Videos" fill="hsl(280, 70%, 60%)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cost" name="Cost ($)" stroke="hsl(var(--primary))" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
