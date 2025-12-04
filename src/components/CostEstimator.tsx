import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, DollarSign, Clock, Video, Zap, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Engine {
  id: string;
  name: string;
  type: string;
  pricing_model: string | null;
  supports_free_tier: boolean | null;
  max_duration_sec: number | null;
  config: any;
}

interface CostEstimate {
  engineName: string;
  costPerVideo: number;
  totalCost: number;
  isFree: boolean;
}

// Estimated costs per second for each engine (in USD)
const ENGINE_COSTS: Record<string, number> = {
  "Runway Gen-3": 0.05,
  "Pika Labs": 0.02,
  "Hailuo AI": 0.01,
  "Kling AI": 0.04,
  "Vidu": 0.03,
  "LTX Studio": 0.04,
  "HeyGen": 0.08,
  "Elai.io": 0.06,
  "Arcads": 0.10,
  "Creatify": 0.07,
  "Leonardo AI": 0.02,
  "Fal AI": 0.03,
  "ElevenLabs": 0.01,
  "Creatomate": 0.02,
  "Shotstack": 0.02,
  "InVideo": 0.03,
  "Pictory": 0.04,
  "Fliki": 0.02,
  "NanoBanana": 0,
  "Hugging Face": 0,
};

export default function CostEstimator() {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [selectedEngines, setSelectedEngines] = useState<string[]>([]);
  const [videoDuration, setVideoDuration] = useState(30);
  const [videoCount, setVideoCount] = useState(10);
  const [estimates, setEstimates] = useState<CostEstimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngines();
  }, []);

  useEffect(() => {
    calculateEstimates();
  }, [selectedEngines, videoDuration, videoCount, engines]);

  const fetchEngines = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_engines")
        .select("*")
        .eq("status", "active")
        .order("priority_score", { ascending: false });

      if (error) throw error;
      setEngines(data || []);
      // Pre-select top 3 engines
      setSelectedEngines((data || []).slice(0, 3).map(e => e.id));
    } catch (error) {
      console.error("Error fetching engines:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimates = () => {
    const newEstimates: CostEstimate[] = selectedEngines.map(engineId => {
      const engine = engines.find(e => e.id === engineId);
      if (!engine) return null;

      const costPerSecond = ENGINE_COSTS[engine.name] || 0.03;
      const isFree = engine.supports_free_tier && costPerSecond === 0;
      const costPerVideo = isFree ? 0 : costPerSecond * videoDuration;
      const totalCost = costPerVideo * videoCount;

      return {
        engineName: engine.name,
        costPerVideo,
        totalCost,
        isFree,
      };
    }).filter(Boolean) as CostEstimate[];

    setEstimates(newEstimates);
  };

  const toggleEngine = (engineId: string) => {
    setSelectedEngines(prev => 
      prev.includes(engineId)
        ? prev.filter(id => id !== engineId)
        : [...prev, engineId]
    );
  };

  const totalProjectCost = estimates.reduce((sum, e) => sum + e.totalCost, 0);
  const avgCostPerVideo = estimates.length > 0 
    ? totalProjectCost / (estimates.length * videoCount) 
    : 0;

  const groupedEngines = {
    "Text to Video": engines.filter(e => e.type === "text_to_video"),
    "Avatar/UGC": engines.filter(e => e.type === "avatar"),
    "Image to Video": engines.filter(e => e.type === "image_to_video"),
    "Templates": engines.filter(e => e.type === "template_based"),
    "Voice": engines.filter(e => e.type === "voice"),
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Cost Estimation Calculator
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Estimate your video generation costs based on engines and duration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-foreground">Video Duration: {videoDuration}s</Label>
              <Slider
                value={[videoDuration]}
                onValueChange={(v) => setVideoDuration(v[0])}
                min={5}
                max={120}
                step={5}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-foreground">Number of Videos</Label>
              <Input
                type="number"
                value={videoCount}
                onChange={(e) => setVideoCount(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={1000}
                className="mt-2"
              />
            </div>
          </div>

          {/* Cost Summary */}
          <div className="space-y-3">
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-2 text-primary mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">Estimated Total Cost</span>
              </div>
              <p className="text-3xl font-bold text-foreground">${totalProjectCost.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">
                Avg ${avgCostPerVideo.toFixed(3)}/video
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Video className="w-3 h-3" />
                  Total Videos
                </div>
                <p className="text-lg font-semibold text-foreground">{videoCount * selectedEngines.length}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Total Duration
                </div>
                <p className="text-lg font-semibold text-foreground">{Math.round((videoDuration * videoCount * selectedEngines.length) / 60)}min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Engine Selection */}
        <div className="space-y-4">
          <Label className="text-foreground text-lg">Select Engines ({selectedEngines.length} selected)</Label>
          
          {Object.entries(groupedEngines).map(([category, categoryEngines]) => (
            categoryEngines.length > 0 && (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {categoryEngines.map((engine) => {
                    const cost = ENGINE_COSTS[engine.name] || 0.03;
                    const isSelected = selectedEngines.includes(engine.id);
                    return (
                      <div
                        key={engine.id}
                        onClick={() => toggleEngine(engine.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected 
                            ? "bg-primary/20 border-primary" 
                            : "bg-muted/20 border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={isSelected} />
                          <span className="text-sm font-medium text-foreground truncate">{engine.name}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          {cost === 0 ? (
                            <Badge className="text-xs bg-green-500/20 text-green-400">Free</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">${cost.toFixed(2)}/sec</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Breakdown Table */}
        {estimates.length > 0 && (
          <div className="space-y-2">
            <Label className="text-foreground text-lg">Cost Breakdown</Label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground">Engine</th>
                    <th className="text-right py-2 px-3 text-muted-foreground">Cost/Video</th>
                    <th className="text-right py-2 px-3 text-muted-foreground">Videos</th>
                    <th className="text-right py-2 px-3 text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((est) => (
                    <tr key={est.engineName} className="border-b border-border/50">
                      <td className="py-2 px-3 text-foreground">{est.engineName}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {est.isFree ? (
                          <Badge className="bg-green-500/20 text-green-400">Free</Badge>
                        ) : (
                          `$${est.costPerVideo.toFixed(2)}`
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{videoCount}</td>
                      <td className="py-2 px-3 text-right font-medium text-foreground">${est.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td colSpan={3} className="py-2 px-3 font-semibold text-foreground">Total</td>
                    <td className="py-2 px-3 text-right font-bold text-primary">${totalProjectCost.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="p-4 bg-muted/20 rounded-lg border border-border">
          <h4 className="font-medium text-foreground flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Cost Optimization Tips
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Use free tier engines (NanoBanana, Hugging Face) for drafts and testing</li>
            <li>• Shorter videos (15-30s) work better for social media ads</li>
            <li>• Batch generation with multiple engines gives you variety at similar costs</li>
            <li>• Avatar engines are more expensive but produce professional results</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
