import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { 
  Video, 
  Sparkles, 
  FolderOpen, 
  Cpu, 
  Plus,
  ArrowRight,
  Zap,
  Activity,
  Bot,
  Rocket,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GenerationDashboard from "@/components/GenerationDashboard";
import AIOperatorDashboard from "@/components/AIOperatorDashboard";
import { WorkflowCards } from "@/components/WorkflowCards";
import { ContentFactory } from "@/components/ContentFactory";
import { SectionHeader, EmptyState, LoadingState } from "@/components/ui/page-components";
import { SectionCard, StatCard } from "@/components/ui/section-card";

interface Stats {
  totalProjects: number;
  totalVideos: number;
  activeEngines: number;
  credits: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    totalVideos: 0,
    activeEngines: 0,
    credits: 100,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { count: projectsCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true });

      const { count: videosCount } = await supabase
        .from("video_outputs")
        .select("*", { count: "exact", head: true });

      const { count: enginesCount } = await supabase
        .from("ai_engines")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user?.id)
        .single();

      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalProjects: projectsCount || 0,
        totalVideos: videosCount || 0,
        activeEngines: enginesCount || 0,
        credits: profile?.credits || 100,
      });

      setRecentProjects(projects || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: Video, label: "Create Video Ad", url: "/create" },
    { icon: FolderOpen, label: "View Projects", url: "/projects" },
    { icon: Cpu, label: "Explore AI Engines", url: "/engines" },
    { icon: Sparkles, label: "Manage Templates", url: "/templates" },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-hero p-6 md:p-8">
        <div className="relative z-10">
          <Badge className="bg-background/20 text-foreground border-0 mb-3">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered Video Generation
          </Badge>
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
            Create Stunning Video Ads
          </h1>
          <p className="text-foreground/80 max-w-xl mb-5">
            Generate 10-100+ unique video ads using multiple AI engines with multi-language support.
          </p>
          <div className="flex items-center gap-3">
            <Button 
              size="lg" 
              onClick={() => navigate("/create")}
              className="bg-background text-primary hover:bg-background/90"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Quick Start
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/create")}
              className="border-background/30 text-foreground hover:bg-background/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Projects" 
          value={loading ? "-" : stats.totalProjects} 
          icon={FolderOpen} 
        />
        <StatCard 
          label="Videos Generated" 
          value={loading ? "-" : stats.totalVideos} 
          icon={Video} 
        />
        <StatCard 
          label="Active Engines" 
          value={loading ? "-" : stats.activeEngines} 
          icon={Cpu} 
        />
        <StatCard 
          label="AI Credits" 
          value={loading ? "-" : stats.credits} 
          icon={Zap} 
        />
      </div>

      {/* Workflow Cards */}
      <div>
        <SectionHeader 
          title="Choose Your Workflow" 
          description="Select the best approach for your needs" 
        />
        <WorkflowCards />
      </div>

      {/* Quick Actions + Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard 
          title="Quick Actions" 
          description="Get started with your next project"
        >
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Button 
                key={action.label}
                variant="outline" 
                className="w-full justify-between border-border hover:bg-primary/5 hover:border-primary/30"
                onClick={() => navigate(action.url)}
              >
                <div className="flex items-center gap-3">
                  <action.icon className="w-4 h-4 text-muted-foreground" />
                  <span>{action.label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </SectionCard>

        <SectionCard 
          title="Recent Projects" 
          description="Your latest video ad projects"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="text-primary text-xs">
              View All
            </Button>
          }
        >
          {loading ? (
            <LoadingState message="Loading projects..." />
          ) : recentProjects.length === 0 ? (
            <EmptyState 
              icon={FolderOpen}
              title="No projects yet"
              description="Create your first video ad project to get started"
              action={
                <Button size="sm" onClick={() => navigate("/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {recentProjects.map((project) => (
                <div 
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/scene-builder?project=${project.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Video className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.output_count || 0} videos • {(project.language || 'en').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={project.status === "completed" ? "border-success/30 text-success bg-success/5" : ""}
                  >
                    {project.status || 'draft'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full max-w-lg mb-4">
          <TabsTrigger value="overview" className="flex-1 gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="flex-1 gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Content</span>
          </TabsTrigger>
          <TabsTrigger value="generation" className="flex-1 gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Queue</span>
          </TabsTrigger>
          <TabsTrigger value="operator" className="flex-1 gap-2">
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">AI Operator</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <SectionCard title="How It Works" description="Generate professional video ads in 4 simple steps">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { step: 1, title: "Upload Content", desc: "Add product images and brand assets" },
                { step: 2, title: "Generate Scripts", desc: "AI creates script variations" },
                { step: 3, title: "Build Scenes", desc: "Auto-route to best AI engines" },
                { step: 4, title: "Export Videos", desc: "Download for all platforms" },
              ].map((item) => (
                <div key={item.step} className="text-center p-4 rounded-lg bg-muted/30">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-lg font-bold text-primary">{item.step}</span>
                  </div>
                  <h4 className="font-medium text-sm text-foreground mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="content">
          <ContentFactory />
        </TabsContent>
        
        <TabsContent value="generation">
          <GenerationDashboard />
        </TabsContent>
        
        <TabsContent value="operator">
          <AIOperatorDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
