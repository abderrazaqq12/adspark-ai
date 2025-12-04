import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Sparkles, TrendingUp, Crown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BatchCostPreviewProps {
  scenesCount: number;
  variationsPerScene: number;
}

interface Engine {
  id: string;
  name: string;
  cost_tier: string;
  config: any;
}

const TIER_COSTS: Record<string, { perVideo: number; label: string; icon: any; color: string }> = {
  free: { perVideo: 0, label: "Free", icon: Sparkles, color: "text-green-500" },
  cheap: { perVideo: 0.05, label: "Budget", icon: DollarSign, color: "text-blue-500" },
  normal: { perVideo: 0.15, label: "Standard", icon: TrendingUp, color: "text-primary" },
  expensive: { perVideo: 0.50, label: "Premium", icon: Crown, color: "text-amber-500" },
};

export default function BatchCostPreview({ scenesCount, variationsPerScene }: BatchCostPreviewProps) {
  const [userTier, setUserTier] = useState<string>("normal");
  const [availableEngines, setAvailableEngines] = useState<Engine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [settingsRes, enginesRes] = await Promise.all([
        supabase.from("user_settings").select("pricing_tier").eq("user_id", user.id).maybeSingle(),
        supabase.from("ai_engines").select("id, name, cost_tier, config").eq("status", "active"),
      ]);

      if (settingsRes.data?.pricing_tier) {
        setUserTier(settingsRes.data.pricing_tier);
      }

      setAvailableEngines(enginesRes.data || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalVideos = scenesCount * variationsPerScene;
  const tierConfig = TIER_COSTS[userTier] || TIER_COSTS.normal;
  const TierIcon = tierConfig.icon;

  // Filter engines by user tier
  const tiers = ['free', 'cheap', 'normal', 'expensive'];
  const userTierIndex = tiers.indexOf(userTier);
  const enginesInTier = availableEngines.filter(e => {
    const engineTierIndex = tiers.indexOf(e.cost_tier || 'normal');
    return engineTierIndex <= userTierIndex;
  });

  // Calculate cost estimates per tier
  const costBreakdown = tiers.slice(0, userTierIndex + 1).map(tier => {
    const tierEngines = availableEngines.filter(e => e.cost_tier === tier);
    const tierCost = TIER_COSTS[tier];
    const estimatedUsage = Math.ceil(totalVideos / (userTierIndex + 1)); // Distribute across tiers
    return {
      tier,
      ...tierCost,
      engineCount: tierEngines.length,
      estimatedVideos: tier === userTier ? totalVideos : estimatedUsage,
      estimatedCost: tier === 'free' ? 0 : estimatedUsage * tierCost.perVideo,
    };
  });

  const totalEstimatedCost = userTier === 'free' ? 0 : totalVideos * tierConfig.perVideo;
  const minCost = totalVideos * TIER_COSTS.cheap.perVideo;
  const maxCost = totalVideos * TIER_COSTS.expensive.perVideo;

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted/20 rounded-lg" />;
  }

  return (
    <Card className="bg-muted/30 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Cost Estimate Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tier */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
          <div className="flex items-center gap-2">
            <TierIcon className={`w-4 h-4 ${tierConfig.color}`} />
            <span className="text-sm font-medium text-foreground">Your Tier: {tierConfig.label}</span>
          </div>
          <Badge variant="outline" className={tierConfig.color}>
            {enginesInTier.length} engines available
          </Badge>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Estimated Cost Breakdown</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-muted/30">
              <p className="text-xs text-muted-foreground">Videos to Generate</p>
              <p className="text-lg font-bold text-foreground">{totalVideos}</p>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <p className="text-xs text-muted-foreground">Cost per Video</p>
              <p className="text-lg font-bold text-foreground">
                {tierConfig.perVideo === 0 ? "Free" : `$${tierConfig.perVideo.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Total Estimate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Estimated Total</span>
            <span className={`text-xl font-bold ${tierConfig.color}`}>
              {userTier === 'free' ? "Free" : `$${totalEstimatedCost.toFixed(2)}`}
            </span>
          </div>
          
          {userTier !== 'free' && (
            <p className="text-xs text-muted-foreground">
              Range: ${minCost.toFixed(2)} - ${maxCost.toFixed(2)} depending on engine mix
            </p>
          )}
        </div>

        {/* Tier Comparison */}
        <div className="grid grid-cols-4 gap-1 pt-2">
          {Object.entries(TIER_COSTS).map(([tier, config]) => {
            const Icon = config.icon;
            const isSelected = tier === userTier;
            const tierCost = tier === 'free' ? 0 : totalVideos * config.perVideo;
            
            return (
              <div 
                key={tier} 
                className={`p-2 rounded text-center ${isSelected ? 'bg-primary/20 ring-1 ring-primary' : 'bg-muted/20'}`}
              >
                <Icon className={`w-3 h-3 mx-auto mb-1 ${config.color}`} />
                <p className="text-[10px] text-muted-foreground">{config.label}</p>
                <p className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {tier === 'free' ? "Free" : `$${tierCost.toFixed(0)}`}
                </p>
              </div>
            );
          })}
        </div>

        {userTier === 'free' && enginesInTier.length < 5 && (
          <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-500">
              Limited engine variety in free tier. Consider upgrading for more options.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
