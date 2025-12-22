/**
 * StudioApiKeys - API Keys Configuration Component
 * 
 * Displays connection status from backend.
 * Keys are stored on backend only - frontend shows status.
 */

import { useState, useEffect } from 'react';
import { Key, ArrowRight, CheckCircle2, XCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useBackendConnections, ConnectionService } from '@/hooks/useBackendConnections';

interface StudioApiKeysProps {
  onNext: () => void;
}

interface ApiKeyField {
  id: ConnectionService;
  label: string;
  description: string;
  docsUrl: string;
}

const apiKeyFields: ApiKeyField[] = [
  { 
    id: 'openai', 
    label: 'OpenAI', 
    description: 'GPT models for text generation',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  { 
    id: 'elevenlabs', 
    label: 'ElevenLabs', 
    description: 'Voice synthesis and cloning',
    docsUrl: 'https://elevenlabs.io/settings/api-keys'
  },
  { 
    id: 'runway', 
    label: 'Runway', 
    description: 'Video generation',
    docsUrl: 'https://app.runwayml.com/settings/api-keys'
  },
  { 
    id: 'heygen', 
    label: 'HeyGen', 
    description: 'Avatar video generation',
    docsUrl: 'https://app.heygen.com/settings/api'
  },
  { 
    id: 'fal', 
    label: 'Fal AI', 
    description: 'Fast video & image generation',
    docsUrl: 'https://fal.ai/dashboard/keys'
  },
  { 
    id: 'gemini', 
    label: 'Google Gemini', 
    description: 'Multimodal AI capabilities',
    docsUrl: 'https://aistudio.google.com/apikey'
  },
];

export const StudioApiKeys = ({ onNext }: StudioApiKeysProps) => {
  const { connections, loading, refresh, isConnected } = useBackendConnections();
  const [configuring, setConfiguring] = useState<string | null>(null);

  const handleConfigure = async (service: ConnectionService, docsUrl: string) => {
    setConfiguring(service);
    
    // Open docs in new tab - user configures key on backend
    window.open(docsUrl, '_blank');
    
    toast.info(
      'Configure your API key in the VPS backend environment, then refresh to see the status.',
      { duration: 5000 }
    );
    
    setConfiguring(null);
  };

  const handleContinue = () => {
    const connectedCount = apiKeyFields.filter(f => isConnected(f.id)).length;
    
    if (connectedCount === 0) {
      toast.info('No API keys configured. You can add them later in Settings.');
    } else {
      toast.success(`${connectedCount} API key(s) configured`);
    }
    onNext();
  };

  const connectedCount = apiKeyFields.filter(f => isConnected(f.id)).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">API Connections</h2>
          <p className="text-muted-foreground text-sm mt-1">
            External service connections (configured on backend)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Badge variant="outline" className="text-primary border-primary">
            {connectedCount}/{apiKeyFields.length} Connected
          </Badge>
        </div>
      </div>

      <Card className="p-6 bg-card border-border">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading connection status...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeyFields.map((field) => {
              const connected = isConnected(field.id);
              
              return (
                <div 
                  key={field.id} 
                  className={`p-4 rounded-lg border ${
                    connected 
                      ? 'bg-green-500/5 border-green-500/30' 
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {connected ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Key className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{field.label}</p>
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {connected ? (
                        <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600">
                          Connected
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfigure(field.id, field.docsUrl)}
                          disabled={configuring === field.id}
                          className="gap-1"
                        >
                          {configuring === field.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ExternalLink className="w-3 h-3" />
                          )}
                          Get API Key
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Backend Configuration Notice */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mt-4">
              <p className="text-sm text-foreground font-medium">
                API keys are configured on the VPS backend
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add keys to your server's environment variables. The frontend only displays connection status.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleContinue} className="gap-2">
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};