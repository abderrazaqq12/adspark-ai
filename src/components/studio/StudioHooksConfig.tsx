import { useState, useEffect } from 'react';
import { Webhook, ArrowRight, Copy, CheckCircle2, Loader2, Zap, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudioHooksConfigProps {
  onNext: () => void;
}

export const StudioHooksConfig = ({ onNext }: StudioHooksConfigProps) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [useN8nBackend, setUseN8nBackend] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const callbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-webhook`;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_settings')
        .select('use_n8n_backend, preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setUseN8nBackend(data.use_n8n_backend || false);
        const prefs = data.preferences as { n8n_webhook_url?: string; n8n_api_key?: string } | null;
        setWebhookUrl(prefs?.n8n_webhook_url || '');
        setN8nApiKey(prefs?.n8n_api_key || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Callback URL copied to clipboard",
    });
  };

  const testConnection = async () => {
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter your n8n webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Test using no-cors mode since n8n may not support CORS
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(n8nApiKey && { 'Authorization': `Bearer ${n8nApiKey}` })
        },
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'test_connection',
          timestamp: new Date().toISOString(),
          source: 'flowscale_studio'
        }),
      });

      setConnectionStatus('success');
      toast({
        title: "Request Sent",
        description: "Test request sent to n8n. Check your workflow history to confirm.",
      });
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      toast({
        title: "Connection Failed",
        description: "Failed to connect to n8n webhook",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current preferences to merge
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPrefs = (currentSettings?.preferences as Record<string, unknown>) || {};

      const { error } = await supabase
        .from('user_settings')
        .update({
          use_n8n_backend: useN8nBackend,
          preferences: {
            ...currentPrefs,
            n8n_webhook_url: webhookUrl,
            n8n_api_key: n8nApiKey
          }
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Hooks Configured",
        description: "Webhook settings saved successfully",
      });
      onNext();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hooks Configuration</h2>
          <p className="text-muted-foreground text-sm mt-1">Configure webhook endpoints for n8n integration</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Layer 2</Badge>
      </div>

      {/* n8n Backend Toggle */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Webhook className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <Label className="text-foreground font-medium">Enable n8n Backend Mode</Label>
              <p className="text-xs text-muted-foreground">
                Route all generation steps through your n8n workflows
              </p>
            </div>
          </div>
          <Switch
            checked={useN8nBackend}
            onCheckedChange={setUseN8nBackend}
          />
        </div>

        {useN8nBackend && (
          <div className="space-y-5 pt-4 border-t border-border">
            {/* n8n Webhook URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Webhook className="w-4 h-4 text-primary" />
                n8n Webhook URL
              </label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-n8n-instance.app.n8n.cloud/webhook/flowscale"
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                Enter your n8n webhook URL that will receive generation requests
              </p>
            </div>

            {/* n8n API Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                n8n API Key (Optional)
              </label>
              <Input
                type="password"
                value={n8nApiKey}
                onChange={(e) => setN8nApiKey(e.target.value)}
                placeholder="n8n-xxxxxxxx"
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">
                If your webhook requires authentication
              </p>
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isTestingConnection || !webhookUrl}
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
                <Badge className="bg-green-500/20 text-green-500 border-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Request Sent
                </Badge>
              )}

              {connectionStatus === 'error' && (
                <Badge className="bg-destructive/20 text-destructive border-0">
                  <XCircle className="w-3 h-3 mr-1" />
                  Failed
                </Badge>
              )}
            </div>

            {/* Callback URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Callback URL (for n8n to send results)
              </label>
              <div className="flex gap-2">
                <Input
                  value={callbackUrl}
                  readOnly
                  className="bg-muted border-border font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this URL in your n8n workflow to send results back
              </p>
            </div>

            {/* Webhook Payload Info */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium text-foreground mb-2">Webhook Payload Structure</p>
              <pre className="text-xs text-muted-foreground overflow-x-auto bg-background p-3 rounded-lg">
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

        {/* Submit */}
        <div className="flex justify-end pt-6">
          <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save & Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
