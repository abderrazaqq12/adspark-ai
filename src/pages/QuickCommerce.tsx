import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Rocket, Package, FileText, Image, Layout as LayoutIcon, 
  Video, Download, ChevronRight, Loader2, Check, Globe, 
  Users, Sparkles, Zap, Link as LinkIcon
} from 'lucide-react';
import { 
  LANGUAGE_NAMES, MARKET_NAMES, AUDIENCE_NAMES,
  type Language, type Market, type Audience 
} from '@/lib/localization';

type Step = 'import' | 'content' | 'images' | 'landing' | 'videos' | 'export';

interface ProductData {
  title: string;
  description: string;
  benefits: string[];
  features: string[];
  images: string[];
  price: string;
  sourceUrl: string;
}

const QuickCommerce = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('import');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Localization settings
  const [language, setLanguage] = useState<Language>('ar');
  const [market, setMarket] = useState<Market>('sa');
  const [audience, setAudience] = useState<Audience>('both');
  
  // Product data
  const [importUrl, setImportUrl] = useState('');
  const [importType, setImportType] = useState<'alibaba' | 'shopify' | 'manual'>('manual');
  const [productData, setProductData] = useState<ProductData>({
    title: '',
    description: '',
    benefits: [],
    features: [],
    images: [],
    price: '',
    sourceUrl: ''
  });
  
  // Generated content
  const [generatedContent, setGeneratedContent] = useState<{
    description: string;
    landingPage: string;
    hooks: string[];
    scripts: string[];
    offers: string[];
  }>({
    description: '',
    landingPage: '',
    hooks: [],
    scripts: [],
    offers: []
  });
  
  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'import', label: 'Product Import', icon: <Package className="h-4 w-4" /> },
    { key: 'content', label: 'AI Content', icon: <FileText className="h-4 w-4" /> },
    { key: 'images', label: 'AI Images', icon: <Image className="h-4 w-4" /> },
    { key: 'landing', label: 'Landing Page', icon: <LayoutIcon className="h-4 w-4" /> },
    { key: 'videos', label: 'Video Ads', icon: <Video className="h-4 w-4" /> },
    { key: 'export', label: 'Export', icon: <Download className="h-4 w-4" /> },
  ];
  
  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  
  const handleImportProduct = async () => {
    if (!importUrl && importType !== 'manual') {
      toast.error('Please enter a product URL');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Simulate product import (would call actual API)
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(r => setTimeout(r, 300));
        setProgress(i);
      }
      
      // For now, use manual data or mock imported data
      if (importType === 'manual') {
        toast.success('Product data saved');
      } else {
        toast.success('Product imported successfully');
        // Would populate productData from API response
      }
      
      setCurrentStep('content');
    } catch (error) {
      toast.error('Failed to import product');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGenerateContent = async () => {
    if (!productData.title) {
      toast.error('Please enter product title');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        toast.error('Please sign in to continue');
        return;
      }
      
      // Call content generation edge function
      const { data, error } = await supabase.functions.invoke('generate-script-from-product', {
        body: {
          productName: productData.title,
          productDescription: productData.description,
          language,
          market,
          audience,
          contentTypes: ['description', 'hooks', 'scripts', 'offers']
        }
      });
      
      if (error) throw error;
      
      setGeneratedContent({
        description: data?.description || '',
        landingPage: '',
        hooks: data?.hooks || [],
        scripts: data?.scripts || [],
        offers: data?.offers || []
      });
      
      toast.success('Content generated successfully');
      setCurrentStep('images');
    } catch (error) {
      console.error('Content generation error:', error);
      toast.error('Failed to generate content');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGenerateImages = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Would call image generation API
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(r => setTimeout(r, 500));
        setProgress(i);
      }
      
      toast.success('Images generated successfully');
      setCurrentStep('landing');
    } catch (error) {
      toast.error('Failed to generate images');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGenerateLandingPage = async () => {
    setIsProcessing(true);
    
    try {
      // Would generate landing page HTML
      await new Promise(r => setTimeout(r, 2000));
      
      toast.success('Landing page generated');
      setCurrentStep('videos');
    } catch (error) {
      toast.error('Failed to generate landing page');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGenerateVideos = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Create project and trigger video generation
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        toast.error('Please sign in');
        return;
      }
      
      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: productData.title,
          product_name: productData.title,
          language,
          market,
          audience,
          user_id: session.session.user.id,
          status: 'processing'
        })
        .select()
        .single();
      
      if (projectError) throw projectError;
      
      // Trigger autopilot generation
      const { error: autopilotError } = await supabase.functions.invoke('autopilot-generate', {
        body: {
          projectId: project.id,
          productName: productData.title,
          productDescription: productData.description,
          language,
          market,
          audience
        }
      });
      
      if (autopilotError) throw autopilotError;
      
      toast.success('Video generation started');
      setCurrentStep('export');
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error('Failed to start video generation');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              Quick Commerce
            </h1>
            <p className="text-muted-foreground">
              Product to Video Ads in minutes
            </p>
          </div>
          
          {/* Localization Quick Settings */}
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="w-32">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LANGUAGE_NAMES).map(([key, { english }]) => (
                  <SelectItem key={key} value={key}>{english}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={market} onValueChange={(v) => setMarket(v as Market)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MARKET_NAMES).map(([key, { name, flag }]) => (
                  <SelectItem key={key} value={key}>{flag} {name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
              <SelectTrigger className="w-32">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AUDIENCE_NAMES).map(([key, name]) => (
                  <SelectItem key={key} value={key}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between bg-card rounded-lg p-4 border">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => setCurrentStep(step.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  currentStep === step.key 
                    ? 'bg-primary text-primary-foreground' 
                    : index < currentStepIndex
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon
                )}
                <span className="hidden md:inline text-sm font-medium">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
        
        {/* Step Content */}
        <Card className="min-h-[500px]">
          <CardContent className="pt-6">
            {currentStep === 'import' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">Import Your Product</h2>
                  <p className="text-muted-foreground">
                    Import from Alibaba, Shopify, or enter manually
                  </p>
                </div>
                
                <Tabs value={importType} onValueChange={(v) => setImportType(v as typeof importType)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="alibaba">Alibaba</TabsTrigger>
                    <TabsTrigger value="shopify">Shopify</TabsTrigger>
                    <TabsTrigger value="manual">Manual</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="alibaba" className="space-y-4">
                    <div>
                      <Label>Alibaba Product URL</Label>
                      <div className="flex gap-2 mt-2">
                        <Input 
                          placeholder="https://www.alibaba.com/product/..."
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                        />
                        <Button onClick={handleImportProduct} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                          Import
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="shopify" className="space-y-4">
                    <div>
                      <Label>Shopify Product URL</Label>
                      <div className="flex gap-2 mt-2">
                        <Input 
                          placeholder="https://yourstore.myshopify.com/products/..."
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                        />
                        <Button onClick={handleImportProduct} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                          Import
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="manual" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Product Title *</Label>
                        <Input 
                          placeholder="Enter product name"
                          value={productData.title}
                          onChange={(e) => setProductData(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Price</Label>
                        <Input 
                          placeholder="$99.99"
                          value={productData.price}
                          onChange={(e) => setProductData(prev => ({ ...prev, price: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Product Description</Label>
                      <Textarea 
                        placeholder="Describe your product..."
                        rows={4}
                        value={productData.description}
                        onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label>Product Image URLs (one per line)</Label>
                      <Textarea 
                        placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                        rows={3}
                        value={productData.images.join('\n')}
                        onChange={(e) => setProductData(prev => ({ 
                          ...prev, 
                          images: e.target.value.split('\n').filter(Boolean) 
                        }))}
                      />
                    </div>
                    
                    <Button onClick={handleImportProduct} disabled={isProcessing} className="w-full">
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      Continue to Content Generation
                    </Button>
                  </TabsContent>
                </Tabs>
                
                {isProcessing && (
                  <div className="mt-4">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Importing product data... {progress}%
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {currentStep === 'content' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Content Factory
                  </h2>
                  <p className="text-muted-foreground">
                    Generate descriptions, hooks, scripts, and offers
                  </p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Product Description</CardTitle>
                      <CardDescription>
                        Localized for {MARKET_NAMES[market].name} in {LANGUAGE_NAMES[language].english}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {generatedContent.description ? (
                        <p className="text-sm">{generatedContent.description}</p>
                      ) : (
                        <p className="text-muted-foreground text-sm">Will be generated...</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Marketing Hooks</CardTitle>
                      <CardDescription>30+ attention-grabbing hooks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {generatedContent.hooks.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {generatedContent.hooks.slice(0, 5).map((hook, i) => (
                            <Badge key={i} variant="secondary">{hook}</Badge>
                          ))}
                          {generatedContent.hooks.length > 5 && (
                            <Badge variant="outline">+{generatedContent.hooks.length - 5} more</Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">Will be generated...</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Video Scripts</CardTitle>
                      <CardDescription>6s, 15s, 30s formats</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {generatedContent.scripts.length > 0 ? (
                        <div className="space-y-2">
                          {generatedContent.scripts.slice(0, 3).map((script, i) => (
                            <p key={i} className="text-sm truncate">{script}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">Will be generated...</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Offer Ideas</CardTitle>
                      <CardDescription>Pricing psychology & urgency</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {generatedContent.offers.length > 0 ? (
                        <div className="space-y-2">
                          {generatedContent.offers.slice(0, 3).map((offer, i) => (
                            <Badge key={i} variant="outline" className="block">{offer}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">Will be generated...</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                <Button 
                  onClick={handleGenerateContent} 
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating Content...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate All Content
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {currentStep === 'images' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">AI Image Generator</h2>
                  <p className="text-muted-foreground">
                    Generate Amazon-style, lifestyle, and promotional images
                  </p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  {['Amazon Style', 'Before/After', 'Lifestyle', 'Packaging', 'Thumbnail', 'Hero'].map((type) => (
                    <Card key={type} className="aspect-square flex items-center justify-center bg-muted">
                      <div className="text-center">
                        <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">{type}</p>
                      </div>
                    </Card>
                  ))}
                </div>
                
                <Button onClick={handleGenerateImages} disabled={isProcessing} className="w-full" size="lg">
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating Images... {progress}%
                    </>
                  ) : (
                    <>
                      <Image className="h-4 w-4 mr-2" />
                      Generate 6 Product Images
                    </>
                  )}
                </Button>
                
                {isProcessing && <Progress value={progress} className="h-2" />}
              </div>
            )}
            
            {currentStep === 'landing' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">Landing Page Generator</h2>
                  <p className="text-muted-foreground">
                    Auto-generate high-converting landing page sections
                  </p>
                </div>
                
                <div className="grid gap-4">
                  {['Hero Section', 'Features', 'Social Proof', 'CTA Blocks', 'FAQ', 'Guarantee'].map((section) => (
                    <Card key={section}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">{section}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
                
                <Button onClick={handleGenerateLandingPage} disabled={isProcessing} className="w-full" size="lg">
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating Landing Page...
                    </>
                  ) : (
                    <>
                      <LayoutIcon className="h-4 w-4 mr-2" />
                      Generate Landing Page
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {currentStep === 'videos' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">Video Ad Generation</h2>
                  <p className="text-muted-foreground">
                    Generate 10-100+ video variations automatically
                  </p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Script Variations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">10</p>
                      <p className="text-muted-foreground text-sm">Different scripts</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Video Variations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">100</p>
                      <p className="text-muted-foreground text-sm">Per scene combinations</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Button onClick={handleGenerateVideos} disabled={isProcessing} className="w-full" size="lg">
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Starting Video Generation...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Generate All Videos
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {currentStep === 'export' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">Export & Download</h2>
                  <p className="text-muted-foreground">
                    Download your videos for all platforms
                  </p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-4">
                  {['TikTok', 'Instagram', 'YouTube Shorts', 'Meta Ads'].map((platform) => (
                    <Card key={platform} className="text-center p-4">
                      <h3 className="font-medium">{platform}</h3>
                      <Badge variant="secondary" className="mt-2">9:16</Badge>
                    </Card>
                  ))}
                </div>
                
                <Button className="w-full" size="lg">
                  <Download className="h-4 w-4 mr-2" />
                  Download All Videos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default QuickCommerce;
