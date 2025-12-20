import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Zap, Sparkles, Mic, Film, Users, Globe, Shuffle, Bot, Brain, BarChart3, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import type { VariationConfig } from "@/pages/CreativeReplicator";
import { AIAdIntelligencePanel } from "./AIAdIntelligencePanel";
import { FreeTierCreativePanel } from "./FreeTierCreativePanel";

interface VariationSettingsProps {
  config: VariationConfig;
  setConfig: React.Dispatch<React.SetStateAction<VariationConfig>>;
  onBack: () => void;
  onGenerate: () => void;
}

const HOOK_STYLES = [
  { id: "ai-auto", label: "AI Auto Hook", emoji: "🤖", isAI: true },
  { id: "question", label: "Question Hook", emoji: "❓" },
  { id: "shock", label: "Shock Hook", emoji: "😱" },
  { id: "emotional", label: "Emotional Hook", emoji: "💔" },
  { id: "story", label: "Story Hook", emoji: "📖" },
  { id: "problem-solution", label: "Problem/Solution", emoji: "💡" },
  { id: "humor", label: "Humor Hook", emoji: "😂" },
  { id: "statistic", label: "Statistic Hook", emoji: "📊" },
];

const PACING_OPTIONS = [
  { id: "fast", label: "Fast (TikTok)", description: "1-2s cuts, high energy" },
  { id: "medium", label: "Medium (Reels)", description: "2-4s cuts, balanced" },
  { id: "slow", label: "Slow (YouTube)", description: "4-6s cuts, cinematic" },
  { id: "dynamic", label: "Dynamic Mix", description: "AI-optimized variety" },
];

const TRANSITION_OPTIONS = [
  { id: "ai-auto", label: "🤖 AI Auto", isAI: true },
  { id: "hard-cut", label: "Hard Cut" },
  { id: "zoom", label: "Zoom" },
  { id: "slide", label: "Slide" },
  { id: "whip-pan", label: "Whip Pan" },
  { id: "glitch", label: "Glitch" },
  { id: "mixed", label: "Mixed Random" },
];

const ACTOR_OPTIONS = [
  { id: "omnihuman", label: "OmniHuman Actor" },
  { id: "custom", label: "Custom Actor" },
  { id: "audio-driven", label: "Audio-Driven" },
];

const VOICE_LANGUAGES = [
  { id: "ar-sa", label: "Arabic (Saudi)" },
  { id: "ar", label: "Arabic (MSA)" },
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
];

const VOICE_TONES = [
  { id: "ai-auto", label: "🤖 AI Auto Tone", isAI: true },
  { id: "energetic", label: "Energetic" },
  { id: "emotional", label: "Emotional" },
  { id: "neutral", label: "Neutral" },
  { id: "professional", label: "Professional" },
  { id: "friendly", label: "Friendly" },
  { id: "authoritative", label: "Authoritative" },
];

const RATIO_OPTIONS = [
  { id: "9:16", label: "9:16", description: "TikTok, Reels, Stories" },
  { id: "1:1", label: "1:1", description: "Instagram Feed" },
  { id: "16:9", label: "16:9", description: "YouTube, Landscape" },
  { id: "4:5", label: "4:5", description: "Facebook, Instagram" },
];

const ENGINE_TIERS = [
  {
    id: "free",
    label: "FREE TIER",
    description: "Free video models only",
    engines: ["Free Models"],
    color: "text-green-500",
    costPerVideo: "$0.00",
    estimatedTotal: (count: number) => "$0.00",
  },
  {
    id: "low",
    label: "LOW COST",
    description: "Budget-friendly options",
    engines: ["Wan 2.5", "Kling 2.5 Pro", "Ovi", "MiniMax"],
    color: "text-blue-500",
    costPerVideo: "$0.05-0.15",
    estimatedTotal: (count: number) => `$${(count * 0.1).toFixed(2)}`,
  },
  {
    id: "medium",
    label: "MEDIUM COST",
    description: "Balanced quality/cost",
    engines: ["Veo 3", "Runway Gen-3", "Luma"],
    color: "text-orange-500",
    costPerVideo: "$0.25-0.50",
    estimatedTotal: (count: number) => `$${(count * 0.375).toFixed(2)}`,
  },
  {
    id: "premium",
    label: "PREMIUM",
    description: "Highest quality",
    engines: ["Sora 2", "Sora 2 Pro", "OmniHuman"],
    color: "text-purple-500",
    costPerVideo: "$1.00-2.50",
    estimatedTotal: (count: number) => `$${(count * 1.75).toFixed(2)}`,
  },
];

// AI recommendations based on market & product
const getAIRecommendations = (market: string, productCategory: string, platform: string) => {
  const recommendations: { videoTypes: string[]; hookStyles: string[]; tone: string; pacing: string } = {
    videoTypes: [],
    hookStyles: [],
    tone: 'energetic',
    pacing: 'fast'
  };
  
  // Market-based recommendations
  if (market === 'saudi' || market === 'uae') {
    recommendations.videoTypes = ['ugc-review', 'testimonial', 'before-after'];
    recommendations.hookStyles = ['emotional', 'story', 'problem-solution'];
    recommendations.tone = 'emotional';
    recommendations.pacing = 'medium';
  } else if (market === 'usa') {
    recommendations.videoTypes = ['ugc-review', 'lifestyle', 'problem-solution'];
    recommendations.hookStyles = ['question', 'shock', 'humor'];
    recommendations.tone = 'energetic';
    recommendations.pacing = 'fast';
  } else if (market === 'latam') {
    recommendations.videoTypes = ['ugc-review', 'unboxing', 'day-in-life'];
    recommendations.hookStyles = ['shock', 'emotional', 'humor'];
    recommendations.tone = 'energetic';
    recommendations.pacing = 'fast';
  } else if (market === 'europe') {
    recommendations.videoTypes = ['educational', 'testimonial', 'lifestyle'];
    recommendations.hookStyles = ['statistic', 'question', 'story'];
    recommendations.tone = 'professional';
    recommendations.pacing = 'medium';
  } else {
    recommendations.videoTypes = ['ugc-review', 'problem-solution', 'lifestyle'];
    recommendations.hookStyles = ['question', 'problem-solution', 'story'];
    recommendations.tone = 'neutral';
    recommendations.pacing = 'medium';
  }
  
  // Product category adjustments
  if (productCategory === 'beauty' || productCategory === 'health') {
    recommendations.videoTypes = ['before-after', 'testimonial', ...recommendations.videoTypes.slice(0, 1)];
    recommendations.hookStyles = ['emotional', 'problem-solution', ...recommendations.hookStyles.slice(0, 1)];
  } else if (productCategory === 'tech') {
    recommendations.videoTypes = ['unboxing', 'educational', ...recommendations.videoTypes.slice(0, 1)];
    recommendations.hookStyles = ['statistic', 'shock', ...recommendations.hookStyles.slice(0, 1)];
  } else if (productCategory === 'fashion') {
    recommendations.videoTypes = ['lifestyle', 'day-in-life', ...recommendations.videoTypes.slice(0, 1)];
    recommendations.hookStyles = ['story', 'emotional', ...recommendations.hookStyles.slice(0, 1)];
  }
  
  // Platform adjustments
  if (platform === 'tiktok' || platform === 'instagram-reels') {
    recommendations.pacing = 'fast';
  } else if (platform === 'youtube-shorts') {
    recommendations.pacing = 'medium';
  }
  
  return recommendations;
};

export const VariationSettings = ({
  config,
  setConfig,
  onBack,
  onGenerate,
}: VariationSettingsProps) => {
  const [showCostChart, setShowCostChart] = useState(false);
  
  // Generate AI recommendations
  const aiRecommendations = useMemo(() => {
    return getAIRecommendations(
      config.adIntelligence?.market || 'global',
      config.adIntelligence?.productCategory || 'general',
      config.adIntelligence?.platform || 'tiktok'
    );
  }, [config.adIntelligence?.market, config.adIntelligence?.productCategory, config.adIntelligence?.platform]);

  const toggleHookStyle = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      hookStyles: prev.hookStyles.includes(id)
        ? prev.hookStyles.filter((h) => h !== id)
        : [...prev.hookStyles, id],
    }));
  };

  const toggleTransition = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      transitions: prev.transitions.includes(id)
        ? prev.transitions.filter((t) => t !== id)
        : [...prev.transitions, id],
    }));
  };

  const toggleRatio = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      ratios: prev.ratios.includes(id)
        ? prev.ratios.filter((r) => r !== id)
        : [...prev.ratios, id],
    }));
  };

  const toggleActor = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      actors: prev.actors.includes(id)
        ? prev.actors.filter((a) => a !== id)
        : [...prev.actors, id],
    }));
  };

  // Apply all AI recommendations
  const applyAllAIRecommendations = () => {
    setConfig((prev) => ({
      ...prev,
      hookStyles: ['ai-auto', ...aiRecommendations.hookStyles.slice(0, 2)],
      pacing: aiRecommendations.pacing,
      transitions: ['ai-auto'],
      voiceSettings: {
        ...prev.voiceSettings,
        tone: 'ai-auto',
      },
      adIntelligence: {
        ...prev.adIntelligence,
        videoType: 'ai-auto',
      },
    }));
    toast.success("Applied all AI recommendations!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 2: Variation Settings</h2>
          <p className="text-muted-foreground text-sm">
            Configure how your ad variations will be generated
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={applyAllAIRecommendations}
            variant="outline"
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
          >
            <Brain className="w-4 h-4 mr-2" />
            Apply AI Recommendations
          </Button>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Free-Tier Creative Engine Panel */}
      <FreeTierCreativePanel
        sourceVideoCount={1}
        requestedVariations={config.count}
        onConfigChange={(freeTierConfig) => {
          setConfig((prev) => ({ ...prev, freeTierConfig }));
        }}
        onGenerateFree={onGenerate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* AI Ad Intelligence Panel */}
          <AIAdIntelligencePanel
            config={config}
            setConfig={setConfig}
          />
          {/* Number of Variations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Number of Videos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-primary">{config.count}</span>
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

          {/* Hook Styles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Hook Styles
                {config.hookStyles.includes("ai-auto") && (
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
                    🤖 AI Decides
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {HOOK_STYLES.map((hook) => (
                  <button
                    key={hook.id}
                    onClick={() => toggleHookStyle(hook.id)}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                      config.hookStyles.includes(hook.id)
                        ? hook.id === "ai-auto" 
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                          : "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80 text-foreground"
                    }`}
                  >
                    <span>{hook.emoji}</span>
                    <span>{hook.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pacing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                Pacing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={config.pacing}
                onValueChange={(value) => setConfig((prev) => ({ ...prev, pacing: value }))}
                className="grid grid-cols-2 gap-3"
              >
                {PACING_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex flex-col cursor-pointer">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Transitions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Transitions
                {config.transitions.includes("ai-auto") && (
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
                    🤖 AI Decides
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {TRANSITION_OPTIONS.map((transition) => (
                  <button
                    key={transition.id}
                    onClick={() => toggleTransition(transition.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      config.transitions.includes(transition.id)
                        ? transition.id === "ai-auto"
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                          : "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80 text-foreground"
                    }`}
                  >
                    {transition.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Actors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Actors (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ACTOR_OPTIONS.map((actor) => (
                  <div key={actor.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={actor.id}
                      checked={config.actors.includes(actor.id)}
                      onCheckedChange={() => toggleActor(actor.id)}
                    />
                    <Label htmlFor={actor.id}>{actor.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations Preview */}
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                AI Recommendations
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
                  Based on Settings
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Recommended Video Types</Label>
                  <div className="flex flex-wrap gap-1">
                    {aiRecommendations.videoTypes.slice(0, 3).map((type) => (
                      <Badge key={type} variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                        {type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Recommended Hook Styles</Label>
                  <div className="flex flex-wrap gap-1">
                    {aiRecommendations.hookStyles.slice(0, 3).map((hook) => (
                      <Badge key={hook} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                        {hook.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-accent/30">
                    <span className="text-muted-foreground">Tone: </span>
                    <span className="font-medium text-green-400">{aiRecommendations.tone}</span>
                  </div>
                  <div className="p-2 rounded bg-accent/30">
                    <span className="text-muted-foreground">Pacing: </span>
                    <span className="font-medium text-orange-400">{aiRecommendations.pacing}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                💡 These are AI suggestions based on your market ({config.adIntelligence?.market || 'global'}) and category ({config.adIntelligence?.productCategory || 'general'})
              </p>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" />
                Voice Settings
                {config.voiceSettings.tone === 'ai-auto' && (
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
                    🤖 AI Decides
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={config.voiceSettings.language}
                  onValueChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      voiceSettings: { ...prev.voiceSettings, language: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select
                  value={config.voiceSettings.tone}
                  onValueChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      voiceSettings: { ...prev.voiceSettings, tone: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_TONES.map((tone) => (
                      <SelectItem key={tone.id} value={tone.id}>
                        <span className={tone.isAI ? "text-purple-400 font-medium" : ""}>
                          {tone.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {config.voiceSettings.tone === 'ai-auto' && (
                  <p className="text-xs text-muted-foreground">
                    AI will select: <span className="text-green-400 font-medium">{aiRecommendations.tone}</span> based on your market
                  </p>
                )}
              </div>
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

          {/* AI Engine Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>AI Engine Tier</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCostChart(!showCostChart)}
                  className="text-xs"
                >
                  <BarChart3 className="w-3 h-3 mr-1" />
                  {showCostChart ? 'Hide' : 'Compare'} Costs
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cost Comparison Chart */}
              {showCostChart && (
                <div className="p-4 rounded-lg bg-accent/30 border border-border space-y-3">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Cost Comparison for {config.count} Videos
                  </div>
                  <div className="space-y-2">
                    {ENGINE_TIERS.map((tier) => {
                      const cost = parseFloat(tier.estimatedTotal(config.count).replace('$', ''));
                      const maxCost = parseFloat(ENGINE_TIERS[3].estimatedTotal(config.count).replace('$', ''));
                      const percentage = maxCost > 0 ? (cost / maxCost) * 100 : 0;
                      
                      return (
                        <div key={tier.id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className={tier.color}>{tier.label}</span>
                            <span className="font-medium">{tier.estimatedTotal(config.count)}</span>
                          </div>
                          <div className="h-2 bg-accent rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                tier.id === 'free' ? 'bg-green-500' :
                                tier.id === 'low' ? 'bg-blue-500' :
                                tier.id === 'medium' ? 'bg-orange-500' :
                                'bg-purple-500'
                              }`}
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
                    💡 Free tier has no cost, Premium offers highest quality
                  </div>
                </div>
              )}

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
                        <div className={`font-bold ${tier.color}`}>{tier.label}</div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{tier.costPerVideo}/video</div>
                          {config.engineTier === tier.id && (
                            <div className="text-sm font-semibold text-primary">
                              Est. Total: {tier.estimatedTotal(config.count)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{tier.description}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tier.engines.map((engine) => (
                          <Badge key={engine} variant="secondary" className="text-xs">
                            {engine}
                          </Badge>
                        ))}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              {/* Selected Tier Cost Summary */}
              {config.engineTier && (
                <div className="p-3 rounded-lg bg-accent/50 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estimated Cost for {config.count} videos:</span>
                    <span className="text-lg font-bold text-primary">
                      {ENGINE_TIERS.find(t => t.id === config.engineTier)?.estimatedTotal(config.count)}
                    </span>
                  </div>
                </div>
              )}

              {/* Randomize Engines */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4" />
                    Randomize Engines
                  </Label>
                  <p className="text-xs text-muted-foreground">Use different engines per video</p>
                </div>
                <Switch
                  checked={config.randomizeEngines}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, randomizeEngines: checked }))
                  }
                />
              </div>

              {/* AI Operator Agent */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-500" />
                    AI Operator Agent
                  </Label>
                  <p className="text-xs text-muted-foreground">Autonomous optimization & retry</p>
                </div>
                <Switch
                  checked={config.useAIOperator}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, useAIOperator: checked }))
                  }
                />
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
          className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
        >
          <Zap className="w-5 h-5 mr-2" />
          Generate {config.count} Variations
        </Button>
      </div>
    </div>
  );
};
