import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Brain, 
  Globe, 
  Target, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  Zap,
  ShoppingBag,
  Users,
  MapPin
} from "lucide-react";
import { useAdIntelligence, MARKET_PROFILES, VIDEO_TYPE_STRUCTURES, PLATFORM_IDENTITIES } from "@/hooks/useAdIntelligence";

// Language options
const LANGUAGES = [
  { id: "ar-sa", label: "Arabic (Saudi)", flag: "🇸🇦" },
  { id: "ar", label: "Arabic (MSA)", flag: "🌍" },
  { id: "ar-gulf", label: "Arabic (Gulf)", flag: "🇦🇪" },
  { id: "en", label: "English", flag: "🇺🇸" },
  { id: "es", label: "Spanish", flag: "🇪🇸" },
  { id: "fr", label: "French", flag: "🇫🇷" },
  { id: "de", label: "German", flag: "🇩🇪" },
  { id: "pt", label: "Portuguese", flag: "🇧🇷" },
];

// Market options
const MARKETS = [
  { id: "saudi", label: "Saudi Arabia", icon: "🇸🇦" },
  { id: "uae", label: "UAE", icon: "🇦🇪" },
  { id: "usa", label: "United States", icon: "🇺🇸" },
  { id: "europe", label: "Europe", icon: "🇪🇺" },
  { id: "latam", label: "Latin America", icon: "🌎" },
  { id: "global", label: "Global", icon: "🌍" },
];

// Video types
const VIDEO_TYPES = [
  { id: "ai-auto", label: "🤖 AI Auto (Recommended)", isAI: true },
  { id: "ai-mix", label: "🎲 AI Mix (Multiple Types)", isAI: true },
  { id: "ugc-review", label: "UGC Review" },
  { id: "problem-solution", label: "Problem/Solution" },
  { id: "testimonial", label: "Testimonial" },
  { id: "unboxing", label: "Unboxing" },
  { id: "before-after", label: "Before/After" },
  { id: "day-in-life", label: "Day in Life" },
  { id: "educational", label: "Educational" },
  { id: "lifestyle", label: "Lifestyle" },
];

// Product categories
const PRODUCT_CATEGORIES = [
  { id: "beauty", label: "Beauty & Skincare" },
  { id: "health", label: "Health & Wellness" },
  { id: "fashion", label: "Fashion & Apparel" },
  { id: "tech", label: "Tech & Gadgets" },
  { id: "home", label: "Home & Living" },
  { id: "food", label: "Food & Beverage" },
  { id: "fitness", label: "Fitness & Sports" },
  { id: "baby", label: "Baby & Kids" },
  { id: "pets", label: "Pet Products" },
  { id: "automotive", label: "Automotive" },
  { id: "general", label: "General" },
];

// Platforms
const PLATFORMS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram-reels", label: "Instagram Reels" },
  { id: "youtube-shorts", label: "YouTube Shorts" },
  { id: "snapchat", label: "Snapchat" },
  { id: "meta-ads", label: "Meta Ads" },
];

// Conversion goals
const CONVERSION_GOALS = [
  { id: "cod", label: "COD Sales" },
  { id: "prepaid", label: "Prepaid Sales" },
  { id: "lead-gen", label: "Lead Generation" },
  { id: "app-install", label: "App Install" },
  { id: "awareness", label: "Brand Awareness" },
];

// Audience age ranges
const AGE_RANGES = [
  { id: "18-24", label: "18-24" },
  { id: "25-34", label: "25-34" },
  { id: "35-44", label: "35-44" },
  { id: "45-54", label: "45-54" },
  { id: "55+", label: "55+" },
  { id: "all", label: "All Ages" },
];

// Audience genders
const GENDERS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "all", label: "All" },
];

interface AIAdIntelligencePanelProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  onStructureGenerated?: (structure: any) => void;
}

export const AIAdIntelligencePanel = ({
  config,
  setConfig,
  onStructureGenerated
}: AIAdIntelligencePanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [productInfoExpanded, setProductInfoExpanded] = useState(false);
  const [audienceExpanded, setAudienceExpanded] = useState(false);
  
  const { 
    isLoading, 
    getMarketProfile, 
    generateCompleteVariation,
    generatedStructure,
    generatedHooks
  } = useAdIntelligence();

  const selectedMarketProfile = getMarketProfile(config.adIntelligence?.market || 'global');

  const updateAdIntelligence = (key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      adIntelligence: {
        ...prev.adIntelligence,
        [key]: value
      }
    }));
  };

  const updateTargetAudience = (key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      adIntelligence: {
        ...prev.adIntelligence,
        targetAudience: {
          ...prev.adIntelligence?.targetAudience,
          [key]: value
        }
      }
    }));
  };

  const updateProductContext = (key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      adIntelligence: {
        ...prev.adIntelligence,
        productContext: {
          ...prev.adIntelligence?.productContext,
          [key]: value
        }
      }
    }));
  };

  const handleGenerateStructure = async () => {
    const intelligenceConfig = {
      language: config.adIntelligence?.language || config.voiceSettings?.language || 'en',
      market: config.adIntelligence?.market || 'global',
      videoType: config.adIntelligence?.videoType || 'ugc-review',
      targetAudience: config.adIntelligence?.targetAudience || {},
      productCategory: config.adIntelligence?.productCategory || 'general',
      pacing: config.pacing || 'fast',
      hookStyles: config.hookStyles || ['problem-solution'],
      transitions: config.transitions || ['hard-cut'],
      engineTier: config.engineTier || 'low',
      platform: config.adIntelligence?.platform || 'tiktok',
      conversionGoal: config.adIntelligence?.conversionGoal || 'cod'
    };

    const result = await generateCompleteVariation(
      intelligenceConfig,
      config.adIntelligence?.productContext,
      undefined
    );

    if (result && onStructureGenerated) {
      onStructureGenerated(result);
    }
  };

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <span>AI Ad Intelligence</span>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
                  Universal
                </Badge>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* AI Intelligence Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <div>
                  <Label className="font-medium">Enable AI Intelligence</Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-adapt content to language, market & audience
                  </p>
                </div>
              </div>
              <Switch
                checked={config.adIntelligence?.enabled ?? true}
                onCheckedChange={(checked) => updateAdIntelligence('enabled', checked)}
              />
            </div>

            {/* Language & Market Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Content Language
                </Label>
                <Select
                  value={config.adIntelligence?.language || 'en'}
                  onValueChange={(value) => updateAdIntelligence('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Target Market
                </Label>
                <Select
                  value={config.adIntelligence?.market || 'global'}
                  onValueChange={(value) => updateAdIntelligence('market', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETS.map((market) => (
                      <SelectItem key={market.id} value={market.id}>
                        <span className="flex items-center gap-2">
                          <span>{market.icon}</span>
                          <span>{market.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Market Psychology Preview */}
            {config.adIntelligence?.market && (
              <div className="p-3 rounded-lg bg-accent/20 border border-border space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Market Psychology</div>
                <div className="flex flex-wrap gap-1">
                  {selectedMarketProfile.emotionalTriggers.map((trigger) => (
                    <Badge key={trigger} variant="outline" className="text-xs">
                      {trigger}
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Buying:</span> {selectedMarketProfile.buyingBehavior}</div>
                  <div><span className="text-muted-foreground">CTA Style:</span> {selectedMarketProfile.ctaStyle}</div>
                  <div><span className="text-muted-foreground">Payment:</span> {selectedMarketProfile.paymentPreference}</div>
                  <div><span className="text-muted-foreground">Urgency:</span> {selectedMarketProfile.urgencyStyle}</div>
                </div>
              </div>
            )}

            {/* Video Type & Platform */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Video Type</Label>
                <Select
                  value={config.adIntelligence?.videoType || 'ai-auto'}
                  onValueChange={(value) => updateAdIntelligence('videoType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <span className={type.isAI ? "text-purple-400 font-medium" : ""}>
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Platform</Label>
                <Select
                  value={config.adIntelligence?.platform || 'tiktok'}
                  onValueChange={(value) => updateAdIntelligence('platform', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Category & Conversion Goal */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Product Category
                </Label>
                <Select
                  value={config.adIntelligence?.productCategory || 'general'}
                  onValueChange={(value) => updateAdIntelligence('productCategory', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Conversion Goal
                </Label>
                <Select
                  value={config.adIntelligence?.conversionGoal || 'cod'}
                  onValueChange={(value) => updateAdIntelligence('conversionGoal', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONVERSION_GOALS.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Context (Collapsible) */}
            <Collapsible open={productInfoExpanded} onOpenChange={setProductInfoExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-2 rounded-lg bg-accent/20 cursor-pointer hover:bg-accent/30 transition-colors">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Product Details (Optional)
                  </span>
                  {productInfoExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Product Name</Label>
                  <Input
                    placeholder="Enter product name..."
                    value={config.adIntelligence?.productContext?.name || ''}
                    onChange={(e) => updateProductContext('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Product Description</Label>
                  <Textarea
                    placeholder="Describe your product, its benefits, and unique features..."
                    value={config.adIntelligence?.productContext?.description || ''}
                    onChange={(e) => updateProductContext('description', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Key Benefits (comma separated)</Label>
                  <Input
                    placeholder="Fast results, Easy to use, Natural ingredients..."
                    value={config.adIntelligence?.productContext?.benefits?.join(', ') || ''}
                    onChange={(e) => updateProductContext('benefits', e.target.value.split(',').map(b => b.trim()))}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Target Audience (Collapsible) */}
            <Collapsible open={audienceExpanded} onOpenChange={setAudienceExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-2 rounded-lg bg-accent/20 cursor-pointer hover:bg-accent/30 transition-colors">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Target Audience (Optional)
                  </span>
                  {audienceExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Age Range</Label>
                    <Select
                      value={config.adIntelligence?.targetAudience?.ageRange || 'all'}
                      onValueChange={(value) => updateTargetAudience('ageRange', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_RANGES.map((age) => (
                          <SelectItem key={age.id} value={age.id}>
                            {age.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Gender</Label>
                    <Select
                      value={config.adIntelligence?.targetAudience?.gender || 'all'}
                      onValueChange={(value) => updateTargetAudience('gender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((gender) => (
                          <SelectItem key={gender.id} value={gender.id}>
                            {gender.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Interests (comma separated)</Label>
                  <Input
                    placeholder="Beauty, Fitness, Technology..."
                    value={config.adIntelligence?.targetAudience?.interests?.join(', ') || ''}
                    onChange={(e) => updateTargetAudience('interests', e.target.value.split(',').map(i => i.trim()))}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Generate AI Structure Button */}
            <Button
              onClick={handleGenerateStructure}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating AI Structure...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate AI Ad Structure
                </>
              )}
            </Button>

            {/* Generated Structure Preview */}
            {generatedStructure && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  AI Structure Generated
                </div>
                {generatedHooks.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {generatedHooks.length} hooks ready • {generatedStructure.scenes?.length || 0} scenes structured
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
