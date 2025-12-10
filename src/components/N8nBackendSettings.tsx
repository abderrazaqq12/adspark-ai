import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Save,
  Globe,
  Settings2,
  Brain,
  Link,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBackendMode, BackendMode } from "@/hooks/useBackendMode";
import { cn } from "@/lib/utils";

interface N8nBackendSettingsProps {
  userSettings?: {
    use_n8n_backend?: boolean;
    ai_operator_enabled?: boolean;
    preferences?: {
      n8n_api_key?: string;
      n8n_webhook_url?: string;
      webhook_mode?: 'global' | 'per-stage';
      stage_webhooks?: Record<string, StageWebhookConfig>;
    };
  } | null;
  onSettingsUpdate?: () => void;
}

interface StageWebhookConfig {
  enabled: boolean;
  webhook_url: string;
}

const BACKEND_MODES = [
  {
    id: 'auto' as BackendMode,
    name: 'Auto (AI Brain)',
    description: 'AI Brain automatically selects optimal backend',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'ai-operator' as BackendMode,
    name: 'AI Agent Operator',
    description: 'Autonomous agent monitors & optimizes pipeline',
    icon: Bot,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'n8n' as BackendMode,
    name: 'n8n Webhooks',
    description: 'Route all operations through n8n workflows',
    icon: Link,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
];

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
  const { mode, setMode, isLoading: modeLoading } = useBackendMode();
  
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [globalWebhookUrl, setGlobalWebhookUrl] = useState('');
  const [webhookMode, setWebhookMode] = useState<'global' | 'per-stage'>('global');
  const [webhooks, setWebhooks] = useState<Record<string, StageWebhookConfig>>({});
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({});
  const [testingStage, setTestingStage] = useState<number | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [testingGlobal, setTestingGlobal] = useState(false);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string }>>({});
  const [globalTestResult, setGlobalTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!propSettings);
  const [localSettings, setLocalSettings] = useState(propSettings);
  const [showApiKey, setShowApiKey] = useState(false);

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
      const prefs = userSettings.preferences as { 
        n8n_api_key?: string; 
        n8n_webhook_url?: string;
        webhook_mode?: 'global' | 'per-stage';
        stage_webhooks?: Record<string, StageWebhookConfig>;
      } | undefined;
      setN8nApiKey(prefs?.n8n_api_key || '');
      setGlobalWebhookUrl(prefs?.n8n_webhook_url || '');
      setWebhookMode(prefs?.webhook_mode || 'global');
      setWebhooks(prefs?.stage_webhooks || {});
    }
  }, [userSettings]);

  const testGlobalWebhook = async () => {
    if (!globalWebhookUrl) {
      setGlobalTestResult({ success: false, message: 'No webhook URL configured' });
      return;
    }

    setTestingGlobal(true);
    setGlobalTestResult({ success: false, message: 'Testing...' });

    try {
      await fetch(globalWebhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(n8nApiKey && { 'Authorization': `Bearer ${n8nApiKey}` })
        },
        mode: 'no-cors',
        body: JSON.stringify({
          test: true,
          source: 'VideoAI Platform',
          timestamp: new Date().toISOString(),
        }),
      });

      setGlobalTestResult({ success: true, message: 'Request sent' });
      toast.success('Test request sent to n8n webhook');
    } catch (error: any) {
      setGlobalTestResult({ success: false, message: error.message || 'Failed' });
    } finally {
      setTestingGlobal(false);
    }
  };

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

  const testAllWebhooks = async () => {
    setTestingAll(true);
    setTestResults({});

    const enabledStages = PIPELINE_STAGES.filter(stage => {
      const config = webhooks[stage.key];
      return config?.enabled && config?.webhook_url;
    });

    for (const stage of enabledStages) {
      await testWebhook(stage.id);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setTestingAll(false);
    toast.success(`Tested ${enabledStages.length} webhooks`);
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
        n8n_webhook_url: globalWebhookUrl,
        webhook_mode: webhookMode,
        stage_webhooks: JSON.parse(JSON.stringify(webhooks)),
        backend_mode: mode,
      };

      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          use_n8n_backend: mode === 'n8n',
          ai_operator_enabled: mode === 'ai-operator',
          preferences: newPrefs as any
        }, { onConflict: 'user_id' });

      toast.success('Backend settings saved');
      onSettingsUpdate?.();
      await fetchSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const currentModeConfig = BACKEND_MODES.find(m => m.id === mode) || BACKEND_MODES[0];

  if (isLoading || modeLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Backend Mode Selector Card */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Backend Mode
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose how your video generation pipeline should process requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as BackendMode)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {BACKEND_MODES.map((backendMode) => {
              const Icon = backendMode.icon;
              const isSelected = mode === backendMode.id;
              return (
                <div
                  key={backendMode.id}
                  className={cn(
                    "relative p-4 rounded-lg border-2 cursor-pointer transition-all",
                    isSelected
                      ? `${backendMode.bgColor} ${backendMode.borderColor}`
                      : "bg-muted/20 border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={backendMode.id} id={backendMode.id} className="sr-only" />
                  <Label htmlFor={backendMode.id} className="cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={cn("w-5 h-5", backendMode.color)} />
                      <span className="font-semibold text-foreground">{backendMode.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{backendMode.description}</p>
                  </Label>
                  {isSelected && (
                    <CheckCircle className={cn("absolute top-3 right-3 w-5 h-5", backendMode.color)} />
                  )}
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* n8n Configuration - Only shown when n8n mode is selected */}
      {mode === 'n8n' && (
        <>
          {/* n8n Connection Settings */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Webhook className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground">n8n Connection</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Configure your n8n webhook connection settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">n8n API Key (Optional)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={n8nApiKey}
                      onChange={(e) => setN8nApiKey(e.target.value)}
                      placeholder="n8n-xxxxxxxx"
                      className="bg-muted/50 border-border pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-9"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied to all webhook requests if your n8n requires authentication
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Mode Selection */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Webhook Configuration
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Choose how to configure webhooks for your pipeline stages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={webhookMode}
                onValueChange={(v) => setWebhookMode(v as 'global' | 'per-stage')}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div
                  className={cn(
                    "relative p-4 rounded-lg border-2 cursor-pointer transition-all",
                    webhookMode === 'global'
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted/20 border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value="global" id="webhook-global" className="sr-only" />
                  <Label htmlFor="webhook-global" className="cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <Globe className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">Global Webhook</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Single webhook URL for all pipeline stages
                    </p>
                  </Label>
                  {webhookMode === 'global' && (
                    <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-primary" />
                  )}
                </div>

                <div
                  className={cn(
                    "relative p-4 rounded-lg border-2 cursor-pointer transition-all",
                    webhookMode === 'per-stage'
                      ? "bg-secondary/10 border-secondary/30"
                      : "bg-muted/20 border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value="per-stage" id="webhook-per-stage" className="sr-only" />
                  <Label htmlFor="webhook-per-stage" className="cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <Settings2 className="w-5 h-5 text-secondary" />
                      <span className="font-semibold text-foreground">Per-Stage Webhooks</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Different webhook URL for each pipeline stage
                    </p>
                  </Label>
                  {webhookMode === 'per-stage' && (
                    <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-secondary" />
                  )}
                </div>
              </RadioGroup>

              {/* Global Webhook Configuration */}
              {webhookMode === 'global' && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label className="text-foreground">Global n8n Webhook URL</Label>
                    <p className="text-xs text-muted-foreground">
                      This URL will receive all pipeline stage events with the stage name in the payload
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://n8n.yourdomain.com/webhook/flowscale"
                        value={globalWebhookUrl}
                        onChange={(e) => setGlobalWebhookUrl(e.target.value)}
                        className="bg-muted/50 border-border font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={testGlobalWebhook}
                        disabled={testingGlobal || !globalWebhookUrl}
                        className="border-border"
                      >
                        {testingGlobal ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span className="ml-2">Test</span>
                      </Button>
                    </div>
                    {globalTestResult && (
                      <div className={cn(
                        "flex items-center gap-2 text-sm",
                        globalTestResult.success ? "text-emerald-500" : "text-destructive"
                      )}>
                        {globalTestResult.success ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span>{globalTestResult.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <Label className="text-sm mb-2 block">Payload Structure</Label>
                    <pre className="text-xs text-muted-foreground font-mono bg-background p-3 rounded overflow-x-auto">
{`{
  "action": "stage_name",  // e.g., "product_content"
  "stage_id": 1,
  "product_name": "...",
  "product_description": "...",
  // ... stage-specific data
}`}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-Stage Webhooks - Only shown when per-stage mode is selected */}
          {webhookMode === 'per-stage' && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Zap className="h-5 w-5 text-primary" />
                      Per-Stage Webhooks
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Configure a separate webhook URL for each pipeline stage
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testAllWebhooks}
                    disabled={testingAll}
                    className="border-border"
                  >
                    {testingAll ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    Test All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {PIPELINE_STAGES.map((stage) => {
                  const config = webhooks[stage.key] || { enabled: false, webhook_url: '' };
                  const isExpanded = expandedStages[stage.id];
                  const result = testResults[stage.id];

                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        "border rounded-lg overflow-hidden transition-colors",
                        config.enabled ? 'border-primary/50 bg-primary/5' : 'border-border/50'
                      )}
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
                                  <span className={cn(
                                    "text-xs",
                                    result.success ? 'text-emerald-500' : 'text-destructive'
                                  )}>
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
        </>
      )}

      {/* AI Operator Agent - Only shown when AI Operator mode is selected */}
      {mode === 'ai-operator' && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-500" />
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-foreground">AI Operator is active and monitoring your pipeline</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          </CardContent>
        </Card>
      )}

      {/* Auto Mode Info - Only shown when Auto mode is selected */}
      {mode === 'auto' && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-foreground">AI Brain Mode</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Intelligent automatic backend selection
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <CheckCircle className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-foreground">
                AI Brain automatically selects the optimal backend for each operation using Lovable AI
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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