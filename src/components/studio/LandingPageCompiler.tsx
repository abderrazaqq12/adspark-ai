/**
 * Unified Landing Page Compiler
 * ONE intelligence, MULTIPLE execution adapters
 * Uses unified generation system with execution mode selector
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
  Bug,
  RefreshCw,
  Settings2,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePromptProfiles, PromptProfile } from '@/hooks/usePromptProfiles';
import { usePipelineOutputs, MarketingAnglesOutput } from '@/hooks/usePipelineOutputs';
import { PromptSettingsModal } from '@/components/studio/PromptSettingsModal';
import { PromptIndicator } from '@/components/studio/PromptIndicator';
import { ExecutionModeSelector } from '@/components/ExecutionModeSelector';
import { executeUnified, ExecutionMode } from '@/lib/unified-generation/executor';
import { UnifiedInput, UnifiedOutput } from '@/lib/unified-generation/types';
import { UNIFIED_LANDING_PAGE_PROMPT } from '@/lib/unified-generation/prompts';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

export const LandingPageCompiler = ({
  projectId,
  productInfo,
  audienceTargeting,
  onGenerated
}: LandingPageCompilerProps) => {
  const { toast } = useToast();
  const { getActivePrompt, getPromptForExecution, debugMode, setDebugMode } = usePromptProfiles();
  const { getMarketingAnglesOutput, saveLandingPageHtmlOutput, getLandingPageHtmlOutput } = usePipelineOutputs();

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [marketingAngles, setMarketingAngles] = useState<MarketingAnglesOutput | null>(null);
  const [htmlOutput, setHtmlOutput] = useState<string>('');
  const [sectionsOutput, setSectionsOutput] = useState<UnifiedOutput['sections'] | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [promptProfile, setPromptProfile] = useState<PromptProfile | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Execution mode state
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('agent');
  const [webhookUrl, setWebhookUrl] = useState('');
  
  // Debug state
  const [lastResult, setLastResult] = useState<UnifiedOutput | null>(null);

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
    setLastResult(null);

    try {
      const language = audienceTargeting.language.split('-')[0] || 'ar';
      const market = audienceTargeting.targetMarket || 'gcc';

      // Get custom prompt from database if available
      const promptResult = await getPromptForExecution('landing_page' as any, language, market);
      const customPrompt = promptResult?.prompt?.prompt_text;

      // Build unified input
      const input: UnifiedInput = {
        product: {
          title: productInfo.name,
          description: productInfo.description,
          media: productInfo.mediaLinks || []
        },
        marketingAngles: marketingAngles.angles?.map(a => a.hook) || [],
        promptId: promptResult?.prompt?.id || 'landing-page-default',
        locale: audienceTargeting.language,
        executionMode,
        webhookUrl: executionMode === 'n8n' ? webhookUrl : undefined
      };

      if (debugMode) {
        console.log('[LandingPageCompiler] Unified input:', input);
        console.log('[LandingPageCompiler] Execution mode:', executionMode);
      }

      // Execute using unified system
      const result = await executeUnified(input, customPrompt);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Generation failed');
      }

      const output = result.data;
      setLastResult(output);

      if (!output.html) {
        throw new Error('No HTML output received from AI');
      }

      // Save to database
      await saveLandingPageHtmlOutput(projectId, output.html, {
        prompt_id: input.promptId,
        prompt_hash: output.meta.promptVersion.toString()
      });
      
      setHtmlOutput(output.html);
      setSectionsOutput(output.sections);
      setViewMode('preview');
      onGenerated?.(output.html);

      toast({
        title: "Landing Page Generated",
        description: `Compiled via ${output.meta.engine.toUpperCase()} in ${output.meta.latencyMs}ms`,
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
            <p className="text-xs text-muted-foreground">Unified generation with multiple execution modes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExecutionModeSelector
            value={executionMode}
            onChange={setExecutionMode}
            compact
          />
          <Badge variant="outline" className="text-primary border-primary/50">
            {executionMode === 'agent' ? 'AI Agent' : executionMode === 'n8n' ? 'n8n' : 'Edge API'}
          </Badge>
        </div>
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

      {/* Settings Panel */}
      <Collapsible open={showSettings} onOpenChange={setShowSettings}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Execution Settings
            </span>
            <Badge variant="secondary" className="text-xs">
              {executionMode === 'agent' ? 'Default' : executionMode.toUpperCase()}
            </Badge>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <ExecutionModeSelector
              value={executionMode}
              onChange={setExecutionMode}
              webhookUrl={webhookUrl}
              onWebhookUrlChange={setWebhookUrl}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Debug Panel */}
      {debugMode && lastResult && (
        <div className="p-3 rounded-lg bg-slate-900/50 border border-border space-y-2">
          <p className="text-xs font-mono text-muted-foreground">
            Engine: {lastResult.meta.engine} | Latency: {lastResult.meta.latencyMs}ms | v{lastResult.meta.promptVersion}
          </p>
          {lastResult.marketingAngles && (
            <p className="text-xs text-muted-foreground">
              Pain Points: {lastResult.marketingAngles.painPoints.length} | 
              Desires: {lastResult.marketingAngles.desires.length}
            </p>
          )}
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
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Landing Page
            </>
          )}
        </Button>

        {/* Google AI Studio Link */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.open('https://aistudio.google.com/prompts/new_chat', '_blank')}
        >
          <ExternalLink className="w-4 h-4" />
          Open Google AI Studio
        </Button>

        {htmlOutput && (
          <>
            <Button variant="ghost" size="icon" onClick={copyHtml} title="Copy HTML">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={downloadHtml} title="Download HTML">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={generateHtml} disabled={isGenerating} title="Regenerate">
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugMode(!debugMode)}
              className="gap-1 text-xs"
            >
              <Bug className="w-3 h-3" />
              {debugMode ? 'Hide Debug' : 'Debug'}
            </Button>
          </>
        )}
      </div>

      {/* View Mode Toggle */}
      {htmlOutput && (
        <div className="flex items-center bg-muted/30 rounded-lg p-1 border border-border w-fit">
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
          className="min-h-[300px] bg-muted/30 border-border text-xs font-mono"
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
          <p className="text-sm">Click "Generate Landing Page" to compile HTML</p>
          <p className="text-xs mt-1">Requires Marketing Angles from previous stage</p>
        </div>
      )}

      {/* Prompt Settings Modal */}
      <PromptSettingsModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        type="landing_page"
        language={audienceTargeting.language.split('-')[0] || 'ar'}
        market={audienceTargeting.targetMarket || 'gcc'}
        defaultPrompt={UNIFIED_LANDING_PAGE_PROMPT}
        defaultTitle="Landing Page Compiler"
        onSaved={loadPromptProfile}
      />
    </Card>
  );
};
