import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Zap, Sparkles, Globe, Bot, Brain,
  Film, Wand2, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import type { VariationConfig } from "@/pages/CreativeReplicator";

interface SimplifiedVariationSettingsProps {
  config: VariationConfig;
  setConfig: React.Dispatch<React.SetStateAction<VariationConfig>>;
  onBack: () => void;
  onGenerate: () => void;
}

const VIDEO_TYPES = [
  { id: "ai-auto", label: "AI Auto (Recommended)", description: "AI selects best type", isAI: true },
  { id: "ugc-review", label: "UGC Review", description: "User-generated content style" },
  { id: "testimonial", label: "Testimonial", description: "Customer stories" },
  { id: "before-after", label: "Before/After", description: "Transformation showcase" },
  { id: "unboxing", label: "Unboxing", description: "Product reveal" },
  { id: "problem-solution", label: "Problem/Solution", description: "Pain point focused" },
];

const ENGINE_TIERS = [
  {
    id: "free",
    label: "FREE TIER",
    description: "FFMPEG + AI motion effects only",
    engines: ["FFMPEG Pan/Zoom", "Parallax Motion", "Ken Burns", "AI Shake"],
    color: "text-green-500",
    costPerVideo: "$0.00",
    estimatedTotal: () => "$0.00",
    badge: "100% FREE",
  },
  {
    id: "low",
    label: "LOW COST",
    description: "Budget-friendly video AI",
    engines: ["Kling 2.5", "MiniMax", "Wan 2.5", "Kie.ai Luma"],
    color: "text-blue-500",
    costPerVideo: "$0.05-0.15",
    estimatedTotal: (count: number) => `$${(count * 0.1).toFixed(2)}`,
    badge: null,
  },
  {
    id: "medium",
    label: "MEDIUM COST",
    description: "Balanced quality/cost",
    engines: ["Runway Gen-3", "Veo 3.1", "Luma Dream", "Kie.ai Runway"],
    color: "text-orange-500",
    costPerVideo: "$0.25-0.50",
    estimatedTotal: (count: number) => `$${(count * 0.375).toFixed(2)}`,
    badge: null,
  },
  {
    id: "premium",
    label: "PREMIUM",
    description: "Highest cinematic quality",
    engines: ["Sora 2", "Sora 2 Pro", "Kie.ai Veo 3.1"],
    color: "text-purple-500",
    costPerVideo: "$1.00-2.50",
    estimatedTotal: (count: number) => `$${(count * 1.75).toFixed(2)}`,
    badge: null,
  },
];

const RATIO_OPTIONS = [
  { id: "9:16", label: "9:16", description: "TikTok, Reels" },
  { id: "1:1", label: "1:1", description: "Instagram Feed" },
  { id: "16:9", label: "16:9", description: "YouTube" },
  { id: "4:5", label: "4:5", description: "Facebook" },
];

const LANGUAGES = [
  { id: "ar", label: "Arabic" },
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
];

const MARKETS = [
  { id: "saudi", label: "Saudi Arabia" },
  { id: "uae", label: "UAE" },
  { id: "kuwait", label: "Kuwait" },
  { id: "gcc", label: "GCC Region" },
  { id: "usa", label: "United States" },
  { id: "europe", label: "Europe" },
  { id: "latam", label: "Latin America" },
];

export const SimplifiedVariationSettings = ({
  config,
  setConfig,
  onBack,
  onGenerate,
}: SimplifiedVariationSettingsProps) => {
  const [aiAutoEnabled, setAiAutoEnabled] = useState(true);

  const toggleRatio = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      ratios: prev.ratios.includes(id)
        ? prev.ratios.filter((r) => r !== id)
        : [...prev.ratios, id],
    }));
  };

  const handleAIAutoToggle = (enabled: boolean) => {
    setAiAutoEnabled(enabled);
    if (enabled) {
      setConfig((prev) => ({
        ...prev,
        hookStyles: ["ai-auto"],
        transitions: ["ai-auto"],
        pacing: "dynamic",
        voiceSettings: { ...prev.voiceSettings, tone: "ai-auto" },
        adIntelligence: {
          ...prev.adIntelligence,
          videoType: "ai-auto",
        },
      }));
      toast.success("AI Auto enabled - AI will optimize all creative decisions");
    }
  };

  const selectedTier = ENGINE_TIERS.find((t) => t.id === config.engineTier);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Configure Variations</h2>
          <p className="text-muted-foreground text-sm">
            AI handles creative decisions automatically
          </p>
        </div>
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* AI Auto Master Control */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <Label className="text-lg font-semibold">AI Auto (Recommended)</Label>
                <p className="text-sm text-muted-foreground">
                  AI handles hooks, pacing, transitions, FFMPEG effects, and motion
                </p>
              </div>
            </div>
            <Switch
              checked={aiAutoEnabled}
              onCheckedChange={handleAIAutoToggle}
              className="scale-125"
            />
          </div>
          {aiAutoEnabled && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                <Wand2 className="w-3 h-3 mr-1" /> AI Hooks
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                <Film className="w-3 h-3 mr-1" /> AI Pacing
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                <Sparkles className="w-3 h-3 mr-1" /> AI Transitions
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                <Zap className="w-3 h-3 mr-1" /> AI Motion
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Essential Controls */}
        <div className="space-y-6">
          {/* Number of Videos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Number of Videos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold text-primary">{config.count}</span>
                <span className="text-muted-foreground">variations</span>
              </div>
              <Slider
                value={[config.count]}
                onValueChange={([value]) => setConfig((prev) => ({ ...prev, count: value }))}
                min={1}
                max={100}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </CardContent>
          </Card>

          {/* Video Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                Video Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={config.adIntelligence?.videoType || "ai-auto"}
                onValueChange={(value) =>
                  setConfig((prev) => ({
                    ...prev,
                    adIntelligence: { ...prev.adIntelligence, videoType: value },
                  }))
                }
                className="space-y-2"
              >
                {VIDEO_TYPES.map((type) => (
                  <div
                    key={type.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      config.adIntelligence?.videoType === type.id
                        ? type.isAI
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-primary bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <RadioGroupItem value={type.id} id={type.id} />
                    <Label htmlFor={type.id} className="flex-1 cursor-pointer">
                      <span className={`font-medium ${type.isAI ? "text-purple-400" : ""}`}>
                        {type.label}
                      </span>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </Label>
                    {type.isAI && (
                      <Badge className="bg-purple-500/20 text-purple-400 text-xs">AI</Badge>
                    )}
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Export Ratios */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Export Ratios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {RATIO_OPTIONS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => toggleRatio(ratio.id)}
                    className={`p-3 rounded-lg text-center transition-all border ${
                      config.ratios.includes(ratio.id)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-accent border-transparent hover:border-border"
                    }`}
                  >
                    <div className="font-bold">{ratio.label}</div>
                    <div className="text-xs text-muted-foreground">{ratio.description}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Language & Market */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Language & Market
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={config.adIntelligence?.language || "ar"}
                  onValueChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      voiceSettings: { ...prev.voiceSettings, language: value },
                      adIntelligence: { ...prev.adIntelligence, language: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Market</Label>
                <Select
                  value={config.adIntelligence?.market || "saudi"}
                  onValueChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      adIntelligence: { ...prev.adIntelligence, market: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETS.map((market) => (
                      <SelectItem key={market.id} value={market.id}>
                        {market.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Engine Tier */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Engine Tier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={config.engineTier}
                onValueChange={(value) => setConfig((prev) => ({ ...prev, engineTier: value }))}
                className="space-y-3"
              >
                {ENGINE_TIERS.map((tier) => (
                  <div
                    key={tier.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-all ${
                      config.engineTier === tier.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <RadioGroupItem value={tier.id} id={`tier-${tier.id}`} className="mt-1" />
                    <Label htmlFor={`tier-${tier.id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${tier.color}`}>{tier.label}</span>
                          {tier.badge && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              {tier.badge}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{tier.costPerVideo}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tier.engines.slice(0, 3).map((engine) => (
                          <Badge key={engine} variant="secondary" className="text-[10px]">
                            {engine}
                          </Badge>
                        ))}
                        {tier.engines.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{tier.engines.length - 3}
                          </Badge>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {/* Cost Summary */}
              <div className="p-3 rounded-lg bg-accent/50 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Est. for {config.count} videos:
                  </span>
                  <span className={`text-lg font-bold ${selectedTier?.color}`}>
                    {selectedTier?.estimatedTotal(config.count)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={onGenerate}
          size="lg"
          className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 px-8"
        >
          <Zap className="w-5 h-5 mr-2" />
          Generate {config.count} AI Variations
        </Button>
      </div>
    </div>
  );
};
