import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowRight, 
  Loader2, 
  Layout, 
  Sparkles,
  Copy,
  ExternalLink,
  Eye,
  Code,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudioLandingPageProps {
  onNext: () => void;
}

interface LandingSection {
  id: string;
  name: string;
  content: string;
}

export const StudioLandingPage = ({ onNext }: StudioLandingPageProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [productInfo, setProductInfo] = useState({ name: '', description: '' });
  
  const [sections, setSections] = useState<LandingSection[]>([
    { id: 'hero', name: 'Hero', content: '' },
    { id: 'features', name: 'Features', content: '' },
    { id: 'benefits', name: 'Benefits', content: '' },
    { id: 'social', name: 'Social Proof', content: '' },
    { id: 'cta', name: 'Call to Action', content: '' },
    { id: 'faq', name: 'FAQ', content: '' },
    { id: 'guarantee', name: 'Guarantee', content: '' },
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
          description: prefs.studio_description || ''
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

      // Generate landing page content
      const updatedSections = [
        { 
          id: 'hero', 
          name: 'Hero', 
          content: `**Headline:** Transform Your Life with ${productInfo.name}

**Subheadline:** Join thousands of satisfied customers who discovered the ultimate solution to [problem].

**CTA Button:** Get Started Now - 50% OFF` 
        },
        { 
          id: 'features', 
          name: 'Features', 
          content: `## Key Features

✅ **Feature 1:** Premium quality materials for lasting durability
✅ **Feature 2:** Easy to use design for maximum convenience  
✅ **Feature 3:** Scientifically proven results in just 7 days
✅ **Feature 4:** 100% natural and safe ingredients` 
        },
        { 
          id: 'benefits', 
          name: 'Benefits', 
          content: `## Why Choose ${productInfo.name}?

🎯 **Instant Results:** See visible changes from day one
💪 **Long-lasting:** Effects that stay with you
🌟 **Premium Quality:** Made with the finest materials
🔒 **Safe & Secure:** Tested and approved` 
        },
        { 
          id: 'social', 
          name: 'Social Proof', 
          content: `## What Our Customers Say

⭐⭐⭐⭐⭐ "Best purchase I've ever made!" - Sarah M.
⭐⭐⭐⭐⭐ "Changed my life completely!" - Ahmed K.
⭐⭐⭐⭐⭐ "Highly recommend to everyone!" - Maria L.

**4.9/5 Average Rating | 10,000+ Happy Customers**` 
        },
        { 
          id: 'cta', 
          name: 'Call to Action', 
          content: `## Limited Time Offer!

🔥 **50% OFF** - Today Only!
📦 **FREE Shipping** on all orders
🎁 **Bonus Gift** with every purchase

**Regular Price:** ~~$99.99~~
**Today's Price:** $49.99

[ORDER NOW - SECURE CHECKOUT]` 
        },
        { 
          id: 'faq', 
          name: 'FAQ', 
          content: `## Frequently Asked Questions

**Q: How long does shipping take?**
A: We ship within 24 hours. Delivery takes 3-5 business days.

**Q: Is there a money-back guarantee?**
A: Yes! 30-day no-questions-asked refund policy.

**Q: How do I use the product?**
A: Simply follow the included instructions for best results.` 
        },
        { 
          id: 'guarantee', 
          name: 'Guarantee', 
          content: `## 100% Satisfaction Guaranteed

🛡️ **30-Day Money-Back Guarantee**

Not satisfied? Get a full refund - no questions asked!
We stand behind our product 100%.` 
        },
      ];

      setSections(updatedSections);
      toast({
        title: "Landing Page Generated",
        description: "All sections have been created successfully",
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
      title: "Copied",
      description: "All landing page content copied to clipboard",
    });
  };

  const hasContent = sections.some(s => s.content.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Landing Page Builder</h2>
          <p className="text-muted-foreground text-sm mt-1">Generate and customize your landing page content</p>
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
              Generate All Sections
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
                <Label className="font-medium">{section.name}</Label>
                <Badge variant="secondary" className="text-xs">
                  {section.content.length > 0 ? 'Ready' : 'Empty'}
                </Badge>
              </div>
              <Textarea
                value={section.content}
                onChange={(e) => updateSection(section.id, e.target.value)}
                placeholder={`Enter ${section.name.toLowerCase()} content...`}
                className="min-h-[150px] bg-background text-sm"
              />
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 bg-card border-border">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {sections.map((section) => (
              <div key={section.id} className="mb-8">
                {section.content ? (
                  <div className="whitespace-pre-wrap">{section.content}</div>
                ) : (
                  <div className="text-muted-foreground italic">No content for {section.name}</div>
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