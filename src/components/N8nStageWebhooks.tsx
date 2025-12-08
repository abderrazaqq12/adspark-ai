import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Webhook, 
  Save, 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  Code
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StageWebhookConfig {
  enabled: boolean;
  webhook_url: string;
  custom_payload?: Record<string, any>;
  on_success_action?: string;
  on_failure_action?: string;
}

interface N8nStageWebhooksProps {
  onSave?: () => void;
}

const PIPELINE_STAGES = [
  { 
    id: 0, 
    key: 'product_input', 
    name: 'Product Input',
    description: 'Product name, description, images',
    payload_example: {
      product_name: 'Sample Product',
      product_description: 'Product description here',
      product_url: 'https://...',
      product_image: 'https://...',
      language: 'en',
      market: 'us',
    }
  },
  { 
    id: 1, 
    key: 'product_content', 
    name: 'Product Content',
    description: 'Marketing angles, scripts',
    payload_example: {
      product_name: 'Sample Product',
      product_description: 'Product description here',
      language: 'ar',
      market: 'saudi',
      generate_types: ['angles', 'scripts', 'hooks'],
    }
  },
  { 
    id: 2, 
    key: 'image_generation', 
    name: 'Image Generation',
    description: 'Product images & mockups',
    payload_example: {
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
      product_name: 'Sample Product',
      marketing_content: 'Generated marketing content...',
      language: 'ar',
      generate_html: true,
    }
  },
  { 
    id: 4, 
    key: 'video_script', 
    name: 'Video Script & Audio',
    description: 'Voiceover generation',
    payload_example: {
      scripts: [{ text: 'Script text here...', tone: 'engaging' }],
      voice_id: 'EXAVITQu4vr4xnSDxMaL',
      voice_model: 'eleven_multilingual_v2',
      language: 'en',
    }
  },
  { 
    id: 5, 
    key: 'scene_builder', 
    name: 'Scene Builder',
    description: 'Break script into scenes',
    payload_example: {
      script_id: 'uuid',
      script_text: 'Full script text...',
      scenes_count: 6,
      scene_types: ['hook', 'problem', 'solution', 'cta'],
    }
  },
  { 
    id: 6, 
    key: 'video_generation', 
    name: 'Video Generation',
    description: 'AI video for each scene',
    payload_example: {
      scenes: [{ id: 'uuid', visual_prompt: 'Prompt...', duration: 5 }],
      engine: 'runway',
      quality: 'high',
    }
  },
  { 
    id: 7, 
    key: 'assembly', 
    name: 'Assembly & Edit',
    description: 'Combine scenes, add audio',
    payload_example: {
      script_id: 'uuid',
      scene_ids: ['uuid1', 'uuid2'],
      include_music: true,
      include_subtitles: true,
      transitions: 'mixed',
      output_format: 'mp4',
    }
  },
  { 
    id: 8, 
    key: 'export', 
    name: 'Export',
    description: 'Multi-format export',
    payload_example: {
      video_id: 'uuid',
      formats: ['9:16', '16:9', '1:1'],
      quality: 'high',
      watermark: false,
    }
  },
];

export function N8nStageWebhooks({ onSave }: N8nStageWebhooksProps) {
  const [webhooks, setWebhooks] = useState<Record<string, StageWebhookConfig>>({});
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({});
  const [testingStage, setTestingStage] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [globalWebhookBase, setGlobalWebhookBase] = useState('');
  const [useGlobalBase, setUseGlobalBase] = useState(true);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', session.user.id)
        .single();

      if (settings?.preferences) {
        const prefs = settings.preferences as Record<string, any>;
        setWebhooks(prefs.stage_webhooks || {});
        setGlobalWebhookBase(prefs.n8n_webhook_url || '');
        setUseGlobalBase(prefs.use_global_webhook_base !== false);
      }
    } catch (error) {
      console.error('Error loading webhooks:', error);
    }
  };

  const saveWebhooks = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', session.user.id)
        .single();

      const currentPrefs = (existing?.preferences as Record<string, any>) || {};

      const newPrefs = {
        ...currentPrefs,
        stage_webhooks: webhooks as any,
        n8n_webhook_url: globalWebhookBase,
        use_global_webhook_base: useGlobalBase,
      };

      await supabase
        .from('user_settings')
        .update({
          preferences: newPrefs as any,
        })
        .eq('user_id', session.user.id);

      toast.success('Webhook settings saved');
      onSave?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save webhooks');
    } finally {
      setIsSaving(false);
    }
  };

  const testWebhook = async (stageId: number) => {
    const stage = PIPELINE_STAGES.find(s => s.id === stageId);
    if (!stage) return;

    const config = webhooks[stage.key];
    const webhookUrl = config?.webhook_url || (useGlobalBase ? `${globalWebhookBase}/stage-${stageId}` : '');

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
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        [stageId]: { success: true, message: 'Request sent successfully' },
      }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [stageId]: { success: false, message: error.message || 'Connection failed' },
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
    toast.success('Payload copied to clipboard');
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          Per-Stage n8n Webhooks
        </CardTitle>
        <CardDescription>
          Configure webhooks for each pipeline stage to trigger n8n workflows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Base URL */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Use Global Webhook Base
            </Label>
            <Switch
              checked={useGlobalBase}
              onCheckedChange={setUseGlobalBase}
            />
          </div>
          {useGlobalBase && (
            <div className="space-y-2">
              <Input
                placeholder="https://your-n8n.app.n8n.cloud/webhook"
                value={globalWebhookBase}
                onChange={(e) => setGlobalWebhookBase(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Each stage will append /stage-0, /stage-1, etc. to this base URL
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Stage Configurations */}
        <div className="space-y-2">
          {PIPELINE_STAGES.map((stage) => {
            const config = webhooks[stage.key] || { enabled: false, webhook_url: '' };
            const isExpanded = expandedStages[stage.id];
            const result = testResults[stage.id];
            const effectiveUrl = config.webhook_url || (useGlobalBase ? `${globalWebhookBase}/stage-${stage.id}` : '');

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
                      <p className="font-medium text-sm">{stage.name}</p>
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
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="config">Configuration</TabsTrigger>
                        <TabsTrigger value="payload">Payload Preview</TabsTrigger>
                      </TabsList>

                      <TabsContent value="config" className="space-y-4 mt-4">
                        {!useGlobalBase && (
                          <div className="space-y-2">
                            <Label>Webhook URL</Label>
                            <Input
                              placeholder="https://your-n8n-url/webhook/stage-name"
                              value={config.webhook_url}
                              onChange={(e) => updateWebhook(stage.key, { webhook_url: e.target.value })}
                            />
                          </div>
                        )}

                        {useGlobalBase && (
                          <div className="p-2 bg-muted/50 rounded text-sm">
                            <span className="text-muted-foreground">URL: </span>
                            <code className="text-primary">{effectiveUrl || 'Not configured'}</code>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testWebhook(stage.id)}
                            disabled={testingStage === stage.id || !effectiveUrl}
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
                          <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 overflow-x-auto">
                            <code>{JSON.stringify(stage.payload_example, null, 2)}</code>
                          </pre>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          This is the payload structure sent when this stage executes
                        </p>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <Button onClick={saveWebhooks} disabled={isSaving} className="w-full">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Webhook Settings
        </Button>
      </CardContent>
    </Card>
  );
}
