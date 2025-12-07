import { useState } from 'react';
import { Webhook, ArrowRight, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface StudioHooksConfigProps {
  onNext: () => void;
}

export const StudioHooksConfig = ({ onNext }: StudioHooksConfigProps) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const callbackUrl = `${window.location.origin}/api/studio-callback`;

  const handleCopy = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Callback URL copied to clipboard",
    });
  };

  const handleSave = () => {
    toast({
      title: "Hooks Configured",
      description: "Webhook settings saved successfully",
    });
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hooks Configuration</h2>
          <p className="text-muted-foreground text-sm mt-1">Configure webhook endpoints for n8n integration</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Layer 2</Badge>
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="space-y-5">
          {/* n8n Webhook URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Webhook className="w-4 h-4 text-primary" />
              n8n Webhook URL
            </label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/..."
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Enter your n8n webhook URL for triggering workflows
            </p>
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

          {/* Submit */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} className="gap-2">
              Save & Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
