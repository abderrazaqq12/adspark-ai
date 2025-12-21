import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProviderResult {
  provider: string;
  configured: boolean;
  success: boolean;
  message: string;
  latency?: number;
}

interface TestResults {
  results: ProviderResult[];
  summary: {
    configured: number;
    working: number;
    fallbackAvailable: boolean;
    primaryProvider: string | null;
  };
}

const PROVIDER_INFO: Record<string, { name: string; color: string; bgColor: string }> = {
  gemini: { name: 'Google Gemini', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  openai: { name: 'OpenAI', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  openrouter: { name: 'OpenRouter', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
};

export function AIProviderStatus() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [lastTested, setLastTested] = useState<Date | null>(null);

  const testAllProviders = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-ai-providers');

      if (error) throw error;

      if (data.success) {
        setResults(data);
        setLastTested(new Date());
        
        const { summary } = data;
        if (summary.working === 0) {
          toast.error('No AI providers working', {
            description: 'Please check your API key configurations',
          });
        } else if (summary.working < summary.configured) {
          toast.warning(`${summary.working}/${summary.configured} providers working`, {
            description: `Primary: ${summary.primaryProvider}`,
          });
        } else {
          toast.success(`All ${summary.working} providers working!`, {
            description: 'Automatic fallback is available',
          });
        }
      }
    } catch (error) {
      console.error('Error testing providers:', error);
      toast.error('Failed to test AI providers');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-primary" />
              AI Provider Status
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Text-based AI operations (analysis, strategy) auto-switch between providers
            </CardDescription>
          </div>
          <Button 
            onClick={testAllProviders} 
            disabled={testing}
            size="sm"
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Test All
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!results ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Click "Test All" to check AI provider status
          </div>
        ) : (
          <div className="space-y-4">
            {/* Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {results.results.map((result) => {
                const info = PROVIDER_INFO[result.provider] || { name: result.provider, color: 'text-muted-foreground', bgColor: 'bg-muted' };
                
                return (
                  <div 
                    key={result.provider}
                    className={`p-3 rounded-lg border ${result.success ? 'border-green-500/30 bg-green-500/5' : result.configured ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/20'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium text-sm ${info.color}`}>{info.name}</span>
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : result.configured ? (
                        <XCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {result.message}
                    </p>
                    {result.latency && result.success && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {result.latency}ms
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Working: </span>
                  <span className={`font-medium ${results.summary.working > 0 ? 'text-green-500' : 'text-destructive'}`}>
                    {results.summary.working}/{results.summary.configured}
                  </span>
                </div>
                {results.summary.fallbackAvailable && (
                  <Badge className="bg-green-500/20 text-green-500 text-xs">
                    Fallback Available
                  </Badge>
                )}
                {results.summary.primaryProvider && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Primary: </span>
                    <span className="font-medium capitalize">{results.summary.primaryProvider}</span>
                  </div>
                )}
              </div>
              {lastTested && (
                <span className="text-xs text-muted-foreground">
                  Last tested: {lastTested.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
