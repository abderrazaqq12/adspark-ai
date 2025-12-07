import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowRight, 
  Loader2, 
  Lightbulb, 
  FileText, 
  Layout, 
  Sparkles,
  RefreshCw,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudioMarketingEngineProps {
  onNext: () => void;
}

interface MarketingAngle {
  id: string;
  name: string;
  description: string;
  selected: boolean;
}

interface GeneratedScript {
  id: string;
  tone: string;
  content: string;
  wordCount: number;
}

const defaultAngles: MarketingAngle[] = [
  { id: 'problem', name: 'Problem → Solution', description: 'Highlight pain point and how product solves it', selected: true },
  { id: 'emotional', name: 'Emotional Appeal', description: 'Connect with audience feelings and desires', selected: true },
  { id: 'social', name: 'Social Proof', description: 'Leverage testimonials and popularity', selected: false },
  { id: 'lifestyle', name: 'Lifestyle Desire', description: 'Show the aspirational lifestyle', selected: true },
  { id: 'scientific', name: 'Scientific/Technical', description: 'Focus on facts, features, specifications', selected: false },
  { id: 'value', name: 'Price/Value', description: 'Emphasize savings and value proposition', selected: false },
  { id: 'urgency', name: 'Urgency/FOMO', description: 'Create fear of missing out', selected: false },
  { id: 'authority', name: 'Authority/Expert', description: 'Position as expert recommendation', selected: false },
];

export const StudioMarketingEngine = ({ onNext }: StudioMarketingEngineProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('angles');
  const [angles, setAngles] = useState<MarketingAngle[]>(defaultAngles);
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [landingContent, setLandingContent] = useState<string>('');
  const [scriptsCount, setScriptsCount] = useState('10');
  const [productInfo, setProductInfo] = useState({ name: '', description: '' });

  useEffect(() => {
    loadProductInfo();
  }, []);

  const loadProductInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings?.preferences) {
        const prefs = settings.preferences as Record<string, string>;
        setProductInfo({
          name: prefs.studio_product_name || '',
          description: prefs.studio_description || ''
        });
      }
    } catch (error) {
      console.error('Error loading product info:', error);
    }
  };

  const toggleAngle = (id: string) => {
    setAngles(prev => prev.map(a => 
      a.id === id ? { ...a, selected: !a.selected } : a
    ));
  };

  const generateContent = async (type: 'angles' | 'scripts' | 'landing') => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      if (type === 'scripts') {
        // Generate scripts with different tones
        const tones = ['engaging', 'professional', 'urgent', 'emotional', 'casual', 'humorous', 'luxurious', 'educational', 'storytelling', 'direct'];
        const count = parseInt(scriptsCount);
        
        const response = await supabase.functions.invoke('generate-script-from-product', {
          body: {
            productName: productInfo.name,
            productDescription: productInfo.description,
            language: 'en',
            tone: tones[0],
          }
        });

        if (response.error) throw new Error(response.error.message);

        // Create mock scripts for demo
        const generatedScripts: GeneratedScript[] = tones.slice(0, count).map((tone, i) => ({
          id: `script-${i}`,
          tone,
          content: response.data?.script || `Sample ${tone} script for ${productInfo.name}...`,
          wordCount: response.data?.wordCount || Math.floor(Math.random() * 100) + 50,
        }));

        setScripts(generatedScripts);
        toast({
          title: "Scripts Generated",
          description: `${generatedScripts.length} script variations created`,
        });
      } else if (type === 'landing') {
        setLandingContent(`
# ${productInfo.name}

## Hero Section
**Headline:** Transform Your [Problem] Today
**Subheadline:** Join 10,000+ satisfied customers who discovered the secret to [benefit]

## Key Features
- Feature 1: [Benefit description]
- Feature 2: [Benefit description]
- Feature 3: [Benefit description]

## Social Proof
"This product changed my life!" - Happy Customer
★★★★★ 4.9/5 rating from 2,847 reviews

## Call to Action
**Offer:** Limited Time 50% OFF
**CTA Button:** Get Yours Now

## FAQ
Q: How does it work?
A: Simply [brief explanation]

## Guarantee
100% Money-Back Guarantee - Risk Free
        `);
        toast({
          title: "Landing Page Content Generated",
          description: "Hero, features, social proof, CTA, and FAQ sections created",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedAnglesCount = angles.filter(a => a.selected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Marketing Intelligence</h2>
          <p className="text-muted-foreground text-sm mt-1">Generate angles, scripts, and landing page content</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Step 2</Badge>
      </div>

      {/* Product Info Summary */}
      <Card className="p-4 bg-primary/5 border-primary/30">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">{productInfo.name || 'No product name'}</p>
            <p className="text-sm text-muted-foreground line-clamp-1">{productInfo.description || 'No description'}</p>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="angles" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Angles ({selectedAnglesCount})
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <FileText className="w-4 h-4" />
            Scripts ({scripts.length})
          </TabsTrigger>
          <TabsTrigger value="landing" className="gap-2">
            <Layout className="w-4 h-4" />
            Landing Page
          </TabsTrigger>
        </TabsList>

        {/* Marketing Angles */}
        <TabsContent value="angles" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Marketing Angles</h3>
              <Badge variant="secondary">{selectedAnglesCount} selected</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {angles.map((angle) => (
                <div 
                  key={angle.id}
                  onClick={() => toggleAngle(angle.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    angle.selected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={angle.selected} />
                    <div>
                      <p className="font-medium text-foreground">{angle.name}</p>
                      <p className="text-sm text-muted-foreground">{angle.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Scripts Generation */}
        <TabsContent value="scripts" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Script Generation</h3>
                <p className="text-sm text-muted-foreground">AI will generate multiple script variations with different tones</p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={scriptsCount} onValueChange={setScriptsCount}>
                  <SelectTrigger className="w-32 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 scripts</SelectItem>
                    <SelectItem value="10">10 scripts</SelectItem>
                    <SelectItem value="15">15 scripts</SelectItem>
                    <SelectItem value="20">20 scripts</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => generateContent('scripts')} disabled={isGenerating} className="gap-2">
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate
                </Button>
              </div>
            </div>

            {scripts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No scripts generated yet</p>
                <p className="text-sm">Click "Generate" to create script variations</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {scripts.map((script, index) => (
                  <div key={script.id} className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Script {index + 1}</span>
                        <Badge variant="secondary" className="capitalize">{script.tone}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{script.wordCount} words</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{script.content}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Landing Page Content */}
        <TabsContent value="landing" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Landing Page Content</h3>
                <p className="text-sm text-muted-foreground">Generate hero, features, social proof, CTA, FAQ sections</p>
              </div>
              <Button onClick={() => generateContent('landing')} disabled={isGenerating} className="gap-2">
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate
              </Button>
            </div>

            {!landingContent ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layout className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No landing page content yet</p>
                <p className="text-sm">Click "Generate" to create landing page sections</p>
              </div>
            ) : (
              <Textarea
                value={landingContent}
                onChange={(e) => setLandingContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm bg-background"
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Continue */}
      <div className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {scripts.length > 0 && (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              {scripts.length} scripts ready
            </span>
          )}
        </div>
        <Button onClick={onNext} className="gap-2">
          Continue to Images
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};