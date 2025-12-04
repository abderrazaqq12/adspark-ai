import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  Check, 
  Loader2, 
  Video, 
  UserCircle, 
  Image, 
  Mic, 
  Search,
  Zap,
  Clock,
  DollarSign,
  Wand2,
  ArrowRight,
  Layout,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sceneRouting, videoModels, avatarModels, voiceModels } from "@/data/aiModels";
import CostEstimator from "@/components/CostEstimator";
import EngineRecommendationWizard from "@/components/EngineRecommendationWizard";
import TierComparisonTable from "@/components/TierComparisonTable";

interface AIEngine {
  id: string;
  name: string;
  type: string;
  status: string | null;
  description: string | null;
  supports_free_tier: boolean | null;
  pricing_model: string | null;
  max_duration_sec: number | null;
  supported_ratios: string[] | null;
  priority_score: number | null;
  api_base_url: string | null;
  config: any;
}

export default function Engines() {
  const [engines, setEngines] = useState<AIEngine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchEngines();
  }, []);

  const fetchEngines = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_engines")
        .select("*")
        .order("priority_score", { ascending: false });

      if (error) throw error;
      setEngines(data || []);
    } catch (error) {
      console.error("Error fetching engines:", error);
      toast.error("Failed to load engines");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case "coming_soon":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Coming Soon</Badge>;
      default:
        return <Badge variant="outline" className="border-muted-foreground/30">Disabled</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "avatar":
        return <UserCircle className="w-5 h-5" />;
      case "text_to_video":
        return <Video className="w-5 h-5" />;
      case "image_to_video":
        return <Image className="w-5 h-5" />;
      case "voice":
        return <Mic className="w-5 h-5" />;
      case "template_based":
        return <Layout className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      avatar: "Avatar/UGC",
      text_to_video: "Text to Video",
      image_to_video: "Image to Video",
      template_based: "Template Based",
      voice: "Voice Generation",
    };
    return labels[type] || type;
  };

  const getPricingBadge = (model: string | null) => {
    switch (model) {
      case "free":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Free</Badge>;
      case "free_tier":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Free Tier</Badge>;
      case "pay_per_use":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pay Per Use</Badge>;
      case "subscription":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Subscription</Badge>;
      default:
        return null;
    }
  };

  const filteredEngines = engines.filter(engine => {
    const matchesSearch = engine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      engine.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activeTab === "all" || engine.type === activeTab;
    return matchesSearch && matchesType;
  });

  const engineCounts = {
    all: engines.length,
    text_to_video: engines.filter(e => e.type === "text_to_video").length,
    avatar: engines.filter(e => e.type === "avatar").length,
    image_to_video: engines.filter(e => e.type === "image_to_video").length,
    template_based: engines.filter(e => e.type === "template_based").length,
    voice: engines.filter(e => e.type === "voice").length,
  };

  const getSpecialtyBadge = (config: Record<string, any> | null) => {
    if (!config?.specialty) return null;
    const specialtyColors: Record<string, string> = {
      cinematic: "bg-purple-500/20 text-purple-400",
      animated: "bg-pink-500/20 text-pink-400",
      realistic_motion: "bg-blue-500/20 text-blue-400",
      long_form: "bg-indigo-500/20 text-indigo-400",
      professional_avatar: "bg-emerald-500/20 text-emerald-400",
      ugc_ads: "bg-orange-500/20 text-orange-400",
      fast_i2v: "bg-cyan-500/20 text-cyan-400",
      api_automation: "bg-yellow-500/20 text-yellow-400",
      voice_synthesis: "bg-red-500/20 text-red-400",
    };
    const color = specialtyColors[config.specialty] || "bg-muted text-muted-foreground";
    return (
      <Badge className={`text-xs ${color}`}>
        {config.specialty.replace(/_/g, " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">AI Video Engines</h1>
          <p className="text-muted-foreground">
            {engines.filter(e => e.status === "active").length} active engines • {engines.length} total available
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search engines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Engine Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: "All Engines", count: engineCounts.all, icon: Sparkles, color: "text-primary" },
          { label: "Video Gen", count: engineCounts.text_to_video, icon: Video, color: "text-blue-400" },
          { label: "Avatar/UGC", count: engineCounts.avatar, icon: UserCircle, color: "text-purple-400" },
          { label: "Image to Video", count: engineCounts.image_to_video, icon: Image, color: "text-green-400" },
          { label: "Templates", count: engineCounts.template_based, icon: Layout, color: "text-yellow-400" },
          { label: "Voice", count: engineCounts.voice, icon: Mic, color: "text-orange-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-gradient-card border-border">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.count}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs & Engine Grid */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="all">All ({engineCounts.all})</TabsTrigger>
          <TabsTrigger value="text_to_video">Video Gen ({engineCounts.text_to_video})</TabsTrigger>
          <TabsTrigger value="avatar">Avatar/UGC ({engineCounts.avatar})</TabsTrigger>
          <TabsTrigger value="image_to_video">Image → Video ({engineCounts.image_to_video})</TabsTrigger>
          <TabsTrigger value="template_based">Templates ({engineCounts.template_based})</TabsTrigger>
          <TabsTrigger value="voice">Voice ({engineCounts.voice})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEngines.map((engine) => (
              <Card 
                key={engine.id} 
                className={`bg-gradient-card border-border shadow-card transition-all hover:shadow-lg ${
                  engine.status === "active" ? "hover:border-primary/50" : "opacity-75"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        engine.status === "active" ? "bg-primary/20" : "bg-muted"
                      }`}>
                        {getTypeIcon(engine.type)}
                      </div>
                      <div>
                        <CardTitle className="text-foreground text-lg">{engine.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {getStatusBadge(engine.status)}
                          {getPricingBadge(engine.pricing_model)}
                          {getSpecialtyBadge(engine.config as Record<string, any> | null)}
                        </div>
                      </div>
                    </div>
                    {engine.api_base_url && (
                      <a 
                        href={engine.api_base_url.replace('/api', '').replace('api.', '')} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <CardDescription className="text-muted-foreground mt-3">
                    {engine.description || "AI-powered video generation engine"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wand2 className="w-4 h-4 text-primary" />
                      <span>{getTypeLabel(engine.type)}</span>
                    </div>
                    {engine.max_duration_sec && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>Up to {engine.max_duration_sec}s per clip</span>
                      </div>
                    )}
                    {engine.supports_free_tier && (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <DollarSign className="w-4 h-4" />
                        <span>Free tier available</span>
                      </div>
                    )}
                    {engine.supported_ratios && engine.supported_ratios.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {engine.supported_ratios.map((ratio) => (
                          <Badge key={ratio} variant="outline" className="text-xs">
                            {ratio}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {engine.priority_score && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                        <Zap className="w-3 h-3" />
                        <span>Priority Score: {engine.priority_score}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Scene Routing Guide */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" />
            Smart Scene Routing
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Automatic engine selection based on scene type for optimal results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sceneRouting.slice(0, 9).map((route) => (
              <div 
                key={route.sceneType}
                className="p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">{route.sceneType}</Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">{route.recommendedModel}</p>
                <p className="text-xs text-muted-foreground mt-1">{route.reason}</p>
                {route.alternativeModel && (
                  <p className="text-xs text-primary mt-1">Alt: {route.alternativeModel}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Comparison from aiModels data */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground">Model Capabilities Reference</CardTitle>
          <CardDescription className="text-muted-foreground">
            Detailed comparison of AI video models and their best use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="video">
            <TabsList className="mb-4">
              <TabsTrigger value="video">Video Models</TabsTrigger>
              <TabsTrigger value="avatar">Avatar Models</TabsTrigger>
              <TabsTrigger value="voice">Voice Models</TabsTrigger>
            </TabsList>
            
            <TabsContent value="video">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground">Model</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Best For</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Output</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Speed</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Pricing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videoModels.slice(0, 6).map((model) => (
                      <tr key={model.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4 font-medium text-foreground">{model.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.bestFor[0]}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.outputQuality}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.speed}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.pricing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="avatar">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground">Model</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Best For</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Lip Sync</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Realism</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Pricing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {avatarModels.map((model) => (
                      <tr key={model.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4 font-medium text-foreground">{model.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.bestFor[0]}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.lipSyncQuality}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.avatarRealism}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.pricing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="voice">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground">Model</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Best For</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Quality</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Speed</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Pricing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voiceModels.map((model) => (
                      <tr key={model.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4 font-medium text-foreground">{model.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.bestFor[0]}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.outputQuality}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.speed}</td>
                        <td className="py-3 px-4 text-muted-foreground">{model.pricing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Tier Comparison */}
      <TierComparisonTable />

      {/* Cost Estimator */}
      <CostEstimator />

      {/* Engine Recommendation Wizard */}
      <EngineRecommendationWizard />
    </div>
  );
}
