import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calculator, DollarSign, Zap, Filter, Sparkles, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Cost estimates per engine per second of video
const ENGINE_COSTS: Record<string, { costPerSec: number; isFree: boolean }> = {
  // Free engines
  'NanoBanana': { costPerSec: 0, isFree: true },
  'Gemini Image': { costPerSec: 0, isFree: true },
  'Lovable AI': { costPerSec: 0, isFree: true },
  // Low cost
  'Hailuo': { costPerSec: 0.02, isFree: false },
  'Fal.ai Wan 2.5': { costPerSec: 0.05, isFree: false },
  'Leonardo AI': { costPerSec: 0.03, isFree: false },
  'Luma Dream Machine': { costPerSec: 0.04, isFree: false },
  // Medium cost
  'Pika Labs': { costPerSec: 0.08, isFree: false },
  'Kling AI': { costPerSec: 0.08, isFree: false },
  // Premium
  'Runway Gen-3': { costPerSec: 0.10, isFree: false },
  'HeyGen': { costPerSec: 0.15, isFree: false },
  'Synthesia': { costPerSec: 0.20, isFree: false },
  'Sora': { costPerSec: 0.15, isFree: false },
  'Veo 3.1': { costPerSec: 0.12, isFree: false },
};

// Free AI model options from OpenRouter/AIMLAPI
const FREE_AI_MODELS = [
  { name: 'Gemma 3 4B', provider: 'OpenRouter', cost: '$0/M tokens' },
  { name: 'Gemma 3 12B', provider: 'OpenRouter', cost: '$0/M tokens' },
  { name: 'Gemma 3 27B', provider: 'OpenRouter', cost: '$0/M tokens' },
  { name: 'Gemini 2.0 Flash', provider: 'OpenRouter', cost: '$0/M tokens' },
  { name: 'Llama 3.3 70B', provider: 'OpenRouter', cost: '$0/M tokens' },
  { name: 'Lovable AI', provider: 'Built-in', cost: 'Free included' },
];

interface CostCalculatorPreviewProps {
  scenesCount: number;
  avgDuration: number;
  videoCount: number;
  onFreeOnlyChange?: (enabled: boolean) => void;
}

export default function CostCalculatorPreview({
  scenesCount,
  avgDuration,
  videoCount,
  onFreeOnlyChange,
}: CostCalculatorPreviewProps) {
  const [freeEnginesOnly, setFreeEnginesOnly] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const handleFreeToggle = (enabled: boolean) => {
    setFreeEnginesOnly(enabled);
    onFreeOnlyChange?.(enabled);
  };

  // Calculate costs
  const totalDuration = scenesCount * avgDuration;
  const totalVideoDuration = totalDuration * videoCount;

  // Estimate costs by tier
  const freeEstimate = 0;
  const lowCostEstimate = totalVideoDuration * 0.03;
  const mediumCostEstimate = totalVideoDuration * 0.08;
  const premiumCostEstimate = totalVideoDuration * 0.15;

  const currentEstimate = freeEnginesOnly ? freeEstimate : lowCostEstimate;

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            Cost Estimator
          </CardTitle>
          <Badge 
            variant={freeEnginesOnly ? "default" : "outline"} 
            className={freeEnginesOnly ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
          >
            {freeEnginesOnly ? "Free Mode" : "Paid Engines"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Free Engines Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-400" />
            <Label htmlFor="free-mode" className="text-sm font-medium text-foreground cursor-pointer">
              Free Engines Only
            </Label>
          </div>
          <Switch
            id="free-mode"
            checked={freeEnginesOnly}
            onCheckedChange={handleFreeToggle}
          />
        </div>

        {freeEnginesOnly && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground mb-2">Available free engines:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(ENGINE_COSTS)
                .filter(([_, data]) => data.isFree)
                .map(([name]) => (
                  <Badge key={name} variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                    {name}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Cost Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">Scenes × Videos</p>
            <p className="text-lg font-bold text-foreground">{scenesCount} × {videoCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">Total Duration</p>
            <p className="text-lg font-bold text-foreground">{Math.round(totalVideoDuration)}s</p>
          </div>
        </div>

        {/* Estimated Cost */}
        <div className={`p-4 rounded-lg border ${freeEnginesOnly ? 'bg-green-500/10 border-green-500/30' : 'bg-primary/10 border-primary/30'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Estimated Cost</p>
              <p className={`text-2xl font-bold ${freeEnginesOnly ? 'text-green-400' : 'text-primary'}`}>
                ${currentEstimate.toFixed(2)}
              </p>
            </div>
            {freeEnginesOnly && (
              <div className="text-right">
                <TrendingDown className="w-6 h-6 text-green-400" />
                <p className="text-xs text-green-400">Saving ${premiumCostEstimate.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cost Breakdown Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-xs"
        >
          {showDetails ? "Hide" : "Show"} Cost Breakdown
        </Button>

        {showDetails && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 rounded bg-green-500/10">
              <span className="text-green-400">Free Tier</span>
              <span className="text-green-400 font-medium">$0.00</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-muted/30">
              <span className="text-muted-foreground">Budget Tier (~$0.03/s)</span>
              <span className="text-foreground">${lowCostEstimate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-muted/30">
              <span className="text-muted-foreground">Standard Tier (~$0.08/s)</span>
              <span className="text-foreground">${mediumCostEstimate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-muted/30">
              <span className="text-muted-foreground">Premium Tier (~$0.15/s)</span>
              <span className="text-foreground">${premiumCostEstimate.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Free AI Models Info */}
        {freeEnginesOnly && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border">
            <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              Free AI Models Available
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {FREE_AI_MODELS.slice(0, 4).map((model) => (
                <div key={model.name} className="text-muted-foreground truncate">
                  • {model.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
