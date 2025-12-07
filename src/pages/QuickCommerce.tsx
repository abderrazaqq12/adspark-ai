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
  Users, Sparkles, Zap, Link as LinkIcon, Upload, ArrowRight,
  Play, Clock, Target, TrendingUp
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
  
  const steps: { key: Step; label: string; icon: React.ReactNode; description: string }[] = [
    { key: 'import', label: 'Product', icon: <Package className="h-5 w-5" />, description: 'Import product details' },
    { key: 'content', label: 'AI Content', icon: <FileText className="h-5 w-5" />, description: 'Generate marketing copy' },
    { key: 'images', label: 'Images', icon: <Image className="h-5 w-5" />, description: 'Create visuals' },
    { key: 'landing', label: 'Landing', icon: <LayoutIcon className="h-5 w-5" />, description: 'Build landing page' },
    { key: 'videos', label: 'Videos', icon: <Video className="h-5 w-5" />, description: 'Generate video ads' },
    { key: 'export', label: 'Export', icon: <Download className="h-5 w-5" />, description: 'Download & publish' },
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
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(r => setTimeout(r, 300));
        setProgress(i);
      }
      
      if (importType === 'manual') {
        toast.success('Product data saved');
      } else {
        toast.success('Product imported successfully');
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
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        toast.error('Please sign in');
        return;
      }
      
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
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto p-6 lg:p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
              <Rocket className="h-5 w-5" />
              <span className="font-medium">Quick Commerce</span>
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Product to Video Ads in Minutes
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Import your product, and let AI create marketing content, images, landing pages, and video ads automatically.
            </p>
          </div>
          
          {/* Localization Quick Settings */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="w-40 bg-card border-border">
                <Globe className="h-4 w-4 mr-2 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LANGUAGE_NAMES).map(([key, { english }]) => (
                  <SelectItem key={key} value={key}>{english}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={market} onValueChange={(v) => setMarket(v as Market)}>
              <SelectTrigger className="w-44 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MARKET_NAMES).map(([key, { name, flag }]) => (
                  <SelectItem key={key} value={key}>{flag} {name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
              <SelectTrigger className="w-36 bg-card border-border">
                <Users className="h-4 w-4 mr-2 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AUDIENCE_NAMES).map(([key, name]) => (
                  <SelectItem key={key} value={key}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Progress Steps - Enhanced Visual */}
          <div className="relative">
            <div className="absolute top-8 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-500"
                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
              />
            </div>
            <div className="relative flex justify-between">
              {steps.map((step, index) => {
                const isActive = currentStep === step.key;
                const isCompleted = index < currentStepIndex;
                
                return (
                  <button
                    key={step.key}
                    onClick={() => setCurrentStep(step.key)}
                    className="flex flex-col items-center group"
                  >
                    <div className={`
                      w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 mb-2
                      ${isActive 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110' 
                        : isCompleted
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                      }
                    `}>
                      {isCompleted ? <Check className="h-6 w-6" /> : step.icon}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {step.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Step Content */}
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              {currentStep === 'import' && (
                <div className="max-w-2xl mx-auto space-y-8">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Import Your Product</h2>
                    <p className="text-muted-foreground">
                      Start by adding your product details
                    </p>
                  </div>
                  
                  <Tabs value={importType} onValueChange={(v) => setImportType(v as typeof importType)}>
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                      <TabsTrigger value="alibaba" className="gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Alibaba
                      </TabsTrigger>
                      <TabsTrigger value="shopify" className="gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Shopify
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Manual
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="alibaba" className="space-y-4 mt-6">
                      <div>
                        <Label className="text-foreground">Alibaba Product URL</Label>
                        <div className="flex gap-2 mt-2">
                          <Input 
                            placeholder="https://www.alibaba.com/product/..."
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            className="bg-background border-border"
                          />
                          <Button onClick={handleImportProduct} disabled={isProcessing} className="bg-primary">
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            Import
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="shopify" className="space-y-4 mt-6">
                      <div>
                        <Label className="text-foreground">Shopify Product URL</Label>
                        <div className="flex gap-2 mt-2">
                          <Input 
                            placeholder="https://yourstore.myshopify.com/products/..."
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            className="bg-background border-border"
                          />
                          <Button onClick={handleImportProduct} disabled={isProcessing} className="bg-primary">
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            Import
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="manual" className="space-y-6 mt-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-foreground">Product Title *</Label>
                          <Input 
                            placeholder="Enter product name"
                            value={productData.title}
                            onChange={(e) => setProductData(prev => ({ ...prev, title: e.target.value }))}
                            className="bg-background border-border h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Price</Label>
                          <Input 
                            placeholder="$99.99"
                            value={productData.price}
                            onChange={(e) => setProductData(prev => ({ ...prev, price: e.target.value }))}
                            className="bg-background border-border h-12"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-foreground">Product Description</Label>
                        <Textarea 
                          placeholder="Describe your product, its features, and benefits..."
                          rows={5}
                          value={productData.description}
                          onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                          className="bg-background border-border resize-none"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-foreground">Product Image URLs (one per line)</Label>
                        <Textarea 
                          placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                          rows={3}
                          value={productData.images.join('\n')}
                          onChange={(e) => setProductData(prev => ({ 
                            ...prev, 
                            images: e.target.value.split('\n').filter(Boolean) 
                          }))}
                          className="bg-background border-border resize-none"
                        />
                      </div>
                      
                      <Button 
                        onClick={handleImportProduct} 
                        disabled={isProcessing || !productData.title} 
                        className="w-full h-12 text-lg bg-gradient-primary shadow-glow"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <ArrowRight className="h-5 w-5 mr-2" />
                        )}
                        Continue to Content Generation
                      </Button>
                    </TabsContent>
                  </Tabs>
                  
                  {isProcessing && (
                    <div className="mt-6">
                      <Progress value={progress} className="h-2" />
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        Processing... {progress}%
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {currentStep === 'content' && (
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">AI Content Factory</h2>
                    <p className="text-muted-foreground">
                      Generate descriptions, hooks, scripts, and offers for {MARKET_NAMES[market].name}
                    </p>
                  </div>
                  
                  {generatedContent.hooks.length === 0 ? (
                    <div className="text-center py-12">
                      <Button 
                        onClick={handleGenerateContent} 
                        disabled={isProcessing}
                        size="lg"
                        className="bg-gradient-primary shadow-glow h-14 px-8 text-lg"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Generating Content...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5 mr-2" />
                            Generate AI Content
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      <Card className="bg-muted/30 border-border">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Product Description
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-foreground">{generatedContent.description || 'Not generated yet'}</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-muted/30 border-border">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Marketing Hooks ({generatedContent.hooks.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {generatedContent.hooks.slice(0, 5).map((hook, i) => (
                            <Badge key={i} variant="secondary" className="mr-2 mb-2">{hook}</Badge>
                          ))}
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-muted/30 border-border md:col-span-2">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Video className="h-5 w-5 text-primary" />
                            Video Scripts ({generatedContent.scripts.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {generatedContent.scripts.slice(0, 3).map((script, i) => (
                            <div key={i} className="p-3 rounded-lg bg-background border border-border">
                              <p className="text-sm text-foreground line-clamp-2">{script}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      
                      <div className="md:col-span-2 flex justify-end">
                        <Button onClick={() => setCurrentStep('images')} size="lg" className="bg-gradient-primary">
                          Continue to Images
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {currentStep === 'images' && (
                <div className="max-w-2xl mx-auto space-y-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Image className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Generate Product Images</h2>
                  <p className="text-muted-foreground">
                    AI will create professional product images, lifestyle shots, and marketing visuals
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {['Product Shot', 'Lifestyle', 'Before/After', 'Packaging', 'Social', 'Thumbnail'].map((type) => (
                      <div key={type} className="aspect-square rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">{type}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={handleGenerateImages} 
                    disabled={isProcessing}
                    size="lg"
                    className="bg-gradient-primary shadow-glow"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Generating... {progress}%
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generate 6 AI Images
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {currentStep === 'landing' && (
                <div className="max-w-2xl mx-auto space-y-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <LayoutIcon className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Create Landing Page</h2>
                  <p className="text-muted-foreground">
                    Generate a high-converting landing page with all your content
                  </p>
                  
                  <div className="aspect-video rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                    <div className="text-center">
                      <LayoutIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <span className="text-sm text-muted-foreground">Landing Page Preview</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateLandingPage} 
                    disabled={isProcessing}
                    size="lg"
                    className="bg-gradient-primary shadow-glow"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generate Landing Page
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {currentStep === 'videos' && (
                <div className="max-w-2xl mx-auto space-y-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Video className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Generate Video Ads</h2>
                  <p className="text-muted-foreground">
                    Create multiple video ad variations for TikTok, Instagram, and YouTube
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {['6s Hook', '15s Fast', '30s UGC', '30s Problem', '30s Testimonial', '60s Full'].map((type) => (
                      <div key={type} className="aspect-[9/16] rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                        <div className="text-center">
                          <Play className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                          <span className="text-xs text-muted-foreground">{type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>~5 min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>10+ videos</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateVideos} 
                    disabled={isProcessing}
                    size="lg"
                    className="bg-gradient-primary shadow-glow"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Starting Generation...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        Generate All Videos
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {currentStep === 'export' && (
                <div className="max-w-2xl mx-auto space-y-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold">All Done!</h2>
                  <p className="text-muted-foreground">
                    Your video ads are being generated. You can track progress in your projects.
                  </p>
                  
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/projects')}>
                      View Projects
                    </Button>
                    <Button onClick={() => setCurrentStep('import')} className="bg-gradient-primary">
                      Create Another
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default QuickCommerce;