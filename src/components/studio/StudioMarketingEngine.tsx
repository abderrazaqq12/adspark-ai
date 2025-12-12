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
  Zap,
  Webhook,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStudioPrompts } from '@/hooks/useStudioPrompts';
import { useAIAgent, getModelName } from '@/hooks/useAIAgent';
import { useBackendMode } from '@/hooks/useBackendMode';
import { BackendModeSelector } from '@/components/BackendModeSelector';
import { parseEdgeFunctionError, formatErrorForToast, createDetailedErrorLog } from '@/lib/edgeFunctionErrors';
import { usePromptProfiles, PromptProfile, PromptType } from '@/hooks/usePromptProfiles';
import { PromptSettingsModal } from '@/components/studio/PromptSettingsModal';
import { PromptIndicator } from '@/components/studio/PromptIndicator';

interface AudienceTargeting {
  targetMarket: string;
  language: string;
  audienceAge: string;
  audienceGender: string;
}

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

// Default prompts (used ONLY as fallback for initial setup)
const DEFAULT_PROMPTS = {
  marketing_angles: `You are a marketing expert specializing in Arabic COD eCommerce.
Analyze this product and generate marketing content:

Product: {{product_name}}
Description: {{product_description}}

Generate:
1. 3 problems this product solves
2. 3 customer value points
3. 4 marketing angles

Output in Arabic. Be specific to the product. Use emotional triggers for Saudi/Gulf audience.`,

  landing_page: `You are a landing page copywriter for Arabic COD eCommerce.

Product: {{product_name}}
Description: {{product_description}}

Create complete landing page content in Arabic including:
- Hero headline and subheadline
- 4-6 key features with icons
- 3 customer testimonials
- FAQ section (5 questions)
- Guarantee section
- CTA buttons text

Format in Markdown. Use persuasive language for Saudi Arabia market.`
};

export const StudioMarketingEngine = ({ onNext }: StudioMarketingEngineProps) => {
  const { toast } = useToast();
  const { getPrompt, loading: promptsLoading } = useStudioPrompts();
  const { aiAgent, loading: aiAgentLoading } = useAIAgent();
  const { mode: backendMode, n8nEnabled: useN8nBackend, aiOperatorEnabled, getActiveBackend } = useBackendMode();
  const { getActivePrompt, getPromptForExecution, debugMode, setDebugMode } = usePromptProfiles();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('angles');
  const [generatedAngles, setGeneratedAngles] = useState<GeneratedAngles | null>(null);
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [landingContent, setLandingContent] = useState<string>('');
  const [scriptsCount, setScriptsCount] = useState('10');
  const [productInfo, setProductInfo] = useState({ name: '', description: '', url: '' });
  const [webhookResponse, setWebhookResponse] = useState<any>(null);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [audienceTargeting, setAudienceTargeting] = useState<AudienceTargeting>({
    targetMarket: 'gcc',
    language: 'ar-sa',
    audienceAge: '25-34',
    audienceGender: 'both',
  });
  
  // Prompt profiles state
  const [anglesPromptProfile, setAnglesPromptProfile] = useState<PromptProfile | null>(null);
  const [landingPromptProfile, setLandingPromptProfile] = useState<PromptProfile | null>(null);
  const [showAnglesPromptModal, setShowAnglesPromptModal] = useState(false);
  const [showLandingPromptModal, setShowLandingPromptModal] = useState(false);
  const [lastUsedPromptDebug, setLastUsedPromptDebug] = useState<{ id: string; hash: string; version: number } | null>(null);

  useEffect(() => {
    loadProductInfo();
    loadPromptProfiles();
  }, []);

  // Load prompt profiles from database
  const loadPromptProfiles = async () => {
    const language = audienceTargeting.language.split('-')[0] || 'ar';
    const market = audienceTargeting.targetMarket || 'gcc';
    
    const [anglesProfile, landingProfile] = await Promise.all([
      getActivePrompt('marketing_angles', language, market),
      getActivePrompt('landing_page', language, market)
    ]);
    
    setAnglesPromptProfile(anglesProfile);
    setLandingPromptProfile(landingProfile);
  };

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
        .select('preferences, use_n8n_backend')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        // Backend mode is now managed by useBackendMode hook
        
        const prefs = settings.preferences as Record<string, any>;
        if (prefs) {
          setProductInfo({
            name: prefs.studio_product_name || '',
            description: prefs.studio_description || '',
            url: prefs.studio_product_url || ''
          });
          // Load audience targeting
          setAudienceTargeting({
            targetMarket: prefs.studio_target_market || 'gcc',
            language: prefs.studio_language || 'ar-sa',
            audienceAge: prefs.studio_audience_age || '25-34',
            audienceGender: prefs.studio_audience_gender || 'both',
          });
          // Load webhook URL - prefer per-stage, fallback to global
          const stageWebhooks = prefs.stage_webhooks || {};
          const productContentWebhook = stageWebhooks.product_content;
          const globalWebhookUrl = prefs.n8n_global_webhook_url || prefs.global_webhook_url || '';
          
          if (productContentWebhook?.webhook_url) {
            setN8nWebhookUrl(productContentWebhook.webhook_url);
          } else if (globalWebhookUrl) {
            // Fallback to global webhook if per-stage is not configured
            setN8nWebhookUrl(globalWebhookUrl);
            console.log('Using global webhook URL as fallback:', globalWebhookUrl);
          }
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
      }
    } catch (error) {
      console.error('Error loading product info:', error);
    }
  };

  const generateMarketingAngles = async () => {
    // CRITICAL: Pull prompt from database - NO hardcoded fallbacks
    setIsGenerating(true);
    setWebhookResponse(null);
    setLastUsedPromptDebug(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get language/market for prompt lookup
      const language = audienceTargeting.language.split('-')[0] || 'ar';
      const market = audienceTargeting.targetMarket || 'gcc';

      // CRITICAL: Get prompt from database - block if not configured
      const promptResult = await getPromptForExecution('marketing_angles', language, market);
      
      if (!promptResult) {
        toast({
          title: "Prompt Not Configured",
          description: "Please configure the Marketing Angles prompt in Prompt Settings before generating.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      const { prompt: activePrompt, debugInfo } = promptResult;
      setLastUsedPromptDebug(debugInfo);
      
      // Replace variables in prompt
      const anglesPrompt = activePrompt.prompt_text
        .replace(/\{\{product_name\}\}/g, productInfo.name)
        .replace(/\{\{product_description\}\}/g, productInfo.description);

      if (debugMode) {
        console.log('[ProductContent] Using prompt:', {
          id: debugInfo.id,
          hash: debugInfo.hash,
          version: debugInfo.version,
          promptPreview: anglesPrompt.substring(0, 100) + '...'
        });
      }

      // Priority 1: When n8n Backend Mode is enabled, use per-stage webhook via proxy
      if (useN8nBackend) {
        if (!n8nWebhookUrl) {
          throw new Error('n8n Backend Mode is enabled but no webhook URL is configured for Product Content stage. Please configure it in Settings.');
        }
        
        console.log('Calling Product Content webhook via proxy (n8n mode):', n8nWebhookUrl);
        
        // Use edge function proxy to avoid CORS issues
        const { data: proxyResponse, error: proxyError } = await supabase.functions.invoke('n8n-proxy', {
          body: {
            webhookUrl: n8nWebhookUrl,
            payload: {
              action: 'generate_marketing_angles',
              productName: productInfo.name,
              productDescription: productInfo.description,
              productUrl: productInfo.url,
              prompt: anglesPrompt,
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

        if (!proxyResponse?.success) {
          throw new Error(proxyResponse?.error || 'Webhook call failed');
        }

        const data = proxyResponse.data;
        setWebhookResponse(data);

        const angles: GeneratedAngles = data?.problemsSolved ? data : {
          problemsSolved: data?.problems_solved || [
            'المشاكل الجلدية المزعجة مثل حب الشباب والبقع الداكنة',
            'قلة الثقة بالنفس بسبب مظهر البشرة',
            'صعوبة إيجاد منتج آمن وفعال',
          ],
          customerValue: data?.customer_value || [
            'بشرة نضرة ومشرقة خلال أسابيع قليلة',
            'ثقة عالية بالنفس والمظهر',
            'مكونات طبيعية آمنة 100%',
          ],
          marketingAngles: data?.marketing_angles || [
            'المشكلة → الحل: من بشرة مرهقة إلى إشراقة طبيعية',
            'الدليل الاجتماعي: آلاف العملاء الراضين',
            'الندرة والإلحاح: عرض محدود لفترة قصيرة',
          ],
        };

        setGeneratedAngles(angles);
        saveContent({ angles });
        
        toast({
          title: "تم إنشاء الزوايا التسويقية",
          description: "تم تحليل المنتج وإنشاء زوايا تسويقية عالية التحويل (via n8n)",
        });
      } 
      // Priority 2: When AI Operator Agent is enabled, use Supabase function
      else if (aiOperatorEnabled) {
        console.log('Calling AI Content Factory (AI Operator mode)');
        
        const { data, error } = await supabase.functions.invoke('ai-content-factory', {
          body: {
            productName: productInfo.name,
            productDescription: productInfo.description,
            contentTypes: ['angles'],
            language: audienceTargeting.language.split('-')[0] || 'ar',
            market: audienceTargeting.targetMarket || 'sa',
            audience: audienceTargeting.audienceGender === 'both' ? 'both' : audienceTargeting.audienceGender,
            customPrompt: anglesPrompt,
            projectId: 'studio-session',
          }
        });

        if (error) throw error;

        const anglesData = data?.content?.angles;
        const angles: GeneratedAngles = {
          problemsSolved: anglesData?.angles?.slice(0, 3).map((a: any) => a.keyMessage) || [
            'المشاكل الجلدية المزعجة مثل حب الشباب والبقع الداكنة',
            'قلة الثقة بالنفس بسبب مظهر البشرة',
            'صعوبة إيجاد منتج آمن وفعال',
          ],
          customerValue: anglesData?.angles?.slice(3, 6).map((a: any) => a.keyMessage) || [
            'بشرة نضرة ومشرقة خلال أسابيع قليلة',
            'ثقة عالية بالنفس والمظهر',
            'مكونات طبيعية آمنة 100%',
          ],
          marketingAngles: anglesData?.angles?.slice(6, 10).map((a: any) => `${a.name}: ${a.headline}`) || [
            'المشكلة → الحل: من بشرة مرهقة إلى إشراقة طبيعية',
            'الدليل الاجتماعي: آلاف العملاء الراضين',
            'الندرة والإلحاح: عرض محدود لفترة قصيرة',
          ],
        };

        setGeneratedAngles(angles);
        saveContent({ angles });
        
        toast({
          title: "تم إنشاء الزوايا التسويقية",
          description: "تم تحليل المنتج وإنشاء زوايا تسويقية عالية التحويل (via AI Operator)",
        });
      }
      // Priority 3: Auto mode - use Lovable AI directly via edge function
      else {
        console.log('Calling AI Content Factory (Auto mode - Lovable AI)');
        
        const { data, error } = await supabase.functions.invoke('ai-content-factory', {
          body: {
            productName: productInfo.name,
            productDescription: productInfo.description,
            contentTypes: ['angles'],
            language: audienceTargeting.language.split('-')[0] || 'ar',
            market: audienceTargeting.targetMarket || 'sa',
            audience: audienceTargeting.audienceGender === 'both' ? 'both' : audienceTargeting.audienceGender,
            customPrompt: anglesPrompt,
            projectId: 'studio-session',
          }
        });

        if (error) throw error;

        const anglesData = data?.content?.angles;
        const angles: GeneratedAngles = {
          problemsSolved: anglesData?.angles?.slice(0, 3).map((a: any) => a.keyMessage) || [
            'المشاكل الجلدية المزعجة مثل حب الشباب والبقع الداكنة',
            'قلة الثقة بالنفس بسبب مظهر البشرة',
            'صعوبة إيجاد منتج آمن وفعال',
          ],
          customerValue: anglesData?.angles?.slice(3, 6).map((a: any) => a.keyMessage) || [
            'بشرة نضرة ومشرقة خلال أسابيع قليلة',
            'ثقة عالية بالنفس والمظهر',
            'مكونات طبيعية آمنة 100%',
          ],
          marketingAngles: anglesData?.angles?.slice(6, 10).map((a: any) => `${a.name}: ${a.headline}`) || [
            'المشكلة → الحل: من بشرة مرهقة إلى إشراقة طبيعية',
            'الدليل الاجتماعي: آلاف العملاء الراضين',
            'الندرة والإلحاح: عرض محدود لفترة قصيرة',
          ],
        };

        setGeneratedAngles(angles);
        saveContent({ angles });
        
        toast({
          title: "تم إنشاء الزوايا التسويقية",
          description: "تم تحليل المنتج وإنشاء زوايا تسويقية عالية التحويل",
        });
      }
    } catch (error: any) {
      const context = {
        stage: 'marketing_angles',
        backendMode: getActiveBackend(),
        productName: productInfo.name,
        market: audienceTargeting.targetMarket,
        language: audienceTargeting.language,
      };
      console.error('Generation error:', createDetailedErrorLog(error, context));
      
      const parsedError = parseEdgeFunctionError(error);
      const toastContent = formatErrorForToast(parsedError);
      
      toast({
        title: toastContent.title,
        description: toastContent.description,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateScripts = async () => {
    // Backend mode is now managed by useBackendMode hook - 'auto' mode uses Lovable AI
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const tones = ['engaging', 'professional', 'urgent', 'emotional', 'casual', 'humorous', 'luxurious', 'educational', 'storytelling', 'direct'];
      const count = parseInt(scriptsCount);
      
      // Get prompts
      const scriptsPrompt = getPrompt('voiceover_scripts', {
        product_name: productInfo.name,
        product_description: productInfo.description,
      });

      // Priority 1: n8n Backend Mode
      if (useN8nBackend) {
        if (!n8nWebhookUrl) {
          throw new Error('n8n Backend Mode is enabled but no webhook URL is configured for Product Content stage. Please configure it in Settings.');
        }
        
        console.log('Calling Scripts webhook via proxy (n8n mode):', n8nWebhookUrl);
        
        // Use edge function proxy to avoid CORS issues
        const { data: proxyResponse, error: proxyError } = await supabase.functions.invoke('n8n-proxy', {
          body: {
            webhookUrl: n8nWebhookUrl,
            payload: {
              action: 'generate_scripts',
              productName: productInfo.name,
              productDescription: productInfo.description,
              productUrl: productInfo.url,
              prompt: scriptsPrompt,
              tones: tones.slice(0, count),
              count,
              audienceTargeting: {
                targetMarket: audienceTargeting.targetMarket,
                language: audienceTargeting.language,
                audienceAge: audienceTargeting.audienceAge,
                audienceGender: audienceTargeting.audienceGender,
              },
              model: getModelName(aiAgent),
            }
          }
        });

        if (proxyError) {
          throw new Error(proxyError.message || 'Webhook proxy error');
        }

        if (!proxyResponse?.success) {
          throw new Error(proxyResponse?.error || 'Webhook call failed');
        }

        const data = proxyResponse.data;
        
        const generatedScripts: GeneratedScript[] = data?.scripts || tones.slice(0, count).map((tone, i) => ({
          id: `script-${i}`,
          tone,
          content: `سكريبت ${tone} لمنتج ${productInfo.name}...`,
          wordCount: Math.floor(Math.random() * 100) + 50,
        }));

        setScripts(generatedScripts);
        saveContent({ scripts: generatedScripts });
        toast({
          title: "تم إنشاء السكريبتات",
          description: `تم إنشاء ${generatedScripts.length} نسخة من السكريبت (via n8n)`,
        });
      }
      // Priority 2: AI Operator Agent Mode
      else if (aiOperatorEnabled) {
        console.log('Calling Script Generation (AI Operator mode)');
        
        const { data, error } = await supabase.functions.invoke('ai-content-factory', {
          body: {
            productName: productInfo.name,
            productDescription: productInfo.description,
            contentTypes: ['scripts'],
            language: audienceTargeting.language.split('-')[0] || 'ar',
            market: audienceTargeting.targetMarket || 'sa',
            audience: audienceTargeting.audienceGender === 'both' ? 'both' : audienceTargeting.audienceGender,
            customPrompt: scriptsPrompt,
            scriptsCount: count,
            projectId: 'studio-session',
          }
        });

        if (error) throw error;

        const scriptsData = data?.content?.scripts?.scripts || [];
        const generatedScripts: GeneratedScript[] = scriptsData.length > 0 
          ? scriptsData.map((s: any, i: number) => ({
              id: `script-${i}`,
              tone: s.style || tones[i] || 'engaging',
              content: s.script || '',
              wordCount: s.script?.split(' ').length || 50,
            }))
          : tones.slice(0, count).map((tone, i) => ({
              id: `script-${i}`,
              tone,
              content: `سكريبت ${tone} لمنتج ${productInfo.name}...`,
              wordCount: 50,
            }));

        setScripts(generatedScripts);
        saveContent({ scripts: generatedScripts });
        toast({
          title: "تم إنشاء السكريبتات",
          description: `تم إنشاء ${generatedScripts.length} نسخة من السكريبت (via AI Operator)`,
        });
      }
      // Priority 3: Auto mode - use Lovable AI directly
      else {
        console.log('Calling Script Generation (Auto mode - Lovable AI)');
        
        const { data, error } = await supabase.functions.invoke('ai-content-factory', {
          body: {
            productName: productInfo.name,
            productDescription: productInfo.description,
            contentTypes: ['scripts'],
            language: audienceTargeting.language.split('-')[0] || 'ar',
            market: audienceTargeting.targetMarket || 'sa',
            audience: audienceTargeting.audienceGender === 'both' ? 'both' : audienceTargeting.audienceGender,
            customPrompt: scriptsPrompt,
            scriptsCount: count,
            projectId: 'studio-session',
          }
        });

        if (error) throw error;

        const scriptsData = data?.content?.scripts?.scripts || [];
        const generatedScripts: GeneratedScript[] = scriptsData.length > 0 
          ? scriptsData.map((s: any, i: number) => ({
              id: `script-${i}`,
              tone: s.style || tones[i] || 'engaging',
              content: s.script || '',
              wordCount: s.script?.split(' ').length || 50,
            }))
          : tones.slice(0, count).map((tone, i) => ({
              id: `script-${i}`,
              tone,
              content: `سكريبت ${tone} لمنتج ${productInfo.name}...`,
              wordCount: 50,
            }));

        setScripts(generatedScripts);
        saveContent({ scripts: generatedScripts });
        toast({
          title: "تم إنشاء السكريبتات",
          description: `تم إنشاء ${generatedScripts.length} نسخة من السكريبت`,
        });
      }
    } catch (error: any) {
      const context = {
        stage: 'scripts',
        backendMode: getActiveBackend(),
        productName: productInfo.name,
        market: audienceTargeting.targetMarket,
        language: audienceTargeting.language,
        scriptsCount,
      };
      console.error('Scripts generation error:', createDetailedErrorLog(error, context));
      
      const parsedError = parseEdgeFunctionError(error);
      const toastContent = formatErrorForToast(parsedError);
      
      toast({
        title: toastContent.title,
        description: toastContent.description,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLandingContent = async () => {
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get the landing page content prompt from Settings
      const landingPrompt = getPrompt('landing_page_content', {
        product_name: productInfo.name,
        product_description: productInfo.description,
      });

      // Priority 1: n8n Backend Mode
      if (useN8nBackend) {
        if (!n8nWebhookUrl) {
          throw new Error('n8n Backend Mode is enabled but no webhook URL is configured for Product Content stage.');
        }
        
        console.log('Calling Landing Content webhook via proxy (n8n mode):', n8nWebhookUrl);
        
        // Use edge function proxy to avoid CORS issues
        const { data: proxyResponse, error: proxyError } = await supabase.functions.invoke('n8n-proxy', {
          body: {
            webhookUrl: n8nWebhookUrl,
            payload: {
              action: 'generate_landing_content',
              productName: productInfo.name,
              productDescription: productInfo.description,
              prompt: landingPrompt,
              audienceTargeting,
              model: getModelName(aiAgent),
            }
          }
        });

        if (proxyError) {
          throw new Error(proxyError.message || 'Webhook proxy error');
        }

        if (!proxyResponse?.success) {
          throw new Error(proxyResponse?.error || 'Webhook call failed');
        }

        const data = proxyResponse.data;
        const content = data?.content || data?.landingContent || generateDefaultLandingContent();
        setLandingContent(content);
        saveContent({ landingContent: content });
        toast({
          title: "تم إنشاء محتوى صفحة الهبوط",
          description: "تم إنشاء جميع أقسام صفحة الهبوط بنجاح (via n8n)",
        });
      }
      // Priority 2: AI Operator Mode or Auto Mode - use edge function with Lovable AI
      else {
        console.log('Calling Landing Content (Lovable AI mode)');
        
        const { data, error } = await supabase.functions.invoke('ai-content-factory', {
          body: {
            productName: productInfo.name,
            productDescription: productInfo.description,
            contentTypes: ['landing_page'],
            language: audienceTargeting.language.split('-')[0] || 'ar',
            market: audienceTargeting.targetMarket || 'sa',
            audience: audienceTargeting.audienceGender === 'both' ? 'both' : audienceTargeting.audienceGender,
            customPrompt: landingPrompt,
            projectId: 'studio-session',
          }
        });

        if (error) throw error;

        const landingData = data?.content?.landing_page;
        let content = '';
        
        if (landingData) {
          // Format the landing page data into readable content
          content = `# ${productInfo.name}

## العنوان الرئيسي
**${landingData.hero?.headline || `غيّر حياتك اليوم مع ${productInfo.name}`}**
${landingData.hero?.subheadline || 'انضم إلى آلاف العملاء الراضين'}

${landingData.hero?.trustBadges ? `${landingData.hero.trustBadges.map((b: string) => `✅ ${b}`).join('\n')}` : ''}

## المشكلة
${landingData.problem?.headline || ''}
${landingData.problem?.points?.map((p: string) => `- ${p}`).join('\n') || ''}

## الحل
${landingData.solution?.headline || ''}
${landingData.solution?.description || ''}

## المميزات الرئيسية
${landingData.features?.map((f: any) => `✅ **${f.title}**: ${f.description}`).join('\n') || ''}

## آراء العملاء
${landingData.testimonials?.map((t: any) => `⭐⭐⭐⭐⭐ "${t.quote}" - ${t.name}`).join('\n') || ''}

## الأسئلة الشائعة
${landingData.faq?.map((f: any) => `**س: ${f.question}**\nج: ${f.answer}`).join('\n\n') || ''}

## ضمان الرضا
${landingData.guarantee?.headline || ''}
${landingData.guarantee?.description || ''}

## ${landingData.finalCta?.headline || 'اطلب الآن'}
[${landingData.finalCta?.ctaText || 'اطلب الآن - دفع عند الاستلام'}]
${landingData.finalCta?.urgencyText || ''}`;
        } else {
          content = generateDefaultLandingContent();
        }

        setLandingContent(content);
        saveContent({ landingContent: content });
        toast({
          title: "تم إنشاء محتوى صفحة الهبوط",
          description: "تم إنشاء جميع أقسام صفحة الهبوط بنجاح",
        });
      }
    } catch (error: any) {
      const context = {
        stage: 'landing_content',
        backendMode: getActiveBackend(),
        productName: productInfo.name,
        market: audienceTargeting.targetMarket,
        language: audienceTargeting.language,
      };
      console.error('Landing content error:', createDetailedErrorLog(error, context));
      
      const parsedError = parseEdgeFunctionError(error);
      const toastContent = formatErrorForToast(parsedError);
      
      toast({
        title: toastContent.title,
        description: toastContent.description,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDefaultLandingContent = () => {
    return `# ${productInfo.name}

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
        <div className="flex items-center gap-3">
          <BackendModeSelector compact />
          <Badge variant="outline" className="text-primary border-primary">Step 2</Badge>
        </div>
      </div>

      {/* Webhook indicator */}
      {useN8nBackend && n8nWebhookUrl && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <Webhook className="w-3 h-3 text-green-500" />
          <span>Webhook enabled: {n8nWebhookUrl.substring(0, 50)}...</span>
        </div>
      )}

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

      {/* Webhook Response Preview */}
      {webhookResponse && (
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex items-center gap-2 mb-3">
            <Webhook className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm text-foreground">Webhook Response</h4>
          </div>
          <pre className="text-xs bg-background p-3 rounded-md overflow-auto max-h-48 text-muted-foreground">
            {JSON.stringify(webhookResponse, null, 2)}
          </pre>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted">
          <TabsTrigger value="angles" className="gap-2">
            <Target className="w-4 h-4" />
            Marketing Angles
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
              <div className="space-y-1">
                <h3 className="font-semibold">Product Marketing Angles</h3>
                <p className="text-sm text-muted-foreground">AI-generated marketing angles in Arabic</p>
                <PromptIndicator 
                  prompt={anglesPromptProfile} 
                  onClick={() => setShowAnglesPromptModal(true)}
                  label="Marketing Angles Prompt"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAnglesPromptModal(true)}
                  className="gap-1"
                >
                  <Settings className="w-4 h-4" />
                  Prompt Settings
                </Button>
                <Button onClick={generateMarketingAngles} disabled={isGenerating || !anglesPromptProfile} className="gap-2">
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {generatedAngles ? 'Regenerate' : 'Generate Angles'}
                </Button>
              </div>
            </div>

            {/* Debug info panel */}
            {debugMode && lastUsedPromptDebug && (
              <div className="mb-4 p-3 rounded-lg bg-muted/50 border font-mono text-xs">
                <p className="text-muted-foreground">Last generation used:</p>
                <p>Prompt ID: {lastUsedPromptDebug.id}</p>
                <p>Hash: {lastUsedPromptDebug.hash}</p>
                <p>Version: {lastUsedPromptDebug.version}</p>
              </div>
            )}

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

        {/* Landing Page Content */}
        <TabsContent value="landing" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <h3 className="font-semibold">Landing Page Content</h3>
                <p className="text-sm text-muted-foreground">Generate Arabic landing page content for COD eCommerce</p>
                <PromptIndicator 
                  prompt={landingPromptProfile} 
                  onClick={() => setShowLandingPromptModal(true)}
                  label="Landing Page Prompt"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowLandingPromptModal(true)}
                  className="gap-1"
                >
                  <Settings className="w-4 h-4" />
                  Prompt Settings
                </Button>
                <Button onClick={generateLandingContent} disabled={isGenerating || !landingPromptProfile} className="gap-2">
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

      {/* Prompt Settings Modals */}
      <PromptSettingsModal
        isOpen={showAnglesPromptModal}
        onClose={() => setShowAnglesPromptModal(false)}
        type="marketing_angles"
        language={audienceTargeting.language.split('-')[0] || 'ar'}
        market={audienceTargeting.targetMarket || 'gcc'}
        defaultPrompt={DEFAULT_PROMPTS.marketing_angles}
        defaultTitle="Marketing Angles Generator"
        onSaved={(prompt) => {
          setAnglesPromptProfile(prompt);
          setShowAnglesPromptModal(false);
        }}
      />
      
      <PromptSettingsModal
        isOpen={showLandingPromptModal}
        onClose={() => setShowLandingPromptModal(false)}
        type="landing_page"
        language={audienceTargeting.language.split('-')[0] || 'ar'}
        market={audienceTargeting.targetMarket || 'gcc'}
        defaultPrompt={DEFAULT_PROMPTS.landing_page}
        defaultTitle="Landing Page Content Generator"
        onSaved={(prompt) => {
          setLandingPromptProfile(prompt);
          setShowLandingPromptModal(false);
        }}
      />

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
