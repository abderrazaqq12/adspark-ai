/**
 * AI Creative Config Panel - Configuration with Local Overrides
 * 
 * ARCHITECTURAL CONTRACT:
 * - Audience (language/country) DEFAULTS from Settings → Preferences
 * - User CAN override language/country per-generation
 * - Overrides are session-only; global defaults remain unchanged
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, Zap, Sparkles, Brain, DollarSign,
  Clock, Cpu, ChevronDown, ChevronUp, Info, AlertTriangle, Globe, Languages
} from "lucide-react";
import { AICreativeBrain, estimateCostRange, BrainOutput } from "@/lib/replicator/ai-creative-brain";
import { AIDecisionDebugPanel } from "./AIDecisionDebugPanel";
import type { VariationConfig } from "@/pages/CreativeReplicator";
import { useAudience } from "@/contexts/AudienceContext";
import { isAudienceConfigured } from "@/lib/replicator/creative-plan-types";
import { COUNTRIES, LANGUAGES, getCountryByCode, getLanguageByCode } from "@/lib/audience/countries";

interface AICreativeConfigPanelProps {
  config: VariationConfig;
  setConfig: React.Dispatch<React.SetStateAction<VariationConfig>>;
  sourceVideoDuration: number;
  availableApiKeys: string[];
  onBack: () => void;
  onGenerate: (brainOutput: BrainOutput) => void;
}

const PLATFORMS = [
  { id: "tiktok", label: "TikTok", ratio: "9:16" },
  { id: "instagram-reels", label: "Instagram Reels", ratio: "9:16" },
  { id: "youtube-shorts", label: "YouTube Shorts", ratio: "9:16" },
  { id: "facebook", label: "Facebook", ratio: "4:5" },
  { id: "instagram-feed", label: "Instagram Feed", ratio: "1:1" },
];

export const AICreativeConfigPanel = ({
  config,
  setConfig,
  sourceVideoDuration,
  availableApiKeys,
  onBack,
  onGenerate,
}: AICreativeConfigPanelProps) => {
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [brainOutput, setBrainOutput] = useState<BrainOutput | null>(null);
  
  // Get audience from global context (inherited from Settings)
  const { resolved: audience, isLoading: audienceLoading } = useAudience();
  
  // Local overrides - default to global settings
  const [localLanguage, setLocalLanguage] = useState<string | null>(null);
  const [localCountry, setLocalCountry] = useState<string | null>(null);
  
  // Effective values (local override or global default)
  const effectiveLanguage = localLanguage ?? audience.language;
  const effectiveCountry = localCountry ?? audience.country;
  
  // Check if audience is configured
  const audienceConfigured = useMemo(() => 
    isAudienceConfigured(effectiveLanguage, effectiveCountry),
    [effectiveLanguage, effectiveCountry]
  );
  
  // Track if user has made local changes
  const hasLocalOverride = localLanguage !== null || localCountry !== null;

  // Quick cost estimation for display
  const costEstimate = useMemo(() => {
    return estimateCostRange(config.count, availableApiKeys);
  }, [config.count, availableApiKeys]);

  // Run brain analysis when config changes - using effective audience
  useEffect(() => {
    if (audienceLoading) return;
    
    const brain = new AICreativeBrain({
      numberOfVideos: config.count,
      language: effectiveLanguage,
      market: effectiveCountry,
      platform: config.adIntelligence?.platform || 'tiktok',
      sourceVideoDuration: sourceVideoDuration || 30,
      availableApiKeys,
    });
    
    const output = brain.generateDecisions();
    setBrainOutput(output);
  }, [config.count, config.adIntelligence?.platform, sourceVideoDuration, availableApiKeys, effectiveLanguage, effectiveCountry, audienceLoading]);

  const handleGenerate = () => {
    if (!audienceConfigured) {
      return; // Blocked by UI
    }
    if (brainOutput) {
      onGenerate(brainOutput);
    }
  };
  
  // Get display info
  const countryInfo = getCountryByCode(effectiveCountry);
  const languageInfo = getLanguageByCode(effectiveLanguage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Configure Variations</h2>
          <p className="text-muted-foreground text-sm">
            AI handles all creative decisions automatically
          </p>
        </div>
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Audience Settings - Defaults from Settings with Override Option */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Target Audience
            </CardTitle>
            {hasLocalOverride ? (
              <Badge variant="outline" className="text-orange-500 border-orange-500/50">
                Local Override
              </Badge>
            ) : (
              <Badge className="bg-green-500/20 text-green-400">
                From Settings
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Language Selector */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Languages className="w-3 h-3" />
                Language
              </Label>
              <Select
                value={effectiveLanguage}
                onValueChange={(value) => setLocalLanguage(value)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {languageInfo ? `${languageInfo.name} (${languageInfo.nativeName})` : effectiveLanguage}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-60">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Selector */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Globe className="w-3 h-3" />
                Country
              </Label>
              <Select
                value={effectiveCountry}
                onValueChange={(value) => setLocalCountry(value)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {countryInfo ? `${countryInfo.flag} ${countryInfo.name}` : effectiveCountry}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-60">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Reset to defaults button */}
          {hasLocalOverride && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground"
              onClick={() => {
                setLocalLanguage(null);
                setLocalCountry(null);
              }}
            >
              Reset to Settings defaults
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Warning if audience not configured */}
      {!audienceLoading && !audienceConfigured && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Generation Blocked:</strong> Please select a language and country above, or configure defaults in Settings → Preferences.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Auto Banner */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <Label className="text-lg font-semibold flex items-center gap-2">
                  AI Brain Active
                  <Badge className="bg-green-500/20 text-green-400 text-xs">Always On</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Optimizing hooks, pacing, transitions, engines & cost automatically
                </p>
              </div>
            </div>
          </div>
          
          {/* AI Capabilities */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Sparkles className="w-3 h-3 mr-1" /> Auto Hooks
            </Badge>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Cpu className="w-3 h-3 mr-1" /> Smart Engine Selection
            </Badge>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Clock className="w-3 h-3 mr-1" /> 20-35s Duration
            </Badge>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <DollarSign className="w-3 h-3 mr-1" /> Cost Optimized
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Number of Videos */}
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

        {/* Right Column - Export Platform */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Export Platform
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Platform & Aspect Ratio</Label>
              <Select
                value={config.adIntelligence?.platform || "tiktok"}
                onValueChange={(value) => {
                  const platform = PLATFORMS.find(p => p.id === value);
                  setConfig((prev) => ({
                    ...prev,
                    ratios: [platform?.ratio || "9:16"],
                    adIntelligence: { ...prev.adIntelligence, platform: value },
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {PLATFORMS.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      {platform.ratio} — {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Estimate Card */}
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <Label className="text-base font-semibold">Estimated Cost</Label>
                <p className="text-xs text-muted-foreground">
                  {costEstimate.strategy}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-500">
                ${costEstimate.optimized.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                Range: ${costEstimate.min.toFixed(2)} - ${costEstimate.max.toFixed(2)}
              </div>
            </div>
          </div>
          
          {/* Duration info */}
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>All videos will be 20-35 seconds (AI optimized per variation)</span>
          </div>
        </CardContent>
      </Card>

      {/* Debug Panel Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between text-muted-foreground hover:text-foreground"
        onClick={() => setShowDebugPanel(!showDebugPanel)}
      >
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4" />
          View AI Decisions (Debug)
        </span>
        {showDebugPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {/* Debug Panel */}
      {showDebugPanel && brainOutput && (
        <AIDecisionDebugPanel brainOutput={brainOutput} />
      )}

      {/* Generate Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={handleGenerate}
          size="lg"
          disabled={!audienceConfigured || audienceLoading}
          className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 px-8"
        >
          <Zap className="w-5 h-5 mr-2" />
          Generate Plan ({config.count} variations)
        </Button>
      </div>
    </div>
  );
};
