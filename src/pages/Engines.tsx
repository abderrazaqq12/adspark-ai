import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

export default function Engines() {
  const [engines, setEngines] = useState<AIEngine[]>([]);
  const [loading, setLoading] = useState(true);

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
        return <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground border-secondary/30">Coming Soon</Badge>;
      default:
        return <Badge variant="outline">Disabled</Badge>;
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

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">AI Video Engines</h1>
        <p className="text-muted-foreground">
          {engines.length} engines available for video generation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {engines.map((engine) => (
          <Card key={engine.id} className="bg-gradient-card border-border shadow-card hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">{engine.name}</CardTitle>
                    {getStatusBadge(engine.status)}
                  </div>
                </div>
              </div>
              <CardDescription className="text-muted-foreground mt-2">
                {engine.description || "AI-powered video generation engine"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  <span>{getTypeLabel(engine.type)}</span>
                </div>
                {engine.max_duration_sec && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Up to {engine.max_duration_sec}s duration</span>
                  </div>
                )}
                {engine.supports_free_tier && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Free tier available</span>
                  </div>
                )}
                {engine.supported_ratios && engine.supported_ratios.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Ratios: {engine.supported_ratios.join(", ")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
