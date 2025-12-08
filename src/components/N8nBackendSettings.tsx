import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Webhook, 
  Bot, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Copy, 
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface N8nBackendSettingsProps {
  userSettings?: {
    use_n8n_backend?: boolean;
    ai_operator_enabled?: boolean;
    preferences?: {
      n8n_api_key?: string;
      stage_webhooks?: Record<string, StageWebhookConfig>;
    };
  } | null;
  onSettingsUpdate?: () => void;
}

interface StageWebhookConfig {
  enabled: boolean;
  webhook_url: string;
}

const PIPELINE_STAGES = [
  { 
    id: 0, 
    key: 'product_input', 
    name: 'Product Input',
    description: 'Product name, description, images',
    payload_example: {
      action: 'product_input',
      product_name: 'Sample Product',
      product_description: 'Product description here',
      product_url: 'https://...',
      media_links: ['https://...'],
      language: 'ar-sa',
      market: 'sa',
    }
  },
  { 
    id: 1, 
    key: 'product_content', 
    name: 'Product Content',
    description: 'Marketing angles, scripts',
    payload_example: {
      action: 'generate_marketing_angles',
      product_name: 'Sample Product',
      product_description: 'Product description here',
      product_url: 'https://...',
      prompt: 'Custom prompt...',
      model: 'google/gemini-2.5-flash',
    }
  },
  { 
    id: 2, 
    key: 'image_generation', 
    name: 'Image Generation',
    description: 'Product images & mockups',
    payload_example: {
      action: 'generate_images',
      product_name: 'Sample Product',
      image_types: ['product', 'lifestyle', 'mockup'],
      engine: 'nanobanana',
      count: 6,
    }
  },
  { 
    id: 3, 
    key: 'landing_page', 
    name: 'Landing Page',
    description: 'Sales page content & HTML',
    payload_example: {
      action: 'generate_landing_page',
      product_name: 'Sample Product',
      marketing_content: 'Generated marketing content...',
      language: 'ar',
    }
  },
  { 
    id: 4, 
    key: 'video_script', 
    name: 'Video Script & Audio',
    description: 'Voiceover generation',
    payload_example: {
      action: 'generate_voiceover',
      scripts: [{ text: 'Script text here...', tone: 'engaging' }],
      voice_id: 'EXAVITQu4vr4xnSDxMaL',
      language: 'ar',
    }
  },
  { 
    id: 5, 
    key: 'scene_builder', 
    name: 'Scene Builder',
    description: 'Break script into scenes',
    payload_example: {
      action: 'breakdown_scenes',
      script_id: 'uuid',
      script_text: 'Full script text...',
      scenes_count: 6,
    }
  },
  { 
    id: 6, 
    key: 'video_generation', 
    name: 'Video Generation',
    description: 'AI video for each scene',
    payload_example: {
      action: 'generate_scene_video',
      scenes: [{ id: 'uuid', visual_prompt: 'Prompt...', duration: 5 }],
      engine: 'runway',
    }
  },
  { 
    id: 7, 
    key: 'assembly', 
    name: 'Assembly & Edit',
    description: 'Combine scenes, add audio',
    payload_example: {
      action: 'assemble_video',
      script_id: 'uuid',
      scene_ids: ['uuid1', 'uuid2'],
      include_music: true,
      include_subtitles: true,
    }
  },
  { 
    id: 8, 
    key: 'export', 
    name: 'Export',
    description: 'Multi-format export',
    payload_example: {
      action: 'export_video',
      video_id: 'uuid',
      formats: ['9:16', '16:9', '1:1'],
      quality: 'high',
    }
  },
];

export default function N8nBackendSettings({ userSettings: propSettings, onSettingsUpdate }: N8nBackendSettingsProps) {
  const [useN8nBackend, setUseN8nBackend] = useState(false);
  const [aiOperatorEnabled, setAiOperatorEnabled] = useState(false);
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [webhooks, setWebhooks] = useState<Record<string, StageWebhookConfig>>({});
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({});
  const [testingStage, setTestingStage] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!propSettings);
  const [localSettings, setLocalSettings] = useState(propSettings);

  useEffect(() => {
    if (!propSettings) {
      fetchSettings();
    }
  }, [propSettings]);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_settings')
        .select('use_n8n_backend, ai_operator_enabled, preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setLocalSettings(data as any);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const userSettings = propSettings || localSettings;

  useEffect(() => {
    if (userSettings) {
      setUseN8nBackend(userSettings.use_n8n_backend || false);
      setAiOperatorEnabled(userSettings.ai_operator_enabled || false);
      const prefs = userSettings.preferences as { n8n_api_key?: string; stage_webhooks?: Record<string, StageWebhookConfig> } | undefined;
      setN8nApiKey(prefs?.n8n_api_key || '');
      setWebhooks(prefs?.stage_webhooks || {});
    }
  }, [userSettings]);

  const testWebhook = async (stageId: number) => {
    const stage = PIPELINE_STAGES.find(s => s.id === stageId);
    if (!stage) return;

    const config = webhooks[stage.key];
    const webhookUrl = config?.webhook_url;

    if (!webhookUrl) {
      setTestResults(prev => ({
        ...prev,
        [stageId]: { success: false, message: 'No webhook URL configured' },
      }));
      return;
    }

    setTestingStage(stageId);
    setTestResults(prev => ({ ...prev, [stageId]: { success: false, message: 'Testing...' } }));

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(n8nApiKey && { 'Authorization': `Bearer ${n8nApiKey}` })
        },
        mode: 'no-cors',
        body: JSON.stringify({
          test: true,
          stage: stage.key,
          stage_id: stageId,
          payload: stage.payload_example,
          timestamp: new Date().toISOString(),
        }),
      });

      setTestResults(prev => ({
        ...prev,
        [stageId]: { success: true, message: 'Request sent' },
      }));
      toast.success(`Test request sent to ${stage.name}`);
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [stageId]: { success: false, message: error.message || 'Failed' },
      }));
    } finally {
      setTestingStage(null);
    }
  };

  const toggleStage = (stageId: number) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const updateWebhook = (stageKey: string, updates: Partial<StageWebhookConfig>) => {
    setWebhooks(prev => ({
      ...prev,
      [stageKey]: { ...prev[stageKey], ...updates },
    }));
  };

  const copyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success('Payload copied');
  };

  const saveSettings = async () => {
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPrefs = (existing?.preferences as Record<string, any>) || {};

      const newPrefs = {
        ...currentPrefs,
        n8n_api_key: n8nApiKey,
        stage_webhooks: JSON.parse(JSON.stringify(webhooks)),
      };

      await supabase
        .from('user_settings')
        .update({
          use_n8n_backend: useN8nBackend,
          ai_operator_enabled: aiOperatorEnabled,
          preferences: newPrefs as any
        })
        .eq('user_id', user.id);

      toast.success('Settings saved');
      onSettingsUpdate?.();
      await fetchSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* n8n Backend Mode Header */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Webhook className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-foreground">n8n Backend Mode</CardTitle>
              <CardDescription className="text-muted-foreground">
                Route each pipeline stage through its own n8n webhook
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-foreground">Enable n8n Backend</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, pipeline stages will call their configured webhooks
              </p>
            </div>
            <Switch
              checked={useN8nBackend}
              onCheckedChange={setUseN8nBackend}
            />
          </div>

          {useN8nBackend && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label className="text-foreground">n8n API Key (Optional)</Label>
                <Input
                  type="password"
                  value={n8nApiKey}
                  onChange={(e) => setN8nApiKey(e.target.value)}
                  placeholder="n8n-xxxxxxxx"
                  className="bg-muted/50 border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Applied to all webhook requests if your n8n requires authentication
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-Stage Webhooks */}
      {useN8nBackend && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Zap className="h-5 w-5 text-primary" />
              Per-Stage Webhooks
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure a separate webhook URL for each pipeline stage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PIPELINE_STAGES.map((stage) => {
              const config = webhooks[stage.key] || { enabled: false, webhook_url: '' };
              const isExpanded = expandedStages[stage.id];
              const result = testResults[stage.id];

              return (
                <div
                  key={stage.id}
                  className={`border rounded-lg overflow-hidden transition-colors ${
                    config.enabled ? 'border-primary/50 bg-primary/5' : 'border-border/50'
                  }`}
                >
                  {/* Stage Header */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                    onClick={() => toggleStage(stage.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={config.enabled ? 'default' : 'outline'} className="w-8 justify-center">
                        {stage.id}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm text-foreground">{stage.name}</p>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result && (
                        result.success 
                          ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                          : <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(enabled) => {
                          updateWebhook(stage.key, { enabled });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Expanded Configuration */}
                  {isExpanded && (
                    <div className="p-4 border-t border-border/50 space-y-4">
                      <Tabs defaultValue="config" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-muted">
                          <TabsTrigger value="config">Configuration</TabsTrigger>
                          <TabsTrigger value="payload">Payload Preview</TabsTrigger>
                        </TabsList>

                        <TabsContent value="config" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label className="text-foreground">Webhook URL</Label>
                            <Input
                              placeholder={`https://n8n.example.com/webhook/${stage.key}`}
                              value={config.webhook_url || ''}
                              onChange={(e) => updateWebhook(stage.key, { webhook_url: e.target.value })}
                              className="bg-muted/50 border-border"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testWebhook(stage.id)}
                              disabled={testingStage === stage.id || !config.webhook_url}
                              className="border-border"
                            >
                              {testingStage === stage.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Play className="h-4 w-4 mr-1" />
                              )}
                              Test
                            </Button>
                            {result && (
                              <span className={`text-xs ${result.success ? 'text-emerald-500' : 'text-destructive'}`}>
                                {result.message}
                              </span>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="payload" className="mt-4">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => copyPayload(stage.payload_example)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <pre className="p-3 bg-background rounded-lg text-xs text-muted-foreground overflow-x-auto">
                              <code>{JSON.stringify(stage.payload_example, null, 2)}</code>
                            </pre>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Payload structure sent when this stage executes
                          </p>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* AI Operator Agent */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-foreground">AI Operator Agent</CardTitle>
              <CardDescription className="text-muted-foreground">
                Autonomous background process for pipeline optimization
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-foreground">Enable AI Operator</Label>
              <p className="text-xs text-muted-foreground">
                Automatically monitors and optimizes your video generation pipeline
              </p>
            </div>
            <Switch
              checked={aiOperatorEnabled}
              onCheckedChange={setAiOperatorEnabled}
            />
          </div>

          {aiOperatorEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-border">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Auto-Retry</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically retries failed scene generations
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-medium text-foreground">Engine Switching</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Switches to alternative engines on repeated failures
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">Quality Check</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Uses AI vision to detect low-quality outputs
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Cost Optimization</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically routes to cheaper engines when possible
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={saveSettings}
        disabled={isSaving}
        className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Backend Settings
          </>
        )}
      </Button>
    </div>
  );
}
