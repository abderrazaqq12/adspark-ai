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
  Webhook,
  AlertTriangle,
  Database,
  Bug
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAIAgent, getModelName } from '@/hooks/useAIAgent';
import { useBackendMode } from '@/hooks/useBackendMode';
import { BackendModeSelector } from '@/components/BackendModeSelector';
import { usePromptProfiles, PromptProfile } from '@/hooks/usePromptProfiles';
import { PromptSettingsModal } from '@/components/studio/PromptSettingsModal';
import { PromptIndicator } from '@/components/studio/PromptIndicator';

interface StudioLandingPageProps {
  onNext: () => void;
}

interface AudienceTargeting {
  targetMarket: string;
  language: string;
  audienceAge: string;
  audienceGender: string;
}

interface MarketingAnglesData {
  problemsSolved: string[];
  customerValue: string[];
  marketingAngles: string[];
}

interface ProductInfo {
  name: string;
  description: string;
  url: string;
  url2: string;
  mediaLinks?: string[];
}

// Default prompt template - used ONLY when creating initial prompt
// This is a FULL HTML LANDING PAGE COMPILER - outputs production-ready HTML
const DEFAULT_LANDING_PROMPT = `You are an AI Landing Page Compiler.
Your task is to BUILD a complete, production-ready landing page WEBSITE using structured data.

========================
INPUT DATA
========================
PRODUCT:
- Name: {{product_name}}
- Description: {{product_description}}
- Media: {{media_links}}

MARKETING INTELLIGENCE:
- Pain Points: {{pain_points}}
- Emotional Triggers: {{emotional_triggers}}
- Marketing Angles: {{marketing_angles}}
- Customer Value: {{customer_value}}

AUDIENCE:
- Language: {{language}}
- Market: {{market}}
- Age: {{audience_age}}
- Gender: {{audience_gender}}

========================
OUTPUT REQUIREMENTS
========================
Return ONLY valid HTML + embedded CSS.
NO explanations. NO markdown. NO comments outside code.

========================
MANDATORY RULES
========================
- Root element MUST include: dir="rtl" lang="ar"
- Language: Saudi Arabic dialect (100%)
- Mobile-first design (max-width: 480px optimized)
- Clean, modern, conversion-focused UI
- Rounded corners, soft shadows, generous spacing
- Use CSS variables for colors:
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --text-primary: #ffffff;
  --text-accent: #a855f7;
  --cta-bg: #22c55e;

========================
PAGE STRUCTURE (STRICT)
========================
1. HERO SECTION
   - Strong Arabic headline (benefit-driven from pain_points)
   - Subheadline (from customer_value)
   - <div class="image-placeholder">1080x1080</div>

2. PROBLEM SECTION
   - Derived ONLY from pain_points
   - 3-4 bullet points

3. SOLUTION / VALUE SECTION
   - Derived ONLY from customer_value
   - Position product as the answer

4. FEATURES & BENEFITS
   - From marketing_angles
   - EACH point followed by <div class="image-placeholder">1080x1080</div>

5. HOW TO USE
   - Step-by-step instructions (3-5 steps)

6. TECHNICAL DETAILS
   - Specs, origin, shelf life, quantity

7. SOCIAL PROOF
   - 10 customer reviews
   - ⭐⭐⭐⭐⭐ ratings
   - 100% Saudi Arabic dialect
   - NO quotation marks

8. FAQ
   - 5-7 questions & answers in Arabic

9. FINAL CTA
   - Strong closing statement
   - Order now CTA (COD friendly)
   - Phone/WhatsApp button

========================
DESIGN RULES
========================
- Centered content (max-width: 500px)
- Arabic font: font-family: 'Cairo', 'Tajawal', sans-serif
- Include Google Fonts link
- Generous padding (20px+ on mobile)
- Large touch targets (min-height: 50px for buttons)
- High contrast text

========================
IMAGE HANDLING
========================
Insert square div placeholders:
<div class="image-placeholder" style="width:100%;aspect-ratio:1;background:#2a2a2a;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#666;">1080×1080</div>

========================
OUTPUT FORMAT
========================
Return a SINGLE HTML document with:
- <style> embedded in <head>
- Ready to render inside iframe
- No external dependencies except Google Fonts
- Complete and valid HTML5

CRITICAL: Use pain_points, customer_value, and marketing_angles as SOURCE OF TRUTH.
Do NOT invent benefits not present in the provided data.`;

export const StudioLandingPage = ({ onNext }: StudioLandingPageProps) => {
  const { toast } = useToast();
  const { aiAgent } = useAIAgent();
  const { mode: backendMode, n8nEnabled: useN8nBackend, aiOperatorEnabled } = useBackendMode();
  const { getActivePrompt, getPromptForExecution, debugMode, setDebugMode } = usePromptProfiles();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'content' | 'code' | null>(null);
  const [viewMode, setViewMode] = useState<'content' | 'preview'>('content');
  const [productInfo, setProductInfo] = useState<ProductInfo>({ name: '', description: '', url: '', url2: '' });
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // Marketing Angles from previous step (REQUIRED)
  const [marketingAngles, setMarketingAngles] = useState<MarketingAnglesData | null>(null);
  const [hasMarketingAngles, setHasMarketingAngles] = useState(false);

  // N8n backend mode settings
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [audienceTargeting, setAudienceTargeting] = useState<AudienceTargeting>({
    targetMarket: 'gcc',
    language: 'ar-sa',
    audienceAge: '25-34',
    audienceGender: 'both',
  });

  // Prompt profile state
  const [landingPromptProfile, setLandingPromptProfile] = useState<PromptProfile | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [lastUsedPromptDebug, setLastUsedPromptDebug] = useState<{ id: string; hash: string; version: number } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences, use_n8n_backend, ai_operator_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        const prefs = settings.preferences as Record<string, any>;
        if (prefs) {
          // Load product info
          setProductInfo({
            name: prefs.studio_product_name || '',
            description: prefs.studio_description || '',
            url: prefs.studio_product_url || '',
            url2: prefs.studio_product_url_2 || '',
            mediaLinks: prefs.studio_media_links || []
          });

          // Load audience targeting
          setAudienceTargeting({
            targetMarket: prefs.studio_target_market || 'gcc',
            language: prefs.studio_language || 'ar-sa',
            audienceAge: prefs.studio_audience_age || '25-34',
            audienceGender: prefs.studio_audience_gender || 'both',
          });

          // CRITICAL: Load Marketing Angles from previous step
          const savedAngles = prefs.studio_marketing_angles;
          if (savedAngles && 
              (savedAngles.problemsSolved?.length > 0 || 
               savedAngles.customerValue?.length > 0 || 
               savedAngles.marketingAngles?.length > 0)) {
            setMarketingAngles(savedAngles);
            setHasMarketingAngles(true);
          } else {
            setHasMarketingAngles(false);
          }

          // Load saved landing content if exists
          if (prefs.studio_landing_content) {
            setGeneratedContent(prefs.studio_landing_content);
          }

          // Load webhook URL
          const stageWebhooks = prefs.stage_webhooks || {};
          const globalWebhookUrl = prefs.n8n_global_webhook_url || prefs.global_webhook_url || '';
          
          if (stageWebhooks.landing_page?.webhook_url) {
            setN8nWebhookUrl(stageWebhooks.landing_page.webhook_url);
          } else if (globalWebhookUrl) {
            setN8nWebhookUrl(globalWebhookUrl);
          }
        }
      }

      // Load prompt profile
      await loadPromptProfile();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadPromptProfile = async () => {
    const language = audienceTargeting.language.split('-')[0] || 'ar';
    const market = audienceTargeting.targetMarket || 'gcc';
    
    const profile = await getActivePrompt('landing_page', language, market);
    setLandingPromptProfile(profile);
  };

  // Save generated content to database
  const saveContent = async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPrefs = (existingSettings?.preferences as Record<string, unknown>) || {};
      
      await supabase
        .from('user_settings')
        .update({ 
          preferences: {
            ...currentPrefs,
            studio_landing_content: content
          } as any 
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

  // Build the landing page prompt with all aggregated data
  const buildAggregatedPrompt = (promptTemplate: string): string => {
    if (!marketingAngles) return promptTemplate;

    // Extract strongest elements from marketing angles
    const painPoints = marketingAngles.problemsSolved?.join('\n- ') || '';
    const emotionalTriggers = marketingAngles.marketingAngles?.slice(0, 3).join('\n- ') || '';
    const bestAngles = marketingAngles.marketingAngles?.join('\n- ') || '';
    const customerValue = marketingAngles.customerValue?.join('\n- ') || '';
    const mediaLinks = productInfo.mediaLinks?.join('\n') || 'No media provided';

    // Replace all variables
    return promptTemplate
      .replace(/\{\{product_name\}\}/g, productInfo.name)
      .replace(/\{\{product_description\}\}/g, productInfo.description)
      .replace(/\{\{media_links\}\}/g, mediaLinks)
      .replace(/\{\{pain_points\}\}/g, painPoints)
      .replace(/\{\{emotional_triggers\}\}/g, emotionalTriggers)
      .replace(/\{\{marketing_angles\}\}/g, bestAngles)
      .replace(/\{\{customer_value\}\}/g, customerValue)
      .replace(/\{\{language\}\}/g, audienceTargeting.language)
      .replace(/\{\{market\}\}/g, audienceTargeting.targetMarket)
      .replace(/\{\{audience_age\}\}/g, audienceTargeting.audienceAge)
      .replace(/\{\{audience_gender\}\}/g, audienceTargeting.audienceGender);
  };

  const generateLandingPage = async () => {
    // CRITICAL: Block generation if Marketing Angles are missing
    if (!hasMarketingAngles) {
      toast({
        title: "Marketing Angles Required",
        description: "Please generate Marketing Angles in the previous step first. Landing Page depends on that data.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationType('content');
    setLastUsedPromptDebug(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get language/market for prompt lookup
      const language = audienceTargeting.language.split('-')[0] || 'ar';
      const market = audienceTargeting.targetMarket || 'gcc';

      // CRITICAL: Get prompt from database - block if not configured
      const promptResult = await getPromptForExecution('landing_page', language, market);
      
      if (!promptResult) {
        toast({
          title: "Prompt Not Configured",
          description: "Please configure the Landing Page prompt in Prompt Settings before generating.",
          variant: "destructive",
        });
        setIsGenerating(false);
        setGenerationType(null);
        return;
      }

      const { prompt: activePrompt, debugInfo } = promptResult;
      setLastUsedPromptDebug(debugInfo);

      // Build the aggregated prompt with all data sources
      const finalPrompt = buildAggregatedPrompt(activePrompt.prompt_text);

      if (debugMode) {
        console.log('[LandingPage] Using prompt:', {
          id: debugInfo.id,
          hash: debugInfo.hash,
          version: debugInfo.version,
          marketingAnglesIncluded: !!marketingAngles,
          promptPreview: finalPrompt.substring(0, 200) + '...'
        });
      }

      // Priority 1: n8n Backend Mode
      if (useN8nBackend) {
        if (!n8nWebhookUrl) {
          throw new Error('n8n Backend Mode is enabled but no webhook URL is configured. Please configure it in Settings.');
        }
        
        const { data: proxyResponse, error: proxyError } = await supabase.functions.invoke('n8n-proxy', {
          body: {
            webhookUrl: n8nWebhookUrl,
            payload: {
              action: 'generate_landing_page',
              productName: productInfo.name,
              productDescription: productInfo.description,
              productUrl: productInfo.url,
              marketingAngles: marketingAngles,
              prompt: finalPrompt,
              promptDebug: debugInfo,
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

        if (proxyError) throw new Error(proxyError.message || 'Webhook proxy error');

        if (proxyResponse?.success) {
          const content = proxyResponse.data?.content || proxyResponse.data?.html || '';
          setGeneratedContent(content);
          saveContent(content);
          setViewMode('content');
          toast({
            title: "Landing Page Generated",
            description: "Content created successfully via n8n webhook",
          });
        } else {
          throw new Error(proxyResponse?.error || 'Webhook call failed');
        }
      }
      // Priority 2: AI Operator Agent Mode or Auto Mode
      else {
        const response = await supabase.functions.invoke('ai-assistant', {
          body: {
            message: finalPrompt,
            model: getModelName(aiAgent),
            audienceTargeting: {
              targetMarket: audienceTargeting.targetMarket,
              language: audienceTargeting.language,
              audienceAge: audienceTargeting.audienceAge,
              audienceGender: audienceTargeting.audienceGender,
            },
          }
        });

        if (response.error) throw new Error(response.error.message || 'Failed to generate landing page');

        let content = response.data?.response || response.data?.content || response.data?.text || '';
        
        // Extract HTML from markdown code blocks if present
        const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
        if (htmlMatch) {
          content = htmlMatch[1].trim();
        } else {
          const codeMatch = content.match(/```\s*([\s\S]*?)```/);
          if (codeMatch) {
            content = codeMatch[1].trim();
          }
        }
        
        setGeneratedContent(content);
        saveContent(content);
        
        // Auto-set code if it's valid HTML for preview
        if (content.includes('<!DOCTYPE') || content.includes('<html')) {
          setGeneratedCode(content);
          setViewMode('preview');
        } else {
          setViewMode('content');
        }

        toast({
          title: "Landing Page Generated",
          description: `HTML page created using Marketing Angles + Custom Prompt v${debugInfo.version}`,
        });
      }
    } catch (error: any) {
      console.error('Landing page generation error:', error);
      toast({
        title: "Generation Error",
        description: error.message || "Failed to generate landing page",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  const generateLandingCode = async () => {
    if (!generatedContent) {
      toast({
        title: "Content Required",
        description: "Please generate landing page content first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationType('code');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const codePrompt = `Convert this landing page content to a beautiful, responsive HTML page:

${generatedContent}

Requirements:
- Use Tailwind CSS (include CDN)
- RTL support for Arabic
- Mobile-first responsive design
- Modern, clean styling
- Include all sections from the content
- Return ONLY the HTML code, no explanations`;

      const response = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: codePrompt,
          model: getModelName(aiAgent),
        }
      });

      if (response.error) throw new Error(response.error.message || 'Failed to generate HTML code');

      let code = response.data?.response || response.data?.content || response.data?.code || '';
      
      // Extract HTML from markdown code blocks
      const htmlMatch = code.match(/```html\s*([\s\S]*?)```/);
      if (htmlMatch) {
        code = htmlMatch[1].trim();
      } else {
        const codeMatch = code.match(/```\s*([\s\S]*?)```/);
        if (codeMatch) {
          code = codeMatch[1].trim();
        }
      }
      
      setGeneratedCode(code);
      setViewMode('preview');

      toast({
        title: "HTML Code Generated",
        description: "Landing page HTML created successfully",
      });
    } catch (error: any) {
      console.error('Landing code generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate HTML code",
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
    toast({ title: "Copied", description: "Content copied to clipboard" });
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
          <h2 className="text-2xl font-bold text-foreground">AI Landing Page Compiler</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Generates production-ready HTML from Product + Marketing Angles + Custom Prompt
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BackendModeSelector compact />
          <Badge variant="outline" className="text-primary border-primary px-3 py-1">Step 4</Badge>
        </div>
      </div>

      {/* Data Source Status */}
      <Card className="p-4 bg-card/50 border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Data Sources</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDebugMode(!debugMode)}
            className="gap-1 text-xs"
          >
            <Bug className="w-3 h-3" />
            {debugMode ? 'Hide Debug' : 'Debug'}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Product Info Status */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            {productInfo.name ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-xs">
              Product: {productInfo.name || 'Not set'}
            </span>
          </div>

          {/* Marketing Angles Status */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            {hasMarketingAngles ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            )}
            <span className="text-xs">
              Marketing Angles: {hasMarketingAngles ? 'Ready' : 'Missing (Required)'}
            </span>
          </div>

          {/* Prompt Status */}
          <div className="flex items-center gap-2">
            <PromptIndicator
              prompt={landingPromptProfile}
              onClick={() => setShowPromptModal(true)}
              label="Landing Page Prompt"
            />
          </div>
        </div>

        {/* Debug Panel */}
        {debugMode && lastUsedPromptDebug && (
          <div className="mt-3 p-3 rounded-lg bg-slate-900/50 border border-border">
            <p className="text-xs font-mono text-muted-foreground">
              Prompt ID: {lastUsedPromptDebug.id}<br />
              Hash: {lastUsedPromptDebug.hash}<br />
              Version: {lastUsedPromptDebug.version}
            </p>
          </div>
        )}
      </Card>

      {/* Missing Marketing Angles Warning */}
      {!hasMarketingAngles && (
        <Card className="p-4 bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Marketing Angles Required</p>
              <p className="text-sm text-muted-foreground">
                This step requires Marketing Angles from the previous step. Please go back and generate Marketing Angles first.
              </p>
            </div>
          </div>
        </Card>
      )}

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
                <p className="font-semibold text-foreground">Intelligent Aggregator</p>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Connected</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Combines Product + Marketing Angles + Your Custom Prompt
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
              disabled={isGenerating || !hasMarketingAngles}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 px-5"
            >
              {isGenerating && generationType === 'content' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Compiling HTML...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate HTML Page
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
          
          {/* View Mode Toggle */}
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
              HTML Code
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
              <Label className="text-lg font-semibold text-foreground">HTML Landing Page</Label>
              {generatedContent && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateLandingPage}
                  disabled={isGenerating || !hasMarketingAngles}
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
                placeholder={hasMarketingAngles 
                  ? "Click 'Generate HTML Page' to compile landing page from Marketing Angles + Custom Prompt..."
                  : "Generate Marketing Angles in the previous step first..."}
                className="min-h-[400px] bg-slate-900/50 border-primary/30 text-sm font-mono resize-none focus:border-primary/50 focus:ring-primary/20"
                dir="rtl"
              />
              {!generatedContent && !isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-muted-foreground">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/30" />
                    <p className="text-sm">
                      {hasMarketingAngles 
                        ? "Click 'Generate HTML Page' to compile landing page"
                        : "Marketing Angles required from previous step"}
                    </p>
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

      {/* Prompt Settings Modal */}
      <PromptSettingsModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        type="landing_page"
        defaultTitle="Landing Page Prompt"
        defaultPrompt={DEFAULT_LANDING_PROMPT}
        language={audienceTargeting.language.split('-')[0] || 'ar'}
        market={audienceTargeting.targetMarket || 'gcc'}
        onSaved={() => loadPromptProfile()}
      />
    </div>
  );
};
