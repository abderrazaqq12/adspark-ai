import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowRight, 
  Loader2, 
  Sparkles,
  Copy,
  Eye,
  Code,
  ExternalLink,
  FileCode,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStudioPrompts } from '@/hooks/useStudioPrompts';
import { useAIAgent, getModelName } from '@/hooks/useAIAgent';

interface StudioLandingPageProps {
  onNext: () => void;
}

export const StudioLandingPage = ({ onNext }: StudioLandingPageProps) => {
  const { toast } = useToast();
  const { getPrompt, loading: promptsLoading } = useStudioPrompts();
  const { aiAgent, loading: aiAgentLoading } = useAIAgent();
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [productInfo, setProductInfo] = useState({ name: '', description: '', url: '', url2: '' });
  const [marketingContent, setMarketingContent] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

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
        // Load marketing content from previous step
        setMarketingContent(prefs.studio_marketing_content || '');
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

      // Get the landing page prompt from settings
      const landingPrompt = getPrompt('landing_page_content', {
        product_name: productInfo.name,
        product_description: productInfo.description,
        product_url: productInfo.url,
        product_url_2: productInfo.url2,
        marketing_content: marketingContent
      });

      // Call AI to generate landing page content with selected model
      const response = await supabase.functions.invoke('ai-content-factory', {
        body: {
          prompt: landingPrompt,
          type: 'landing_page',
          productName: productInfo.name,
          productDescription: productInfo.description,
          marketingContent: marketingContent,
          model: getModelName(aiAgent),
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate landing page');
      }

      const content = response.data?.content || response.data?.text || '';
      setGeneratedContent(content);

      toast({
        title: "تم إنشاء صفحة الهبوط",
        description: "تم إنشاء محتوى صفحة الهبوط بنجاح",
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

  const generateLandingCode = async () => {
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get the landing page builder code prompt
      const builderPrompt = getPrompt('landing_page_builder', {
        product_name: productInfo.name,
        product_description: productInfo.description,
        landing_content: generatedContent || marketingContent,
      });

      // Call AI to generate landing page HTML code with selected model
      const response = await supabase.functions.invoke('ai-content-factory', {
        body: {
          prompt: builderPrompt,
          type: 'landing_page_code',
          productName: productInfo.name,
          content: generatedContent,
          model: getModelName(aiAgent),
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate landing page code');
      }

      const code = response.data?.content || response.data?.code || '';
      setGeneratedCode(code);
      setViewMode('preview');

      toast({
        title: "تم إنشاء الكود",
        description: "تم إنشاء كود صفحة الهبوط بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate landing page code",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyContent = () => {
    const content = viewMode === 'edit' ? generatedContent : generatedCode;
    navigator.clipboard.writeText(content);
    toast({
      title: "تم النسخ",
      description: "تم نسخ المحتوى بنجاح",
    });
  };

  const openGoogleAIStudio = () => {
    window.open('https://aistudio.google.com/app/prompts/new_chat', '_blank');
  };

  const hasContent = generatedContent.length > 0 || generatedCode.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Landing Page Builder</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Generate Arabic landing page content using Google AI Studio
          </p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Step 4</Badge>
      </div>

      {/* Google AI Studio Link */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Google AI Studio Integration</p>
              <p className="text-xs text-muted-foreground">
                Uses your prompts from Settings → Prompts to generate content
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openGoogleAIStudio} className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Open AI Studio
          </Button>
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={generateLandingPage} 
              disabled={isGenerating || promptsLoading} 
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate Content
            </Button>
            
            {generatedContent && (
              <Button 
                onClick={generateLandingCode} 
                disabled={isGenerating} 
                variant="secondary"
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCode className="w-4 h-4" />
                )}
                Generate HTML Code
              </Button>
            )}

            {hasContent && (
              <Button variant="outline" onClick={copyContent} className="gap-2">
                <Copy className="w-4 h-4" />
                Copy
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
              Content
            </Button>
            <Button 
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('preview')}
              className="gap-2"
              disabled={!generatedCode}
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </div>
        </div>
      </Card>

      {/* Content Editor / Preview */}
      <Card className="p-6 bg-card border-border min-h-[400px]">
        {viewMode === 'edit' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium">Landing Page Content</Label>
              {generatedContent && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateLandingPage}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </Button>
              )}
            </div>
            <Textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              placeholder="Click 'Generate Content' to create Arabic landing page content using your prompts from Settings..."
              className="min-h-[350px] bg-background text-sm font-mono"
              dir="rtl"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium">HTML Code Preview</Label>
              {generatedCode && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateLandingCode}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Code
                </Button>
              )}
            </div>
            {generatedCode ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={generatedCode}
                  className="w-full min-h-[400px] bg-white"
                  title="Landing Page Preview"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[350px] text-muted-foreground">
                Generate content first, then click "Generate HTML Code" to see preview
              </div>
            )}
          </div>
        )}
      </Card>

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
