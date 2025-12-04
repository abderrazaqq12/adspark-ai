import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2, Play, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestResult {
  key: string;
  label: string;
  success: boolean;
  message: string;
}

interface BatchApiKeyTesterProps {
  apiKeys: Record<string, string>;
}

const TESTABLE_KEYS = [
  { key: "OPENAI_API_KEY", label: "OpenAI" },
  { key: "GEMINI_API_KEY", label: "Gemini" },
  { key: "RUNWAY_API_KEY", label: "Runway" },
  { key: "HEYGEN_API_KEY", label: "HeyGen" },
  { key: "ELEVENLABS_API_KEY", label: "ElevenLabs" },
  { key: "LEONARDO_API_KEY", label: "Leonardo" },
  { key: "FAL_API_KEY", label: "Fal AI" },
  { key: "PIKA_API_KEY", label: "Pika Labs" },
  { key: "KLING_API_KEY", label: "Kling AI" },
];

export default function BatchApiKeyTester({ apiKeys }: BatchApiKeyTesterProps) {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentKey, setCurrentKey] = useState<string | null>(null);

  const configuredKeys = TESTABLE_KEYS.filter(k => apiKeys[k.key]);

  const runBatchTest = async () => {
    if (configuredKeys.length === 0) {
      toast.error("No API keys configured to test");
      return;
    }

    setTesting(true);
    setResults([]);
    setProgress(0);

    const newResults: TestResult[] = [];
    
    for (let i = 0; i < configuredKeys.length; i++) {
      const keyConfig = configuredKeys[i];
      setCurrentKey(keyConfig.key);
      
      try {
        const { data, error } = await supabase.functions.invoke('test-api-connection', {
          body: { apiKeyType: keyConfig.key, apiKey: apiKeys[keyConfig.key] },
        });

        if (error) throw error;

        newResults.push({
          key: keyConfig.key,
          label: keyConfig.label,
          success: data.success,
          message: data.message,
        });
      } catch (error) {
        newResults.push({
          key: keyConfig.key,
          label: keyConfig.label,
          success: false,
          message: "Connection test failed",
        });
      }

      setProgress(((i + 1) / configuredKeys.length) * 100);
      setResults([...newResults]);
    }

    setCurrentKey(null);
    setTesting(false);

    const successCount = newResults.filter(r => r.success).length;
    toast.success(`Batch test complete: ${successCount}/${newResults.length} passed`);
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <Card className="bg-muted/30 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          Batch API Key Testing
        </CardTitle>
        <CardDescription className="text-sm">
          Test all configured API keys at once ({configuredKeys.length} keys configured)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runBatchTest} 
          disabled={testing || configuredKeys.length === 0}
          className="w-full bg-gradient-primary"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing {currentKey?.replace("_API_KEY", "")}...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Test All {configuredKeys.length} Keys
            </>
          )}
        </Button>

        {testing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-2 justify-center">
              <Badge className="bg-green-500/20 text-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                {successCount} Passed
              </Badge>
              <Badge className="bg-red-500/20 text-red-500">
                <XCircle className="w-3 h-3 mr-1" />
                {failCount} Failed
              </Badge>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results.map((result) => (
                <div
                  key={result.key}
                  className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                    result.success ? "bg-green-500/10" : "bg-red-500/10"
                  }`}
                >
                  <span className="font-medium">{result.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate max-w-32">
                      {result.message}
                    </span>
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
