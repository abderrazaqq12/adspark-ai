/**
 * Unified Landing Page Compiler
 * Consumes: Product Input + Marketing Angles Output
 * Produces: Production-ready HTML website directly
 */
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Code,
  Eye,
  Copy,
  Download,
  ExternalLink,
  Bug,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePromptProfiles, PromptProfile } from '@/hooks/usePromptProfiles';
import { usePipelineOutputs, MarketingAnglesOutput } from '@/hooks/usePipelineOutputs';
import { PromptSettingsModal } from '@/components/studio/PromptSettingsModal';
import { PromptIndicator } from '@/components/studio/PromptIndicator';
import { useAIAgent, getModelName } from '@/hooks/useAIAgent';

interface LandingPageCompilerProps {
  projectId: string;
  productInfo: {
    name: string;
    description: string;
    url?: string;
    mediaLinks?: string[];
  };
  audienceTargeting: {
    targetMarket: string;
    language: string;
    audienceAge: string;
    audienceGender: string;
  };
  onGenerated?: (html: string) => void;
}

const DEFAULT_COMPILER_PROMPT = `You are an AI Landing Page Compiler.
Your task is to BUILD a complete, production-ready landing page WEBSITE.

========================
INPUT DATA
========================
PRODUCT:
- Name: {{product_name}}
- Description: {{product_description}}
- Media: {{media_links}}

MARKETING INTELLIGENCE:
- Problems: {{problems}}
- Desires: {{desires}}
- Emotional Triggers: {{emotional_triggers}}
- Marketing Angles: {{angles}}

AUDIENCE:
- Market: {{market}}
- Language: {{language}}
- Age: {{audience_age}}
- Gender: {{audience_gender}}

========================
OUTPUT REQUIREMENTS
========================
Return ONLY valid HTML + embedded CSS.
NO explanations. NO markdown. NO comments.

========================
MANDATORY RULES
========================
- Root element MUST include: dir="rtl" lang="ar"
- Language: Saudi Arabic dialect (100%)
- Mobile-first design (max-width: 480px)
- Modern, conversion-focused UI
- CSS variables for colors:
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --text-primary: #ffffff;
  --text-accent: #a855f7;
  --cta-bg: #22c55e;

========================
PAGE STRUCTURE (STRICT)
========================
1. HERO SECTION
   - Strong Arabic headline (benefit-driven from problems)
   - Subheadline (from desires)
   - <div class="image-placeholder">1080x1080</div>

2. PROBLEM SECTION
   - Derived ONLY from problems
   - 3-4 bullet points

3. SOLUTION / VALUE SECTION
   - Derived ONLY from desires
   - Position product as the answer

4. FEATURES & BENEFITS
   - From marketing angles
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
- Arabic font: 'Cairo', 'Tajawal', sans-serif
- Include Google Fonts link
- Generous padding (20px+)
- Large touch targets (min 50px)

========================
IMAGE HANDLING
========================
<div class="image-placeholder" style="width:100%;aspect-ratio:1;background:#2a2a2a;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#666;">1080×1080</div>

Return a SINGLE complete HTML document.

CRITICAL: Use problems, desires, and angles as SOURCE OF TRUTH.
Do NOT invent benefits not present in the provided data.`;

export const LandingPageCompiler = ({
  projectId,
  productInfo,
  audienceTargeting,
  onGenerated
}: LandingPageCompilerProps) => {
  const { toast } = useToast();
  const { aiAgent } = useAIAgent();
  const { getActivePrompt, getPromptForExecution, debugMode, setDebugMode } = usePromptProfiles();
  const { getMarketingAnglesOutput, saveLandingPageHtmlOutput, getLandingPageHtmlOutput } = usePipelineOutputs();

  const [isGenerating, setIsGenerating] = useState(false);
  const [marketingAngles, setMarketingAngles] = useState<MarketingAnglesOutput | null>(null);
  const [htmlOutput, setHtmlOutput] = useState<string>('');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [promptProfile, setPromptProfile] = useState<PromptProfile | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [lastUsedPromptDebug, setLastUsedPromptDebug] = useState<{ id: string; hash: string; version: number } | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    if (!projectId) return;

    // Load Stage 1 output (required)
    const angles = await getMarketingAnglesOutput(projectId);
    setMarketingAngles(angles);

    // Load existing HTML if any
    const existingHtml = await getLandingPageHtmlOutput(projectId);
    if (existingHtml) {
      setHtmlOutput(existingHtml);
      setViewMode('preview');
    }

    // Load prompt
    await loadPromptProfile();
  };

  const loadPromptProfile = async () => {
    const language = audienceTargeting.language.split('-')[0] || 'ar';
    const market = audienceTargeting.targetMarket || 'gcc';
    const profile = await getActivePrompt('landing_page' as any, language, market);
    setPromptProfile(profile);
  };

  const buildPrompt = (template: string): string => {
    if (!marketingAngles) return template;

    const problems = marketingAngles.problems?.join('\n- ') || '';
    const desires = marketingAngles.desires?.join('\n- ') || '';
    const emotional = marketingAngles.emotional_triggers?.join('\n- ') || '';
    const angles = marketingAngles.angles?.map(a => `${a.angle_type}: ${a.hook} - ${a.promise}`).join('\n- ') || '';
    const mediaLinks = productInfo.mediaLinks?.join('\n') || 'No media provided';

    return template
      .replace(/\{\{product_name\}\}/g, productInfo.name)
      .replace(/\{\{product_description\}\}/g, productInfo.description)
      .replace(/\{\{media_links\}\}/g, mediaLinks)
      .replace(/\{\{problems\}\}/g, problems)
      .replace(/\{\{desires\}\}/g, desires)
      .replace(/\{\{emotional_triggers\}\}/g, emotional)
      .replace(/\{\{angles\}\}/g, angles)
      .replace(/\{\{market\}\}/g, audienceTargeting.targetMarket)
      .replace(/\{\{language\}\}/g, audienceTargeting.language)
      .replace(/\{\{audience_age\}\}/g, audienceTargeting.audienceAge)
      .replace(/\{\{audience_gender\}\}/g, audienceTargeting.audienceGender);
  };

  const generateHtml = async () => {
    // BLOCK if Marketing Angles not available
    if (!marketingAngles) {
      toast({
        title: "Marketing Angles Required",
        description: "Please generate Marketing Angles first. This step depends on that output.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setLastUsedPromptDebug(null);

    try {
      const language = audienceTargeting.language.split('-')[0] || 'ar';
      const market = audienceTargeting.targetMarket || 'gcc';

      // Get prompt from database or use default
      const promptResult = await getPromptForExecution('landing_page' as any, language, market);
      
      let finalPrompt: string;
      let debugInfo = { id: 'default', hash: 'n/a', version: 0 };

      if (promptResult) {
        const { prompt: activePrompt, debugInfo: dbDebugInfo } = promptResult;
        debugInfo = dbDebugInfo;
        finalPrompt = buildPrompt(activePrompt.prompt_text || DEFAULT_COMPILER_PROMPT);
      } else {
        finalPrompt = buildPrompt(DEFAULT_COMPILER_PROMPT);
      }

      setLastUsedPromptDebug(debugInfo);

      if (debugMode) {
        console.log('[LandingPageCompiler] Using prompt:', {
          id: debugInfo.id,
          hash: debugInfo.hash,
          version: debugInfo.version,
          marketingAnglesPresent: !!marketingAngles
        });
      }

      // Call AI
      const response = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: finalPrompt,
          model: getModelName(aiAgent),
        }
      });

      if (response.error) throw new Error(response.error.message);

      let html = response.data?.response || response.data?.content || '';
      
      // Extract HTML from markdown code blocks
      const htmlMatch = html.match(/```html\s*([\s\S]*?)```/);
      if (htmlMatch) {
        html = htmlMatch[1].trim();
      } else {
        const codeMatch = html.match(/```\s*([\s\S]*?)```/);
        if (codeMatch) {
          html = codeMatch[1].trim();
        }
      }

      // Save to database
      await saveLandingPageHtmlOutput(projectId, html, {
        prompt_id: debugInfo.id,
        prompt_hash: debugInfo.hash
      });
      
      setHtmlOutput(html);
      setViewMode('preview');
      onGenerated?.(html);

      toast({
        title: "Landing Page Generated",
        description: `Production-ready HTML compiled from Marketing Angles`,
      });
    } catch (error: any) {
      console.error('[LandingPageCompiler] Generation error:', error);
      toast({
        title: "Generation Error",
        description: error.message || "Failed to generate HTML",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(htmlOutput);
    toast({ title: "Copied", description: "HTML copied to clipboard" });
  };

  const downloadHtml = () => {
    const blob = new Blob([htmlOutput], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'landing-page.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openGoogleAIStudio = () => {
    window.open('https://aistudio.google.com/app/prompts/new_chat', '_blank');
  };

  const hasAngles = !!(marketingAngles && (marketingAngles.problems?.length > 0 || marketingAngles.angles?.length > 0));

  return (
    <Card className="p-5 bg-card/50 border-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Landing Page Compiler</h3>
            <p className="text-xs text-muted-foreground">Generate HTML directly from Marketing Angles</p>
          </div>
        </div>
        <Badge variant="outline" className="text-primary border-primary/50">HTML Generator</Badge>
      </div>

      {/* Data Source Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
          {hasAngles ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
          <span className="text-xs">
            Marketing Angles: {hasAngles ? 'Ready' : 'Missing (Required)'}
          </span>
        </div>
        <PromptIndicator
          prompt={promptProfile}
          onClick={() => setShowPromptModal(true)}
          label="Compiler Prompt"
        />
      </div>

      {/* Debug Panel */}
      {debugMode && lastUsedPromptDebug && (
        <div className="p-3 rounded-lg bg-slate-900/50 border border-border">
          <p className="text-xs font-mono text-muted-foreground">
            Prompt: {lastUsedPromptDebug.id.slice(0, 8)}... | Hash: {lastUsedPromptDebug.hash} | v{lastUsedPromptDebug.version}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={generateHtml}
          disabled={isGenerating || !hasAngles}
          className="gap-2"
        >
          {isGenerating ? (
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

        <Button variant="outline" size="sm" onClick={openGoogleAIStudio} className="gap-2">
          <ExternalLink className="w-4 h-4" />
          Open AI Studio
        </Button>

        {htmlOutput && (
          <>
            <Button variant="ghost" size="icon" onClick={copyHtml}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={downloadHtml}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={generateHtml} disabled={isGenerating}>
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugMode(!debugMode)}
              className="gap-1 text-xs"
            >
              <Bug className="w-3 h-3" />
              Debug
            </Button>
          </>
        )}
      </div>

      {/* View Mode Toggle */}
      {htmlOutput && (
        <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-border w-fit">
          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'code'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code className="w-4 h-4" />
            Code
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'preview'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>
      )}

      {/* Output */}
      {htmlOutput && viewMode === 'code' && (
        <Textarea
          value={htmlOutput}
          onChange={(e) => setHtmlOutput(e.target.value)}
          className="min-h-[300px] bg-slate-900/50 border-border text-xs font-mono"
        />
      )}

      {htmlOutput && viewMode === 'preview' && (
        <div className="bg-white rounded-lg overflow-hidden border border-border">
          <iframe
            srcDoc={htmlOutput}
            className="w-full min-h-[400px]"
            title="Landing Page Preview"
            sandbox="allow-scripts"
          />
        </div>
      )}

      {!htmlOutput && !isGenerating && (
        <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
          <Sparkles className="w-10 h-10 mb-3 text-primary/30" />
          <p className="text-sm text-center">
            {hasAngles 
              ? "Click 'Generate HTML Page' to compile your landing page"
              : "Marketing Angles required from previous step"}
          </p>
        </div>
      )}

      {/* Prompt Modal */}
      <PromptSettingsModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        type="landing_page"
        defaultTitle="Landing Page Compiler Prompt"
        defaultPrompt={DEFAULT_COMPILER_PROMPT}
        language={audienceTargeting.language.split('-')[0] || 'ar'}
        market={audienceTargeting.targetMarket || 'gcc'}
        onSaved={() => loadPromptProfile()}
      />
    </Card>
  );
};
