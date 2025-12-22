/**
 * ConnectionStatusPanel - Backend Connection Status Display
 * 
 * Shows read-only connection status fetched from VPS backend.
 * No credentials stored in frontend - only displays backend state.
 */

import { RefreshCw, CheckCircle2, XCircle, ExternalLink, Loader2, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBackendConnections, ConnectionService } from '@/hooks/useBackendConnections';

interface ConnectionConfig {
  service: ConnectionService;
  label: string;
  description: string;
  category: 'oauth' | 'api_key';
  docsUrl?: string;
}

const CONNECTIONS: ConnectionConfig[] = [
  // OAuth Services
  { 
    service: 'google_drive', 
    label: 'Google Drive', 
    description: 'Asset storage & sync',
    category: 'oauth'
  },
  // API Key Services
  { 
    service: 'openai', 
    label: 'OpenAI', 
    description: 'GPT models',
    category: 'api_key',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  { 
    service: 'gemini', 
    label: 'Google Gemini', 
    description: 'Multimodal AI',
    category: 'api_key',
    docsUrl: 'https://aistudio.google.com/apikey'
  },
  { 
    service: 'elevenlabs', 
    label: 'ElevenLabs', 
    description: 'Voice synthesis',
    category: 'api_key',
    docsUrl: 'https://elevenlabs.io/settings/api-keys'
  },
  { 
    service: 'runway', 
    label: 'Runway', 
    description: 'Video generation',
    category: 'api_key',
    docsUrl: 'https://app.runwayml.com/settings/api-keys'
  },
  { 
    service: 'heygen', 
    label: 'HeyGen', 
    description: 'Avatar videos',
    category: 'api_key',
    docsUrl: 'https://app.heygen.com/settings/api'
  },
  { 
    service: 'fal', 
    label: 'Fal AI', 
    description: 'Fast generation',
    category: 'api_key',
    docsUrl: 'https://fal.ai/dashboard/keys'
  },
  { 
    service: 'kling', 
    label: 'Kling AI', 
    description: 'AI video generation',
    category: 'api_key',
  },
  { 
    service: 'anthropic', 
    label: 'Anthropic', 
    description: 'Claude models',
    category: 'api_key',
    docsUrl: 'https://console.anthropic.com/settings/keys'
  },
  { 
    service: 'deepseek', 
    label: 'DeepSeek', 
    description: 'DeepSeek AI',
    category: 'api_key',
  },
  { 
    service: 'openrouter', 
    label: 'OpenRouter', 
    description: 'Multi-model gateway',
    category: 'api_key',
    docsUrl: 'https://openrouter.ai/keys'
  },
];

export function ConnectionStatusPanel() {
  const { connections, loading, error, refresh, isConnected, connect, disconnect } = useBackendConnections();

  const oauthConnections = CONNECTIONS.filter(c => c.category === 'oauth');
  const apiKeyConnections = CONNECTIONS.filter(c => c.category === 'api_key');

  const handleConnect = async (service: ConnectionService) => {
    const result = await connect(service);
    if (result.redirectUrl) {
      window.location.href = result.redirectUrl;
    }
  };

  const connectedCount = CONNECTIONS.filter(c => isConnected(c.service)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Backend Connections
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Status from VPS backend • {connectedCount}/{CONNECTIONS.length} active
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Fetching connection status from backend...
        </div>
      )}

      {/* OAuth Services */}
      {!loading && (
        <>
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              OAuth Services
            </h4>
            {oauthConnections.map((conn) => {
              const connected = isConnected(conn.service);
              return (
                <div
                  key={conn.service}
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
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{conn.label}</p>
                        <p className="text-xs text-muted-foreground">{conn.description}</p>
                      </div>
                    </div>
                    {connected ? (
                      <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600">
                        Connected
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(conn.service)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* API Key Services */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              API Key Services (Backend-Configured)
            </h4>
            <p className="text-xs text-muted-foreground">
              These are configured in the VPS environment. Frontend shows status only.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {apiKeyConnections.map((conn) => {
                const connected = isConnected(conn.service);
                return (
                  <div
                    key={conn.service}
                    className={`p-3 rounded-lg border ${
                      connected 
                        ? 'bg-green-500/5 border-green-500/30' 
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {connected ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{conn.label}</p>
                          <p className="text-xs text-muted-foreground">{conn.description}</p>
                        </div>
                      </div>
                      {!connected && conn.docsUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(conn.docsUrl, '_blank')}
                          className="h-7 px-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}