/**
 * Stage 3: Landing Page HTML Generator
 * Consumes: Landing Page Text Output
 * Produces: Production-ready HTML website
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
  Bug
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePromptProfiles, PromptProfile } from '@/hooks/usePromptProfiles';
import { usePipelineOutputs, LandingPageTextOutput } from '@/hooks/usePipelineOutputs';
import { PromptSettingsModal } from '@/components/studio/PromptSettingsModal';
import { PromptIndicator } from '@/components/studio/PromptIndicator';
import { useAIAgent, getModelName } from '@/hooks/useAIAgent';

interface LandingPageHtmlGeneratorProps {
  projectId: string;
  audienceTargeting: {
    targetMarket: string;
    language: string;
    audienceAge: string;
    audienceGender: string;
  };
  onGenerated?: (html: string) => void;
}

const DEFAULT_HTML_PROMPT = `You are an AI Landing Page Compiler.
Your task is to BUILD a complete, production-ready landing page WEBSITE.

========================
INPUT DATA
========================
{{text_content}}

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
PAGE STRUCTURE
========================
1. HERO - headline + subheadline + image placeholder
2. BENEFITS - bullet points
3. FEATURES - with descriptions
4. HOW TO USE - steps
5. TECHNICAL DETAILS
6. REVIEWS - with ⭐⭐⭐⭐⭐ ratings
7. FAQ - questions & answers
8. FINAL CTA - order button

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

Return a SINGLE complete HTML document.`;

export const LandingPageHtmlGenerator = ({
  projectId,
  audienceTargeting,
  onGenerated
}: LandingPageHtmlGeneratorProps) => {
  const { toast } = useToast();
  const { aiAgent } = useAIAgent();
  const { getActivePrompt, getPromptForExecution, debugMode, setDebugMode } = usePromptProfiles();
  const { getLandingPageTextOutput, saveLandingPageHtmlOutput, getLandingPageHtmlOutput } = usePipelineOutputs();

  const [isGenerating, setIsGenerating] = useState(false);
  const [textOutput, setTextOutput] = useState<LandingPageTextOutput | null>(null);
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

    // Load Stage 2 output (required)
    const text = await getLandingPageTextOutput(projectId);
    setTextOutput(text);

    // Load existing HTML if any
    const existingHtml = await getLandingPageHtmlOutput(projectId);
    if (existingHtml) setHtmlOutput(existingHtml);

    // Load prompt
    await loadPromptProfile();
  };

  const loadPromptProfile = async () => {
    const language = audienceTargeting.language.split('-')[0] || 'ar';
    const market = audienceTargeting.targetMarket || 'gcc';
    // Use a different prompt type for HTML generation
    const profile = await getActivePrompt('landing_page' as any, language, market);
    setPromptProfile(profile);
  };

  const buildPrompt = (template: string): string => {
    if (!textOutput) return template;

    // Convert structured text to readable format for AI
    const textContent = `
HERO:
- Headline: ${textOutput.hero?.headline || ''}
- Subheadline: ${textOutput.hero?.subheadline || ''}

BENEFITS:
${textOutput.benefits?.map((b, i) => `${i + 1}. ${b}`).join('\n') || 'None'}

FEATURES:
${textOutput.features?.map(f => `- ${f.title}: ${f.description}`).join('\n') || 'None'}

USAGE STEPS:
${textOutput.usage_steps?.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'None'}

TECHNICAL DETAILS:
${textOutput.technical_details?.join('\n') || 'None'}

FAQ:
${textOutput.faq?.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n') || 'None'}

REVIEWS:
${textOutput.reviews?.map(r => `${r.name} (${r.rating}★): ${r.text}`).join('\n') || 'None'}
`;

    return template.replace(/\{\{text_content\}\}/g, textContent);
  };

  const generateHtml = async () => {
    // BLOCK if Stage 2 not complete
    if (!textOutput) {
      toast({
        title: "Text Content Required",
        description: "Please generate Landing Page Text first. Stage 3 depends on Stage 2 output.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setLastUsedPromptDebug(null);

    try {
      const language = audienceTargeting.language.split('-')[0] || 'ar';
      const market = audienceTargeting.targetMarket || 'gcc';

      // Get prompt from database
      const promptResult = await getPromptForExecution('landing_page' as any, language, market);

      if (!promptResult) {
        toast({
          title: "Prompt Not Configured",
          description: "Please configure the HTML Builder prompt in Prompt Settings.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      const { prompt: activePrompt, debugInfo } = promptResult;
      setLastUsedPromptDebug(debugInfo);

      // Build the final prompt with text content
      const finalPrompt = buildPrompt(DEFAULT_HTML_PROMPT);

      if (debugMode) {
        console.log('[Stage3] Using prompt:', {
          id: debugInfo.id,
          hash: debugInfo.hash,
          version: debugInfo.version,
          textContentPresent: !!textOutput
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
        title: "HTML Page Generated",
        description: `Production-ready HTML saved (Prompt v${debugInfo.version})`,
      });
    } catch (error: any) {
      console.error('[Stage3] Generation error:', error);
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

  const hasTextContent = !!(textOutput && textOutput.hero?.headline);

  return (
    <Card className="p-5 bg-card/50 border-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
            <Code className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold">Stage 3: HTML Website</h3>
            <p className="text-xs text-muted-foreground">Production-ready HTML from Text Content</p>
          </div>
        </div>
        <Badge variant="outline" className="text-purple-400 border-purple-400/50">Step 3</Badge>
      </div>

      {/* Data Source Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
          {hasTextContent ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
          <span className="text-xs">
            Text Content: {hasTextContent ? 'Ready' : 'Missing (Required)'}
          </span>
        </div>
        <PromptIndicator
          prompt={promptProfile}
          onClick={() => setShowPromptModal(true)}
          label="HTML Prompt"
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
          disabled={isGenerating || !hasTextContent}
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

      {/* Prompt Modal */}
      <PromptSettingsModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        type="landing_page"
        defaultTitle="HTML Builder Prompt"
        defaultPrompt={DEFAULT_HTML_PROMPT}
        language={audienceTargeting.language.split('-')[0] || 'ar'}
        market={audienceTargeting.targetMarket || 'gcc'}
        onSaved={() => loadPromptProfile()}
      />
    </Card>
  );
};
