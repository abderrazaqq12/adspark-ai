import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Webhook, 
  Bot, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Copy, 
  ExternalLink,
  Zap,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface N8nBackendSettingsProps {
  userSettings: {
    use_n8n_backend?: boolean;
    ai_operator_enabled?: boolean;
    preferences?: {
      n8n_webhook_url?: string;
      n8n_api_key?: string;
    };
  } | null;
  onSettingsUpdate: () => void;
}

export default function N8nBackendSettings({ userSettings, onSettingsUpdate }: N8nBackendSettingsProps) {
  const [useN8nBackend, setUseN8nBackend] = useState(false);
  const [aiOperatorEnabled, setAiOperatorEnabled] = useState(false);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setUseN8nBackend(userSettings.use_n8n_backend || false);
      setAiOperatorEnabled(userSettings.ai_operator_enabled || false);
      setN8nWebhookUrl(userSettings.preferences?.n8n_webhook_url || '');
      setN8nApiKey(userSettings.preferences?.n8n_api_key || '');
    }
  }, [userSettings]);

  const testConnection = async () => {
    if (!n8nWebhookUrl) {
      toast.error('Please enter your n8n webhook URL');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(n8nApiKey && { 'Authorization': `Bearer ${n8nApiKey}` })
        },
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'test_connection',
          timestamp: new Date().toISOString(),
          source: 'flowscale_ai'
        }),
      });

      // With no-cors, we can't read response, but request was sent
      setConnectionStatus('success');
      toast.success('Test request sent to n8n. Check your workflow history.');
    } catch (error: any) {
      setConnectionStatus('error');
      toast.error('Failed to connect to n8n webhook');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({
          use_n8n_backend: useN8nBackend,
          ai_operator_enabled: aiOperatorEnabled,
          preferences: {
            ...userSettings?.preferences,
            n8n_webhook_url: n8nWebhookUrl,
            n8n_api_key: n8nApiKey
          }
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Settings saved');
      onSettingsUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const copyWebhookExample = () => {
    navigator.clipboard.writeText('https://your-n8n-instance.app.n8n.cloud/webhook/flowscale');
    toast.success('Example URL copied');
  };

  return (
    <div className="space-y-6">
      {/* n8n Backend Mode */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Webhook className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-foreground">n8n Backend Mode</CardTitle>
              <CardDescription className="text-muted-foreground">
                Route all generation steps through your n8n workflows
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-foreground">Enable n8n Backend</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, all video generation calls will be routed to your n8n webhook
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
                <Label className="text-foreground">n8n Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={n8nWebhookUrl}
                    onChange={(e) => setN8nWebhookUrl(e.target.value)}
                    placeholder="https://your-n8n-instance.app.n8n.cloud/webhook/flowscale"
                    className="bg-muted/50 border-border"
                  />
                  <Button variant="outline" size="icon" onClick={copyWebhookExample}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your n8n webhook endpoint that will receive generation requests
                </p>
              </div>

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
                  If your webhook requires authentication
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={testConnection}
                  disabled={isTestingConnection || !n8nWebhookUrl}
                  className="border-border"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>

                {connectionStatus === 'success' && (
                  <Badge className="bg-primary/20 text-primary border-0">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Request Sent
                  </Badge>
                )}

                {connectionStatus === 'error' && (
                  <Badge className="bg-destructive/20 text-destructive border-0">
                    <XCircle className="w-3 h-3 mr-1" />
                    Connection Failed
                  </Badge>
                )}
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Webhook Payload:</strong> Your n8n workflow will receive:
                </p>
                <pre className="text-xs text-muted-foreground overflow-x-auto">
{`{
  "action": "generate_video" | "breakdown_scenes" | "generate_voiceover" | "assemble_video",
  "project_id": "uuid",
  "scene_id": "uuid",
  "prompt": "...",
  "engine": "HeyGen" | "Runway" | "Pika" | ...
}`}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            <CheckCircle className="w-4 h-4 mr-2" />
            Save Backend Settings
          </>
        )}
      </Button>
    </div>
  );
}
