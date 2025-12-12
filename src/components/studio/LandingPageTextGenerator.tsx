/**
 * Stage 2: Landing Page Text Content Generator
 * Consumes: Product Input + Marketing Angles Output
 * Produces: Structured text content (hero, benefits, features, faq, reviews)
 */
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Database,
  Bug,
  Copy,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePromptProfiles, PromptProfile } from '@/hooks/usePromptProfiles';
import { usePipelineOutputs, MarketingAnglesOutput, LandingPageTextOutput } from '@/hooks/usePipelineOutputs';
import { PromptSettingsModal } from '@/components/studio/PromptSettingsModal';
import { PromptIndicator } from '@/components/studio/PromptIndicator';
import { useAIAgent, getModelName } from '@/hooks/useAIAgent';
import { useBackendMode } from '@/hooks/useBackendMode';

interface LandingPageTextGeneratorProps {
  projectId: string;
  productInfo: {
    name: string;
    description: string;
    url?: string;
  };
  audienceTargeting: {
    targetMarket: string;
    language: string;
    audienceAge: string;
    audienceGender: string;
  };
  onGenerated?: (output: LandingPageTextOutput) => void;
}

const DEFAULT_TEXT_PROMPT = `You are a landing page copywriter for Arabic COD eCommerce.

PRODUCT:
- Name: {{product_name}}
- Description: {{product_description}}

MARKETING INTELLIGENCE (from previous analysis):
- Problems: {{problems}}
- Desires: {{desires}}
- Emotional Triggers: {{emotional_triggers}}
- Marketing Angles: {{angles}}

AUDIENCE:
- Market: {{market}}
- Language: {{language}}
- Age: {{audience_age}}
- Gender: {{audience_gender}}

Generate STRUCTURED landing page text content in JSON format:
{
  "hero": {
    "headline": "Strong benefit-driven headline in Arabic",
    "subheadline": "Supporting value proposition"
  },
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4"],
  "features": [
    {"title": "Feature 1", "description": "Description"},
    {"title": "Feature 2", "description": "Description"}
  ],
  "usage_steps": ["Step 1", "Step 2", "Step 3"],
  "technical_details": ["Detail 1", "Detail 2"],
  "faq": [
    {"question": "Question?", "answer": "Answer"},
    {"question": "Question?", "answer": "Answer"}
  ],
  "reviews": [
    {"name": "Customer Name", "rating": 5, "text": "Review text"}
  ]
}

CRITICAL RULES:
- ALL content in Arabic (Saudi dialect)
- Derive benefits from marketing angles - do NOT invent
- 10 realistic customer reviews with Saudi names
- Mobile-first, scannable content
- Return ONLY valid JSON, no explanations`;

export const LandingPageTextGenerator = ({
  projectId,
  productInfo,
  audienceTargeting,
  onGenerated
}: LandingPageTextGeneratorProps) => {
  const { toast } = useToast();
  const { aiAgent } = useAIAgent();
  const { n8nEnabled: useN8nBackend } = useBackendMode();
  const { getActivePrompt, getPromptForExecution, debugMode, setDebugMode } = usePromptProfiles();
  const { 
    getMarketingAnglesOutput, 
    saveLandingPageTextOutput,
    getLandingPageTextOutput 
  } = usePipelineOutputs();

  const [isGenerating, setIsGenerating] = useState(false);
  const [marketingAngles, setMarketingAngles] = useState<MarketingAnglesOutput | null>(null);
  const [textOutput, setTextOutput] = useState<LandingPageTextOutput | null>(null);
  const [promptProfile, setPromptProfile] = useState<PromptProfile | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [lastUsedPromptDebug, setLastUsedPromptDebug] = useState<{ id: string; hash: string; version: number } | null>(null);

  // Load marketing angles from Stage 1
  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    if (!projectId) return;

    // Load Stage 1 output (required)
    const angles = await getMarketingAnglesOutput(projectId);
    setMarketingAngles(angles);

    // Load existing Stage 2 output if any
    const existingText = await getLandingPageTextOutput(projectId);
    if (existingText) setTextOutput(existingText);

    // Load prompt profile
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

    return template
      .replace(/\{\{product_name\}\}/g, productInfo.name)
      .replace(/\{\{product_description\}\}/g, productInfo.description)
      .replace(/\{\{problems\}\}/g, problems)
      .replace(/\{\{desires\}\}/g, desires)
      .replace(/\{\{emotional_triggers\}\}/g, emotional)
      .replace(/\{\{angles\}\}/g, angles)
      .replace(/\{\{market\}\}/g, audienceTargeting.targetMarket)
      .replace(/\{\{language\}\}/g, audienceTargeting.language)
      .replace(/\{\{audience_age\}\}/g, audienceTargeting.audienceAge)
      .replace(/\{\{audience_gender\}\}/g, audienceTargeting.audienceGender);
  };

  const generateTextContent = async () => {
    // BLOCK if Stage 1 not complete
    if (!marketingAngles) {
      toast({
        title: "Marketing Angles Required",
        description: "Please generate Marketing Angles first. Stage 2 depends on Stage 1 output.",
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
          description: "Please configure the Landing Page Text prompt in Prompt Settings.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      const { prompt: activePrompt, debugInfo } = promptResult;
      setLastUsedPromptDebug(debugInfo);

      // Use custom prompt or default
      const finalPrompt = buildPrompt(activePrompt.prompt_text || DEFAULT_TEXT_PROMPT);

      if (debugMode) {
        console.log('[Stage2] Using prompt:', {
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

      let content = response.data?.response || response.data?.content || '';
      
      // Parse JSON from response
      let parsed: LandingPageTextOutput;
      try {
        // Extract JSON from markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/```\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        // Try parsing the entire content as JSON
        try {
          parsed = JSON.parse(content);
        } catch (e2) {
          // Create default structure if parsing fails
          parsed = {
            hero: { headline: 'عنوان المنتج', subheadline: 'وصف مختصر' },
            benefits: [],
            features: [],
            usage_steps: [],
            technical_details: [],
            faq: [],
            reviews: [],
            generated_at: new Date().toISOString(),
            prompt_id: debugInfo.id,
            prompt_hash: debugInfo.hash
          };
          console.warn('[Stage2] Failed to parse JSON, using defaults');
        }
      }

      // Add metadata
      parsed.generated_at = new Date().toISOString();
      parsed.prompt_id = debugInfo.id;
      parsed.prompt_hash = debugInfo.hash;

      // Save to database
      await saveLandingPageTextOutput(projectId, parsed);
      setTextOutput(parsed);
      onGenerated?.(parsed);

      toast({
        title: "Landing Page Text Generated",
        description: `Structured content saved (Prompt v${debugInfo.version})`,
      });
    } catch (error: any) {
      console.error('[Stage2] Generation error:', error);
      toast({
        title: "Generation Error",
        description: error.message || "Failed to generate text content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyOutput = () => {
    if (textOutput) {
      navigator.clipboard.writeText(JSON.stringify(textOutput, null, 2));
      toast({ title: "Copied", description: "JSON copied to clipboard" });
    }
  };

  const hasAngles = !!(marketingAngles && (marketingAngles.problems?.length > 0 || marketingAngles.angles?.length > 0));

  return (
    <Card className="p-5 bg-card/50 border-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold">Stage 2: Landing Page Text</h3>
            <p className="text-xs text-muted-foreground">Structured content from Marketing Angles</p>
          </div>
        </div>
        <Badge variant="outline" className="text-blue-400 border-blue-400/50">Step 2</Badge>
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
          label="Text Prompt"
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
      <div className="flex items-center gap-3">
        <Button
          onClick={generateTextContent}
          disabled={isGenerating || !hasAngles}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Text Content
            </>
          )}
        </Button>

        {textOutput && (
          <>
            <Button variant="ghost" size="icon" onClick={copyOutput}>
              <Copy className="w-4 h-4" />
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

      {/* Output Preview */}
      {textOutput && (
        <ScrollArea className="h-48 rounded-lg bg-slate-900/50 border border-border p-3">
          <div className="space-y-2 text-sm" dir="rtl">
            <div>
              <span className="text-primary font-medium">Hero:</span>
              <p className="text-foreground">{textOutput.hero?.headline}</p>
              <p className="text-muted-foreground text-xs">{textOutput.hero?.subheadline}</p>
            </div>
            <div>
              <span className="text-primary font-medium">Benefits:</span>
              <ul className="list-disc list-inside text-xs text-muted-foreground">
                {textOutput.benefits?.slice(0, 3).map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
            <div>
              <span className="text-primary font-medium">Features:</span> {textOutput.features?.length || 0}
            </div>
            <div>
              <span className="text-primary font-medium">Reviews:</span> {textOutput.reviews?.length || 0}
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Prompt Modal */}
      <PromptSettingsModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        type="landing_page"
        defaultTitle="Landing Page Text Prompt"
        defaultPrompt={DEFAULT_TEXT_PROMPT}
        language={audienceTargeting.language.split('-')[0] || 'ar'}
        market={audienceTargeting.targetMarket || 'gcc'}
        onSaved={() => loadPromptProfile()}
      />
    </Card>
  );
};
