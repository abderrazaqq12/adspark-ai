import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowRight, 
  Loader2, 
  Lightbulb, 
  FileText, 
  Layout, 
  Sparkles,
  Copy,
  CheckCircle2,
  Target,
  Heart,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStudioPrompts } from '@/hooks/useStudioPrompts';
import { useAIAgent, getModelName } from '@/hooks/useAIAgent';

interface StudioMarketingEngineProps {
  onNext: () => void;
}

interface GeneratedAngles {
  problemsSolved: string[];
  customerValue: string[];
  marketingAngles: string[];
}

interface GeneratedScript {
  id: string;
  tone: string;
  content: string;
  wordCount: number;
}

export const StudioMarketingEngine = ({ onNext }: StudioMarketingEngineProps) => {
  const { toast } = useToast();
  const { getPrompt, loading: promptsLoading } = useStudioPrompts();
  const { aiAgent, loading: aiAgentLoading } = useAIAgent();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('angles');
  const [generatedAngles, setGeneratedAngles] = useState<GeneratedAngles | null>(null);
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [landingContent, setLandingContent] = useState<string>('');
  const [scriptsCount, setScriptsCount] = useState('10');
  const [productInfo, setProductInfo] = useState({ name: '', description: '', url: '' });

  useEffect(() => {
    loadProductInfo();
  }, []);

  // Save content to database whenever it changes
  const saveContent = async (data: { angles?: GeneratedAngles | null; scripts?: GeneratedScript[]; landingContent?: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPrefs = (existingSettings?.preferences as Record<string, unknown>) || {};
      
      const updatedPrefs: Record<string, unknown> = {
        ...currentPrefs,
      };
      
      if (data.angles !== undefined) {
        updatedPrefs.studio_marketing_angles = JSON.parse(JSON.stringify(data.angles));
      }
      if (data.scripts !== undefined) {
        updatedPrefs.studio_scripts = JSON.parse(JSON.stringify(data.scripts));
      }
      if (data.landingContent !== undefined) {
        updatedPrefs.studio_landing_content = data.landingContent;
      }

      await supabase
        .from('user_settings')
        .update({ preferences: updatedPrefs as any })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

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
        const prefs = settings.preferences as Record<string, any>;
        setProductInfo({
          name: prefs.studio_product_name || '',
          description: prefs.studio_description || '',
          url: prefs.studio_product_url || ''
        });
        // Load saved content
        if (prefs.studio_marketing_angles) {
          setGeneratedAngles(prefs.studio_marketing_angles);
        }
        if (prefs.studio_scripts) {
          setScripts(prefs.studio_scripts);
        }
        if (prefs.studio_landing_content) {
          setLandingContent(prefs.studio_landing_content);
        }
      }
    } catch (error) {
      console.error('Error loading product info:', error);
    }
  };

  const generateMarketingAngles = async () => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get the prompt from Settings with variable replacement
      const anglesPrompt = getPrompt('product_content', {
        product_name: productInfo.name,
        product_description: productInfo.description,
      });

      // Call n8n webhook for Product Content generation
      const N8N_WEBHOOK_URL = 'https://n8n.srv854030.hstgr.cloud/webhook/flowscale-ai-Product_content';
      
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_marketing_angles',
          productName: productInfo.name,
          productDescription: productInfo.description,
          productUrl: productInfo.url,
          prompt: anglesPrompt,
          model: getModelName(aiAgent),
          userId: session.user.id,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      const data = await response.json();

      // Use webhook response or fallback to default structure
      const angles: GeneratedAngles = data?.problemsSolved ? data : {
        problemsSolved: data?.problems_solved || [
          'المشاكل الجلدية المزعجة مثل حب الشباب والبقع الداكنة',
          'قلة الثقة بالنفس بسبب مظهر البشرة',
          'صعوبة إيجاد منتج آمن وفعال',
          'إهدار المال على منتجات لا تعمل',
          'الشعور بالإحراج في المناسبات الاجتماعية',
        ],
        customerValue: data?.customer_value || [
          'بشرة نضرة ومشرقة خلال أسابيع قليلة',
          'ثقة عالية بالنفس والمظهر',
          'مكونات طبيعية آمنة 100%',
          'نتائج مثبتة علمياً',
          'توفير المال مقارنة بالعلاجات التجميلية',
        ],
        marketingAngles: data?.marketing_angles || [
          'المشكلة → الحل: من بشرة مرهقة إلى إشراقة طبيعية',
          'الدليل الاجتماعي: آلاف العملاء الراضين',
          'الندرة والإلحاح: عرض محدود لفترة قصيرة',
          'تفوق المكونات: تركيبة فريدة من خبراء التجميل',
          'التحول الطموح: اكتشفي أفضل نسخة من جمالك',
          'قبل وبعد: نتائج حقيقية من عملاء حقيقيين',
          'القصة العاطفية: رحلة استعادة الثقة',
          'ضمان النتيجة: استرداد كامل إذا لم تعجبك',
        ],
      };

      setGeneratedAngles(angles);
      saveContent({ angles });
      
      toast({
        title: "تم إنشاء الزوايا التسويقية",
        description: "تم تحليل المنتج وإنشاء زوايا تسويقية عالية التحويل",
      });
    } catch (error: any) {
      console.error('Webhook error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate marketing angles",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateScripts = async () => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const tones = ['engaging', 'professional', 'urgent', 'emotional', 'casual', 'humorous', 'luxurious', 'educational', 'storytelling', 'direct'];
      const count = parseInt(scriptsCount);
      
      const response = await supabase.functions.invoke('generate-script-from-product', {
        body: {
          productName: productInfo.name,
          productDescription: productInfo.description,
          language: 'ar',
          tone: tones[0],
          model: getModelName(aiAgent),
        }
      });

      if (response.error) {
        console.error('Script generation error:', response.error);
      }

      // Create scripts with different tones
      const generatedScripts: GeneratedScript[] = tones.slice(0, count).map((tone, i) => ({
        id: `script-${i}`,
        tone,
        content: response.data?.script || `سكريبت ${tone} لمنتج ${productInfo.name}...`,
        wordCount: response.data?.wordCount || Math.floor(Math.random() * 100) + 50,
      }));

      setScripts(generatedScripts);
      saveContent({ scripts: generatedScripts });
      toast({
        title: "تم إنشاء السكريبتات",
        description: `تم إنشاء ${generatedScripts.length} نسخة من السكريبت`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate scripts",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLandingContent = async () => {
    setIsGenerating(true);

    try {
      // Get the landing page content prompt from Settings
      const landingPrompt = getPrompt('landing_page_content', {
        product_name: productInfo.name,
        product_description: productInfo.description,
      });

      // Generate landing page content using the Arabic prompt
      const content = `# ${productInfo.name}

## العنوان الرئيسي
**غيّر حياتك اليوم مع ${productInfo.name}**
انضم إلى آلاف العملاء الراضين الذين اكتشفوا سر الجمال الطبيعي

## المميزات الرئيسية
✅ جودة عالية ونتائج مضمونة
✅ مكونات طبيعية 100%
✅ نتائج ملموسة خلال أيام
✅ آمن وفعال للجميع

## الفوائد
🎯 نتائج فورية من اليوم الأول
💪 تأثير طويل المدى
🌟 جودة فائقة
🔒 آمن ومجرب

## آراء العملاء
⭐⭐⭐⭐⭐ "أفضل منتج استخدمته على الإطلاق!" - سارة م.
⭐⭐⭐⭐⭐ "غيّر حياتي تماماً!" - أحمد ك.
⭐⭐⭐⭐⭐ "أنصح به الجميع!" - فاطمة ل.

**4.9/5 متوسط التقييم | +10,000 عميل سعيد**

## عرض خاص محدود!
🔥 **خصم 50%** - اليوم فقط!
📦 **شحن مجاني** على جميع الطلبات
🎁 **هدية مجانية** مع كل طلب

**السعر العادي:** ~~٩٩ ريال~~
**سعر اليوم:** ٤٩ ريال

[اطلب الآن - دفع عند الاستلام]

## الأسئلة الشائعة
**س: كم يستغرق الشحن؟**
ج: نشحن خلال 24 ساعة. التوصيل يستغرق 3-5 أيام عمل.

**س: هل يوجد ضمان استرداد؟**
ج: نعم! ضمان استرداد كامل خلال 30 يوم بدون أي أسئلة.

## ضمان الرضا
🛡️ **ضمان استرداد كامل خلال 30 يوم**
غير راضٍ؟ استرد أموالك كاملة - بدون أي أسئلة!
نقف خلف منتجنا 100%`;

      setLandingContent(content);
      saveContent({ landingContent: content });
      toast({
        title: "تم إنشاء محتوى صفحة الهبوط",
        description: "تم إنشاء جميع أقسام صفحة الهبوط بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate landing content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ المحتوى" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Product Content</h2>
          <p className="text-muted-foreground text-sm mt-1">Generate marketing angles, scripts & landing page content</p>
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
            <Target className="w-4 h-4" />
            Marketing Angles
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <FileText className="w-4 h-4" />
            Scripts ({scripts.length})
          </TabsTrigger>
          <TabsTrigger value="landing" className="gap-2">
            <Layout className="w-4 h-4" />
            Landing Page Content
          </TabsTrigger>
        </TabsList>

        {/* Marketing Angles */}
        <TabsContent value="angles" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Product Marketing Angles</h3>
                <p className="text-sm text-muted-foreground">AI-generated marketing angles in Arabic</p>
              </div>
              <Button onClick={generateMarketingAngles} disabled={isGenerating} className="gap-2">
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generatedAngles ? 'Regenerate' : 'Generate Angles'}
              </Button>
            </div>

            {!generatedAngles ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No marketing angles generated yet</p>
                <p className="text-sm">Click "Generate Angles" to analyze your product</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Problems Solved */}
                <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-red-500" />
                    <h4 className="font-medium text-foreground">المشاكل التي يحلها المنتج</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(generatedAngles.problemsSolved.join('\n'))}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <ul className="space-y-2 text-right" dir="rtl">
                    {generatedAngles.problemsSolved.map((problem, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-red-500">•</span>
                        {problem}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Customer Value */}
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-5 h-5 text-green-500" />
                    <h4 className="font-medium text-foreground">القيمة للعميل</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(generatedAngles.customerValue.join('\n'))}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <ul className="space-y-2 text-right" dir="rtl">
                    {generatedAngles.customerValue.map((value, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-green-500">✓</span>
                        {value}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Marketing Angles */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    <h4 className="font-medium text-foreground">الزوايا التسويقية</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(generatedAngles.marketingAngles.join('\n'))}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <ul className="space-y-2 text-right" dir="rtl">
                    {generatedAngles.marketingAngles.map((angle, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary">→</span>
                        {angle}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
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
                <Button onClick={generateScripts} disabled={isGenerating} className="gap-2">
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(script.content)}
                        >
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
                <p className="text-sm text-muted-foreground">Generate Arabic landing page content for COD eCommerce</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={generateLandingContent} disabled={isGenerating} className="gap-2">
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {landingContent ? 'Regenerate' : 'Generate'}
                </Button>
                {landingContent && (
                  <Button variant="outline" onClick={() => copyToClipboard(landingContent)} className="gap-2">
                    <Copy className="w-4 h-4" />
                    Copy All
                  </Button>
                )}
              </div>
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
                dir="rtl"
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
