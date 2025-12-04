import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { 
  Video, 
  Sparkles, 
  FolderOpen, 
  Cpu, 
  Clock, 
  Plus,
  ArrowRight,
  Zap,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GenerationDashboard from "@/components/GenerationDashboard";

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

  const statCards = [
    { label: "Total Projects", value: stats.totalProjects, icon: FolderOpen, color: "text-primary", bgColor: "bg-primary/20" },
    { label: "Videos Generated", value: stats.totalVideos, icon: Video, color: "text-secondary", bgColor: "bg-secondary/20" },
    { label: "Active Engines", value: stats.activeEngines, icon: Cpu, color: "text-accent", bgColor: "bg-accent/20" },
    { label: "AI Credits", value: stats.credits, icon: Zap, color: "text-primary", bgColor: "bg-primary/20" },
  ];

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 md:p-12">
        <div className="relative z-10">
          <Badge className="bg-background/20 text-foreground border-0 mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered Video Generation
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Create Stunning Video Ads
          </h1>
          <p className="text-lg text-foreground/80 max-w-xl mb-6">
            Generate 10-100+ unique video ads using multiple AI engines. 
            Multi-language support with automatic scene routing.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/create")}
            className="bg-background text-primary hover:bg-background/90 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Video
          </Button>
        </div>
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-20" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-gradient-card border-border shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{loading ? "-" : stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">Get started with your next project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Video, label: "Create Video Ad", url: "/create" },
              { icon: FolderOpen, label: "View Projects", url: "/projects" },
              { icon: Cpu, label: "Explore AI Engines", url: "/engines" },
              { icon: Sparkles, label: "Manage Templates", url: "/settings" },
            ].map((action) => (
              <Button 
                key={action.label}
                variant="outline" 
                className="w-full justify-between border-border hover:bg-primary/10 hover:text-primary"
                onClick={() => navigate(action.url)}
              >
                <div className="flex items-center gap-3">
                  <action.icon className="w-5 h-5" />
                  <span>{action.label}</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Recent Projects</CardTitle>
                <CardDescription className="text-muted-foreground">Your latest video ad projects</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="text-primary">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No projects yet</p>
                <Button variant="link" className="text-primary mt-2" onClick={() => navigate("/create")}>
                  Create your first project
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div 
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/scene-builder?project=${project.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Video className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.output_count} videos • {project.language.toUpperCase()}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={project.status === "completed" ? "border-primary/50 text-primary" : "border-border"}>
                      {project.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generation Dashboard with Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="generation" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Generation Queue
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {/* How It Works */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground">How It Works</CardTitle>
              <CardDescription className="text-muted-foreground">Generate professional video ads in 4 simple steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { step: 1, title: "Upload Content", desc: "Add your product images, scripts, and brand assets" },
                  { step: 2, title: "Generate Scripts", desc: "AI creates multiple script variations with hooks" },
                  { step: 3, title: "Build Scenes", desc: "Auto-route scenes to the best AI video engines" },
                  { step: 4, title: "Export Videos", desc: "Download in multiple formats for all platforms" },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-primary">{item.step}</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="generation">
          <GenerationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
