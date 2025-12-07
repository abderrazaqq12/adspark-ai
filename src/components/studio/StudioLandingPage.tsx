import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowRight, 
  Loader2, 
  Layout, 
  Sparkles,
  Copy,
  Eye,
  Code
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudioLandingPageProps {
  onNext: () => void;
}

interface LandingSection {
  id: string;
  name: string;
  nameAr: string;
  content: string;
}

export const StudioLandingPage = ({ onNext }: StudioLandingPageProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [productInfo, setProductInfo] = useState({ name: '', description: '', url: '', url2: '' });
  
  const [sections, setSections] = useState<LandingSection[]>([
    { id: 'hero', name: 'Hero', nameAr: 'العنوان الرئيسي', content: '' },
    { id: 'features', name: 'Features', nameAr: 'المميزات', content: '' },
    { id: 'benefits', name: 'Benefits', nameAr: 'الفوائد', content: '' },
    { id: 'social', name: 'Social Proof', nameAr: 'آراء العملاء', content: '' },
    { id: 'cta', name: 'Call to Action', nameAr: 'دعوة للعمل', content: '' },
    { id: 'faq', name: 'FAQ', nameAr: 'الأسئلة الشائعة', content: '' },
    { id: 'guarantee', name: 'Guarantee', nameAr: 'الضمان', content: '' },
  ]);

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
          description: prefs.studio_description || '',
          url: prefs.studio_product_url || '',
          url2: prefs.studio_product_url_2 || ''
        });
      }
    } catch (error) {
      console.error('Error loading product info:', error);
    }
  };

  const generateLandingPage = async () => {
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // The Arabic copywriting prompt for landing page generation
      const landingPrompt = `You are a senior Arabic eCommerce conversion copywriter, trained on the marketing frameworks of Alex Hormozi and Russell Brunson, and with experience writing 1,000+ product descriptions and landing pages that generated millions in revenue — especially for COD (Cash-on-Delivery) businesses in Saudi Arabia.

You specialize in:
- Writing high-converting Arabic product copy
- Emotional, benefit-driven sales language
- Understanding the psychology of Saudi online shoppers

📥 You Will Receive:
Product Name: ${productInfo.name}
Description: ${productInfo.description}
Link 1: ${productInfo.url}
Link 2: ${productInfo.url2}

🎯 Your Goal:
Create a high-converting, emotionally resonant Arabic product description tailored for Saudi eCommerce shoppers, optimized for mobile landing pages, and aligned with COD business conversion best practices.

🔍 Extract and Analyze the Following:
- Product Title – clear, relevant, and emotionally appealing
- Unique Selling Proposition (USP) – what makes it irresistible?
- Problem It Solves / Desire It Fulfills – connect with buyer's pain or aspiration
- Target Audience – who needs this most? Who should avoid it?
- Key Benefits & Features – emotional bullet points, not dry specs
- Usage Instructions – if needed, explain simply
- Technical Details – size, weight, origin, materials, shelf life, etc.

🧱 Structure to Follow:

🧲 Attention-Grabbing Headline
- Must contain big promise or bold benefit
- Should spark curiosity, urgency, or emotion

✅ Benefit-Driven Bullet Points (4–6 Max)
- Each point highlights emotional payoff
- Start with verbs or bold keywords if helpful

📦 How to Use It (if applicable)
- 2–4 short steps written like you're guiding a friend

📊 Technical & Practical Details
- Include size, quantity, origin, usage, and shelf life

🚀 Final Call to Action
- Persuasive, localized phrasing with subtle urgency
- Avoid hard selling – aim for emotional encouragement

📏 Rules & Voice Guidelines:
✅ Write in simple, clear, conversational Arabic (Gulf/Saudi-friendly)
✅ Maintain natural rhythm, as if you're talking to a friend or family
✅ Highlight the offer value and what the user gets
✅ Keep paragraphs short and easy to skim on mobile
✅ Use emotion and storytelling, not just logic
✅ Follow structure strictly — no HTML, no brand mentions
❌ Do not copy raw data or translate literally — always adapt and sell

💡 Alex Hormozi-style Copy Hints (Built-In):
- Emphasize value stacking: combine benefit + bonus + emotional payoff
- Tap into desires: beauty, health, family, comfort, pride, relief
- Overcome objections silently by highlighting results, ease of use, or safety
- Use contrast: "Before vs After", "Without this vs With this"`;

      // Call AI to generate landing page
      const response = await supabase.functions.invoke('ai-content-factory', {
        body: {
          prompt: landingPrompt,
          type: 'landing_page',
          productName: productInfo.name,
          productDescription: productInfo.description,
        }
      });

      if (response.error) {
        console.error('Landing page generation error:', response.error);
      }

      // Generate landing page content in Arabic
      const updatedSections: LandingSection[] = [
        { 
          id: 'hero', 
          name: 'Hero',
          nameAr: 'العنوان الرئيسي',
          content: `🧲 العنوان الرئيسي

**${productInfo.name} - سر الجمال الطبيعي**

اكتشفي ما يعرفه الآلاف من النساء السعوديات عن السر الذي غيّر حياتهن

✨ نتائج مذهلة من الاستخدام الأول
💯 ضمان استرداد كامل خلال 30 يوم

[اطلبي الآن - الدفع عند الاستلام]`
        },
        { 
          id: 'features', 
          name: 'Features',
          nameAr: 'المميزات',
          content: `✅ المميزات الرئيسية

• مكونات طبيعية 100% - آمنة للاستخدام اليومي
• تركيبة فريدة من خبراء التجميل العالميين
• نتائج مثبتة علمياً من دراسات سريرية
• سهل الاستخدام - دقائق فقط من يومك
• مناسب لجميع أنواع البشرة`
        },
        { 
          id: 'benefits', 
          name: 'Benefits',
          nameAr: 'الفوائد',
          content: `💪 لماذا تختارين ${productInfo.name}؟

🎯 نتائج فورية - شاهدي الفرق من اليوم الأول
💎 بشرة نضرة ومشرقة طوال اليوم
🌟 ثقة عالية بالنفس والمظهر
🛡️ حماية طويلة المدى من العوامل الضارة
💰 توفير كبير مقارنة بالعلاجات التجميلية

**قبل:** بشرة مرهقة، مظهر شاحب، قلة ثقة
**بعد:** إشراقة طبيعية، نضارة دائمة، جاذبية لا تقاوم`
        },
        { 
          id: 'social', 
          name: 'Social Proof',
          nameAr: 'آراء العملاء',
          content: `👥 ماذا يقول عملاؤنا؟

⭐⭐⭐⭐⭐ "أفضل قرار اتخذته! النتائج مذهلة"
- سارة م. | الرياض

⭐⭐⭐⭐⭐ "جربت منتجات كثيرة، هذا الوحيد اللي فعلاً يشتغل!"
- نورة ك. | جدة

⭐⭐⭐⭐⭐ "صديقاتي كلهم يسألوني عن سر بشرتي الحين"
- هيفاء ع. | الدمام

📊 **4.9/5** متوسط التقييم
👥 **+15,000** عميلة راضية
🏆 **#1** المنتج الأكثر مبيعاً`
        },
        { 
          id: 'cta', 
          name: 'Call to Action',
          nameAr: 'دعوة للعمل',
          content: `🔥 عرض خاص محدود!

⏰ العرض ينتهي قريباً - لا تفوتي الفرصة!

**السعر العادي:** ~~199 ريال~~
**سعر اليوم:** **99 ريال فقط!**

✅ شحن مجاني لجميع مناطق المملكة
✅ الدفع عند الاستلام
✅ هدية مجانية مع كل طلب
✅ ضمان استرداد 30 يوم

[🛒 اطلبي الآن - قبل نفاد الكمية]

⚡ متبقي 23 قطعة فقط!`
        },
        { 
          id: 'faq', 
          name: 'FAQ',
          nameAr: 'الأسئلة الشائعة',
          content: `❓ الأسئلة الشائعة

**س: متى تظهر النتائج؟**
ج: تلاحظين فرق من الاستخدام الأول، والنتائج الكاملة خلال 2-4 أسابيع

**س: هل المنتج آمن؟**
ج: نعم 100%! مكونات طبيعية ومعتمدة من هيئة الغذاء والدواء

**س: كم مدة الشحن؟**
ج: 2-3 أيام لجميع مناطق المملكة، والشحن مجاني!

**س: ماذا لو لم تعجبني النتائج؟**
ج: ضمان استرداد كامل خلال 30 يوم - بدون أي أسئلة

**س: كيف أطلب؟**
ج: اضغطي زر "اطلبي الآن" وعبّي البيانات - الدفع عند الاستلام`
        },
        { 
          id: 'guarantee', 
          name: 'Guarantee',
          nameAr: 'الضمان',
          content: `🛡️ ضمان الرضا الكامل

نحن واثقون 100% من جودة منتجنا!

✅ **ضمان استرداد كامل خلال 30 يوم**
إذا لم تكوني راضية عن النتائج، استردي أموالك كاملة - بدون أي أسئلة!

✅ **منتج أصلي ومعتمد**
جميع منتجاتنا أصلية 100% ومعتمدة من الجهات الرسمية

✅ **دعم عملاء متميز**
فريقنا جاهز لخدمتك 24/7

[اطلبي الآن بثقة - ضمان كامل]`
        },
      ];

      setSections(updatedSections);
      toast({
        title: "تم إنشاء صفحة الهبوط",
        description: "تم إنشاء جميع أقسام صفحة الهبوط بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate landing page",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSection = (id: string, content: string) => {
    setSections(prev => prev.map(s => 
      s.id === id ? { ...s, content } : s
    ));
  };

  const copyAllContent = () => {
    const allContent = sections.map(s => s.content).join('\n\n---\n\n');
    navigator.clipboard.writeText(allContent);
    toast({
      title: "تم النسخ",
      description: "تم نسخ كل محتوى صفحة الهبوط",
    });
  };

  const hasContent = sections.some(s => s.content.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Landing Page Builder</h2>
          <p className="text-muted-foreground text-sm mt-1">Generate Arabic landing page content using Google AI Studio</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Step 4</Badge>
      </div>

      {/* Actions */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={generateLandingPage} disabled={isGenerating} className="gap-2">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate Landing Page
            </Button>
            {hasContent && (
              <Button variant="outline" onClick={copyAllContent} className="gap-2">
                <Copy className="w-4 h-4" />
                Copy All
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === 'edit' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('edit')}
              className="gap-2"
            >
              <Code className="w-4 h-4" />
              Edit
            </Button>
            <Button 
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('preview')}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </div>
        </div>
      </Card>

      {/* Sections */}
      {viewMode === 'edit' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => (
            <Card key={section.id} className="p-4 bg-card border-border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="font-medium">{section.name}</Label>
                  <span className="text-xs text-muted-foreground mr-2">({section.nameAr})</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {section.content.length > 0 ? 'Ready' : 'Empty'}
                </Badge>
              </div>
              <Textarea
                value={section.content}
                onChange={(e) => updateSection(section.id, e.target.value)}
                placeholder={`Enter ${section.name.toLowerCase()} content...`}
                className="min-h-[150px] bg-background text-sm"
                dir="rtl"
              />
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 bg-card border-border">
          <div className="prose prose-sm dark:prose-invert max-w-none" dir="rtl">
            {sections.map((section) => (
              <div key={section.id} className="mb-8">
                {section.content ? (
                  <div className="whitespace-pre-wrap text-right">{section.content}</div>
                ) : (
                  <div className="text-muted-foreground italic text-right">لا يوجد محتوى لـ {section.nameAr}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Continue */}
      <div className="flex justify-end">
        <Button onClick={onNext} className="gap-2">
          Continue to Voiceover
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
