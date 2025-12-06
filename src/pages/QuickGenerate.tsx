import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, Sparkles, Zap, Clock, DollarSign, Film, FileText, Mic } from "lucide-react";
import { Layout } from "@/components/Layout";
import AutopilotProgress from "@/components/AutopilotProgress";

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic (Saudi)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

const PRICING_TIERS = [
  { value: 'free', label: 'Free Tier', description: 'Use free AI engines only' },
  { value: 'cheap', label: 'Budget', description: 'Low-cost engines' },
  { value: 'normal', label: 'Standard', description: 'Mid-range quality' },
  { value: 'expensive', label: 'Premium', description: 'Highest quality' },
];

export default function QuickGenerate() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    productName: '',
    productDescription: '',
    productImageUrl: '',
    language: 'en',
    pricingTier: 'free',
    scriptsCount: 10,
    variationsPerScene: 10,
  });

  const estimatedVideos = formData.scriptsCount * 5 * formData.variationsPerScene;
  const estimatedTime = Math.ceil(estimatedVideos * 0.5); // ~30 sec per video

  const handleGenerate = async () => {
    if (!formData.productName.trim()) {
      toast.error("Product name is required");
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to continue");
        navigate('/auth');
        return;
      }

      const response = await supabase.functions.invoke('autopilot-generate', {
        body: formData
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { jobId, projectId, estimatedVideos: totalVideos } = response.data;
      
      setActiveJobId(jobId);
      toast.success(`Autopilot started! Generating ${totalVideos} videos...`);

    } catch (error) {
      console.error('Autopilot error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start autopilot');
      setIsGenerating(false);
    }
  };

  if (activeJobId) {
    return (
      <div className="container max-w-4xl py-8">
        <AutopilotProgress jobId={activeJobId} onComplete={() => {
          setActiveJobId(null);
          setIsGenerating(false);
          navigate('/videos');
        }} />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-medium">One-Click Video Generation</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          Quick Generate
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Generate up to 100+ unique video ads with just your product info. 
          Our AI handles scripts, voiceovers, and video creation automatically.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Product Information
            </CardTitle>
            <CardDescription>
              Enter your product details and we'll do the rest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                placeholder="e.g., SmartWatch Pro X"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productDescription">Product Description</Label>
              <Textarea
                id="productDescription"
                placeholder="Describe your product's features, benefits, and target audience..."
                rows={4}
                value={formData.productDescription}
                onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productImageUrl">Product Image URL (optional)</Label>
              <Input
                id="productImageUrl"
                placeholder="https://example.com/product-image.jpg"
                value={formData.productImageUrl}
                onChange={(e) => setFormData({ ...formData, productImageUrl: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pricing Tier</Label>
                <Select
                  value={formData.pricingTier}
                  onValueChange={(value) => setFormData({ ...formData, pricingTier: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_TIERS.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        <div>
                          <span>{tier.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({tier.description})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Number of Scripts</Label>
                  <span className="text-sm text-muted-foreground">{formData.scriptsCount}</span>
                </div>
                <Slider
                  value={[formData.scriptsCount]}
                  onValueChange={([value]) => setFormData({ ...formData, scriptsCount: value })}
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Each script uses a different tone (engaging, professional, casual, etc.)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Variations per Scene</Label>
                  <span className="text-sm text-muted-foreground">{formData.variationsPerScene}</span>
                </div>
                <Slider
                  value={[formData.variationsPerScene]}
                  onValueChange={([value]) => setFormData({ ...formData, variationsPerScene: value })}
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  More variations = more unique video combinations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Generation Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Scripts:</span>
                  <span className="font-medium">{formData.scriptsCount} unique</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Voiceovers:</span>
                  <span className="font-medium">{formData.scriptsCount} generated</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Film className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Videos:</span>
                  <span className="font-bold text-primary">{estimatedVideos} variations</span>
                </div>
              </div>

              <div className="border-t border-primary/20 pt-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Est. time:</span>
                  <span className="font-medium">{estimatedTime}-{estimatedTime + 15} min</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Est. cost:</span>
                  <span className="font-medium">
                    {formData.pricingTier === 'free' ? '$0' : 
                     formData.pricingTier === 'cheap' ? `~$${(estimatedVideos * 0.02).toFixed(2)}` :
                     formData.pricingTier === 'normal' ? `~$${(estimatedVideos * 0.05).toFixed(2)}` :
                     `~$${(estimatedVideos * 0.10).toFixed(2)}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            size="lg" 
            className="w-full gap-2"
            onClick={handleGenerate}
            disabled={isGenerating || !formData.productName.trim()}
          >
            {isGenerating ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Generate {estimatedVideos} Videos
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You can track progress and pause generation at any time
          </p>
        </div>
      </div>
    </div>
  );
}
