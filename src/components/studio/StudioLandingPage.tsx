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
  RefreshCw,
  CheckCircle2,
  Webhook
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStudioPrompts } from '@/hooks/useStudioPrompts';
import { useAIAgent, getModelName } from '@/hooks/useAIAgent';
import { useBackendMode } from '@/hooks/useBackendMode';
import { BackendModeSelector } from '@/components/BackendModeSelector';

interface StudioLandingPageProps {
  onNext: () => void;
}

interface AudienceTargeting {
  targetMarket: string;
  language: string;
  audienceAge: string;
  audienceGender: string;
}

export const StudioLandingPage = ({ onNext }: StudioLandingPageProps) => {
  const { toast } = useToast();
  const { getPrompt, loading: promptsLoading } = useStudioPrompts();
  const { aiAgent, loading: aiAgentLoading } = useAIAgent();
  const { mode: backendMode, n8nEnabled: useN8nBackend, aiOperatorEnabled, getActiveBackend } = useBackendMode();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'content' | 'code' | null>(null);
  const [viewMode, setViewMode] = useState<'content' | 'preview'>('content');
  const [productInfo, setProductInfo] = useState({ name: '', description: '', url: '', url2: '' });
  const [marketingContent, setMarketingContent] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // N8n backend mode settings
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [audienceTargeting, setAudienceTargeting] = useState<AudienceTargeting>({
    targetMarket: 'gcc',
    language: 'ar-sa',
    audienceAge: '25-34',
    audienceGender: 'both',
  });

  useEffect(() => {
    loadProductInfo();
  }, []);

  const loadProductInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences, use_n8n_backend, ai_operator_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        // Backend mode is now managed by useBackendMode hook

        const prefs = settings.preferences as Record<string, any>;
        if (prefs) {
          setProductInfo({
            name: prefs.studio_product_name || '',
            description: prefs.studio_description || '',
            url: prefs.studio_product_url || '',
            url2: prefs.studio_product_url_2 || ''
          });
          setMarketingContent(prefs.studio_marketing_content || '');
          // Load audience targeting
          setAudienceTargeting({
            targetMarket: prefs.studio_target_market || 'gcc',
            language: prefs.studio_language || 'ar-sa',
            audienceAge: prefs.studio_audience_age || '25-34',
            audienceGender: prefs.studio_audience_gender || 'both',
          });
          // Load webhook URL - prefer per-stage, fallback to global
          const stageWebhooks = prefs.stage_webhooks || {};
          const globalWebhookUrl = prefs.n8n_global_webhook_url || prefs.global_webhook_url || '';
          
          if (stageWebhooks.landing_page?.webhook_url) {
            setN8nWebhookUrl(stageWebhooks.landing_page.webhook_url);
          } else if (globalWebhookUrl) {
            // Fallback to global webhook if per-stage is not configured
            setN8nWebhookUrl(globalWebhookUrl);
            console.log('Using global webhook URL as fallback for landing page:', globalWebhookUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error loading product info:', error);
    }
  };

  const generateLandingPage = async () => {
    // Backend mode is now managed by useBackendMode hook - 'auto' mode uses Lovable AI
    setIsGenerating(true);
    setGenerationType('content');

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

      // Priority 1: n8n Backend Mode
      if (useN8nBackend) {
        if (!n8nWebhookUrl) {
          throw new Error('n8n Backend Mode is enabled but no webhook URL is configured for Landing Page stage. Please configure it in Settings.');
        }
        
        console.log('Calling Landing Page webhook via proxy (n8n mode):', n8nWebhookUrl);
        
        // Use edge function proxy to avoid CORS issues
        const { data: proxyResponse, error: proxyError } = await supabase.functions.invoke('n8n-proxy', {
          body: {
            webhookUrl: n8nWebhookUrl,
            payload: {
              action: 'generate_landing_page',
              productName: productInfo.name,
              productDescription: productInfo.description,
              productUrl: productInfo.url,
              prompt: landingPrompt,
              model: getModelName(aiAgent),
              audienceTargeting: {
                targetMarket: audienceTargeting.targetMarket,
                language: audienceTargeting.language,
                audienceAge: audienceTargeting.audienceAge,
                audienceGender: audienceTargeting.audienceGender,
              },
            }
          }
        });

        if (proxyError) {
          throw new Error(proxyError.message || 'Webhook proxy error');
        }

        if (proxyResponse?.success) {
          const data = proxyResponse.data;
          const content = data?.content || data?.html || '';
          setGeneratedContent(content);
          setViewMode('content');
          toast({
            title: "تم إنشاء صفحة الهبوط",
            description: "تم إنشاء محتوى صفحة الهبوط بنجاح (via n8n)",
          });
        } else {
          throw new Error(proxyResponse?.error || 'Webhook call failed');
        }
      }
      // Priority 2: AI Operator Agent Mode
      else if (aiOperatorEnabled) {
        console.log('Calling Landing Page Generation (AI Operator mode)');
        
        const response = await supabase.functions.invoke('ai-assistant', {
          body: {
            message: landingPrompt || `Generate landing page content for ${productInfo.name}: ${productInfo.description}`,
            model: getModelName(aiAgent),
            audienceTargeting: {
              targetMarket: audienceTargeting.targetMarket,
              language: audienceTargeting.language,
              audienceAge: audienceTargeting.audienceAge,
              audienceGender: audienceTargeting.audienceGender,
            },
          }
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to generate landing page');
        }

        const content = response.data?.response || response.data?.content || response.data?.text || '';
        setGeneratedContent(content);
        setViewMode('content');

        toast({
          title: "تم إنشاء صفحة الهبوط",
          description: "تم إنشاء محتوى صفحة الهبوط بنجاح (via AI Operator)",
        });
      }
    } catch (error: any) {
      console.error('Landing page generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate landing page",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  const generateLandingCode = async () => {
    setIsGenerating(true);
    setGenerationType('code');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get the landing page builder code prompt
      const builderPrompt = getPrompt('landing_page_builder', {
        product_name: productInfo.name,
        product_description: productInfo.description,
        landing_content: generatedContent || marketingContent,
      });

      // Use the AI assistant edge function for HTML code generation
      const response = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: builderPrompt,
          model: getModelName(aiAgent),
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate landing page code');
      }

      let code = response.data?.response || response.data?.content || response.data?.code || '';
      
      // Extract HTML code if wrapped in markdown code blocks
      const htmlMatch = code.match(/```html\s*([\s\S]*?)```/);
      if (htmlMatch) {
        code = htmlMatch[1].trim();
      } else {
        // Try generic code block
        const codeMatch = code.match(/```\s*([\s\S]*?)```/);
        if (codeMatch) {
          code = codeMatch[1].trim();
        }
      }
      
      setGeneratedCode(code);
      setViewMode('preview');

      toast({
        title: "تم إنشاء الكود",
        description: "تم إنشاء كود صفحة الهبوط بنجاح",
      });
    } catch (error: any) {
      console.error('Landing code generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate landing page code",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  const copyContent = () => {
    const content = viewMode === 'content' ? generatedContent : generatedCode;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Landing Page Builder</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Generate Arabic landing page content using Google AI Studio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BackendModeSelector compact />
          <Badge variant="outline" className="text-primary border-primary px-3 py-1">Step 4</Badge>
        </div>
      </div>

      {/* Webhook indicator */}
      {useN8nBackend && n8nWebhookUrl && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <Webhook className="w-3 h-3 text-green-500" />
          <span>Webhook enabled: {n8nWebhookUrl.substring(0, 50)}...</span>
        </div>
      )}

      {/* Google AI Studio Integration Card */}
      <Card className="p-5 bg-slate-900/50 border-primary/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">Google AI Studio Integration</p>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Connected</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Uses your prompts from Settings → Prompts to generate content
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openGoogleAIStudio} 
            className="gap-2 border-primary/50 hover:bg-primary/10 hover:border-primary"
          >
            <ExternalLink className="w-4 h-4" />
            Open AI Studio
          </Button>
        </div>
      </Card>

      {/* Control Panel */}
      <Card className="p-4 bg-card/50 border-border backdrop-blur-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={generateLandingPage} 
              disabled={isGenerating || promptsLoading}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 px-5"
            >
              {isGenerating && generationType === 'content' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Content
                </>
              )}
            </Button>
            
            {generatedContent && (
              <Button 
                onClick={generateLandingCode} 
                disabled={isGenerating}
                variant="secondary"
                className="gap-2"
              >
                {isGenerating && generationType === 'code' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileCode className="w-4 h-4" />
                    Generate HTML Code
                  </>
                )}
              </Button>
            )}

            {hasContent && (
              <Button variant="outline" onClick={copyContent} size="icon" className="h-9 w-9">
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* View Mode Toggle - Segmented Control */}
          <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-border">
            <button 
              onClick={() => setViewMode('content')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'content' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="w-4 h-4" />
              Content
            </button>
            <button 
              onClick={() => generatedCode && setViewMode('preview')}
              disabled={!generatedCode}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'preview' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>
        </div>
      </Card>

      {/* Content/Preview Area */}
      <Card className="bg-card/30 border-primary/20 overflow-hidden">
        {viewMode === 'content' ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold text-foreground">Landing Page Content</Label>
              {generatedContent && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateLandingPage}
                  disabled={isGenerating}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating && generationType === 'content' ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              )}
            </div>
            <div className="relative">
              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                placeholder="Click 'Generate Content' to create Arabic landing page content using your prompts from Settings..."
                className="min-h-[400px] bg-slate-900/50 border-primary/30 text-sm font-mono resize-none focus:border-primary/50 focus:ring-primary/20"
                dir="rtl"
              />
              {!generatedContent && !isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-muted-foreground">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/30" />
                    <p className="text-sm">Click 'Generate Content' to create Arabic landing page</p>
                    <p className="text-xs mt-1">...content using your prompts from Settings</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="flex items-center justify-between p-4 border-b border-border bg-slate-900/30">
              <Label className="text-lg font-semibold text-foreground">HTML Preview</Label>
              {generatedCode && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateLandingCode}
                  disabled={isGenerating}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating && generationType === 'code' ? 'animate-spin' : ''}`} />
                  Regenerate Code
                </Button>
              )}
            </div>
            {generatedCode ? (
              <div className="bg-white">
                <iframe
                  srcDoc={generatedCode}
                  className="w-full min-h-[500px]"
                  title="Landing Page Preview"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground p-6">
                <Eye className="w-10 h-10 mb-3 text-primary/30" />
                <p className="text-sm text-center">Generate content first, then click "Generate HTML Code" to see preview</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={onNext} className="gap-2 px-6">
          Continue to Voiceover
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
