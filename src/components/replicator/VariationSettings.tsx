import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Zap, Sparkles, Mic, Film, Users, Globe, Shuffle, Bot } from "lucide-react";
import type { VariationConfig } from "@/pages/CreativeReplicator";
import { AIAdIntelligencePanel } from "./AIAdIntelligencePanel";

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
  { id: "energetic", label: "Energetic" },
  { id: "emotional", label: "Emotional" },
  { id: "neutral", label: "Neutral" },
  { id: "professional", label: "Professional" },
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

export const VariationSettings = ({
  config,
  setConfig,
  onBack,
  onGenerate,
}: VariationSettingsProps) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 2: Variation Settings</h2>
          <p className="text-muted-foreground text-sm">
            Configure how your ad variations will be generated
          </p>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

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

          {/* Voice Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" />
                Voice Settings
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
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <CardTitle className="text-base">AI Engine Tier</CardTitle>
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

              {/* n8n Webhook Toggle */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label>Use n8n Webhook</Label>
                  <p className="text-xs text-muted-foreground">Generate via external workflow</p>
                </div>
                <Switch
                  checked={config.useN8nWebhook}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, useN8nWebhook: checked }))
                  }
                />
              </div>

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
