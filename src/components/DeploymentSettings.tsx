import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Server, 
  Cloud, 
  Container, 
  Laptop, 
  Brain, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ExternalLink,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { config, isLovableCloud, isSelfHosted, isDocker, isLocal, AIProvider } from '@/config';
import { getAvailableProviders } from '@/lib/ai/provider';

interface DeploymentSettingsProps {
  onSave?: () => void;
}

const DEPLOYMENT_MODES = [
  { 
    id: 'lovable-cloud', 
    label: 'Lovable Cloud', 
    icon: Cloud, 
    description: 'Managed infrastructure with built-in AI',
    color: 'text-primary'
  },
  { 
    id: 'self-hosted', 
    label: 'Self-Hosted', 
    icon: Server, 
    description: 'Your own infrastructure',
    color: 'text-blue-500'
  },
  { 
    id: 'docker', 
    label: 'Docker', 
    icon: Container, 
    description: 'Containerized deployment',
    color: 'text-cyan-500'
  },
  { 
    id: 'local', 
    label: 'Local Development', 
    icon: Laptop, 
    description: 'Development mode',
    color: 'text-amber-500'
  },
];

const AI_PROVIDERS = [
  { 
    id: 'lovable' as AIProvider, 
    label: 'Lovable AI', 
    description: 'Built-in AI gateway (recommended)',
    requiresKey: false,
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gpt-5', 'gpt-5-mini']
  },
  { 
    id: 'openai' as AIProvider, 
    label: 'OpenAI', 
    description: 'Direct OpenAI API access',
    requiresKey: true,
    keyPlaceholder: 'sk-proj-...',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
  },
  { 
    id: 'gemini' as AIProvider, 
    label: 'Google Gemini', 
    description: 'Direct Google AI access',
    requiresKey: true,
    keyPlaceholder: 'AIzaSy...',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro']
  },
  { 
    id: 'ollama' as AIProvider, 
    label: 'Ollama (Self-Hosted)', 
    description: 'Local LLMs on your machine',
    requiresKey: false,
    requiresUrl: true,
    urlPlaceholder: 'http://localhost:11434',
    models: ['llama3.2', 'mistral', 'codellama']
  },
];

export default function DeploymentSettings({ onSave }: DeploymentSettingsProps) {
  const [currentMode, setCurrentMode] = useState(config.deploymentTarget);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('lovable');
  const [selectedModel, setSelectedModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [enableDebug, setEnableDebug] = useState(false);
  const [enableLocalMode, setEnableLocalMode] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
  const [checkingProviders, setCheckingProviders] = useState(false);
  const [testingProvider, setTestingProvider] = useState(false);
  const [providerStatus, setProviderStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
    checkProviders();
  }, []);

  const loadSettings = () => {
    // Load from localStorage
    const savedProvider = localStorage.getItem('ai_provider') as AIProvider || 'lovable';
    const savedModel = localStorage.getItem('ai_model') || '';
    const savedOllamaUrl = localStorage.getItem('ollama_url') || 'http://localhost:11434';
    const savedDebug = localStorage.getItem('debug_mode') === 'true';
    const savedLocalMode = localStorage.getItem('local_mode') === 'true';

    setSelectedProvider(savedProvider);
    setSelectedModel(savedModel);
    setOllamaUrl(savedOllamaUrl);
    setEnableDebug(savedDebug);
    setEnableLocalMode(savedLocalMode);

    // Load API keys
    if (savedProvider === 'openai') {
      setApiKey(localStorage.getItem('openai_api_key') || '');
    } else if (savedProvider === 'gemini') {
      setApiKey(localStorage.getItem('gemini_api_key') || '');
    }
  };

  const checkProviders = async () => {
    setCheckingProviders(true);
    try {
      const available = await getAvailableProviders();
      setAvailableProviders(available);
    } catch (error) {
      console.error('Error checking providers:', error);
    } finally {
      setCheckingProviders(false);
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setApiKey('');
    setProviderStatus('idle');

    // Set default model for provider
    const providerConfig = AI_PROVIDERS.find(p => p.id === provider);
    if (providerConfig?.models?.length) {
      setSelectedModel(providerConfig.models[0]);
    }

    // Load existing API key if any
    if (provider === 'openai') {
      setApiKey(localStorage.getItem('openai_api_key') || '');
    } else if (provider === 'gemini') {
      setApiKey(localStorage.getItem('gemini_api_key') || '');
    }
  };

  const testProvider = async () => {
    setTestingProvider(true);
    setProviderStatus('idle');

    try {
      const { getAIAdapter } = await import('@/lib/ai/provider');
      const adapter = await getAIAdapter(selectedProvider);
      
      // Set API key before testing
      if (selectedProvider === 'openai' && apiKey) {
        (adapter as any).setApiKey?.(apiKey);
      } else if (selectedProvider === 'gemini' && apiKey) {
        (adapter as any).setApiKey?.(apiKey);
      } else if (selectedProvider === 'ollama') {
        (adapter as any).setBaseUrl?.(ollamaUrl);
      }

      const isAvailable = await adapter.isAvailable();
      
      if (isAvailable) {
        setProviderStatus('success');
        toast.success(`${AI_PROVIDERS.find(p => p.id === selectedProvider)?.label} is available`);
      } else {
        setProviderStatus('error');
        toast.error('Provider not available. Check your configuration.');
      }
    } catch (error) {
      console.error('Error testing provider:', error);
      setProviderStatus('error');
      toast.error('Failed to connect to provider');
    } finally {
      setTestingProvider(false);
    }
  };

  const saveSettings = () => {
    // Save to localStorage
    localStorage.setItem('ai_provider', selectedProvider);
    localStorage.setItem('ai_model', selectedModel);
    localStorage.setItem('debug_mode', enableDebug.toString());
    localStorage.setItem('local_mode', enableLocalMode.toString());

    if (selectedProvider === 'openai' && apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    } else if (selectedProvider === 'gemini' && apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    } else if (selectedProvider === 'ollama') {
      localStorage.setItem('ollama_url', ollamaUrl);
    }

    toast.success('Settings saved');
    onSave?.();
  };

  const currentModeConfig = DEPLOYMENT_MODES.find(m => m.id === currentMode);
  const currentProviderConfig = AI_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div className="space-y-6">
      {/* Deployment Mode Display */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Deployment Mode</CardTitle>
              <CardDescription>Current deployment environment detected</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DEPLOYMENT_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = mode.id === currentMode;
              
              return (
                <div
                  key={mode.id}
                  className={`p-4 rounded-lg border transition-all ${
                    isActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-muted/30 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${isActive ? mode.color : 'text-muted-foreground'}`} />
                    {isActive && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {mode.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{mode.description}</p>
                </div>
              );
            })}
          </div>

          {isLovableCloud() && (
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Running on Lovable Cloud</p>
                <p className="text-muted-foreground">All backend services are managed automatically. Lovable AI is pre-configured.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Provider Selection */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Provider</CardTitle>
                <CardDescription>Choose your AI backend for content generation</CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkProviders}
              disabled={checkingProviders}
            >
              {checkingProviders ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Check Availability'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AI_PROVIDERS.map((provider) => {
              const isSelected = provider.id === selectedProvider;
              const isAvailable = availableProviders.includes(provider.id);
              
              return (
                <div
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50 bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-medium">{provider.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAvailable && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                          Available
                        </Badge>
                      )}
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{provider.description}</p>
                  {provider.requiresKey && (
                    <Badge variant="secondary" className="mt-2 text-xs">Requires API Key</Badge>
                  )}
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Provider Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Configuration</h4>

            {/* API Key Input */}
            {currentProviderConfig?.requiresKey && (
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={currentProviderConfig.keyPlaceholder}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={testProvider} disabled={testingProvider || !apiKey}>
                    {testingProvider ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : providerStatus === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : providerStatus === 'error' ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Ollama URL */}
            {currentProviderConfig?.requiresUrl && (
              <div className="space-y-2">
                <Label>Ollama Server URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder={currentProviderConfig.urlPlaceholder}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={testProvider} disabled={testingProvider}>
                    {testingProvider ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : providerStatus === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : providerStatus === 'error' ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Model Selection */}
            {currentProviderConfig?.models && (
              <div className="space-y-2">
                <Label>Default Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentProviderConfig.models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Advanced Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Advanced Options</h4>

            <div className="flex items-center justify-between">
              <div>
                <Label>Debug Mode</Label>
                <p className="text-xs text-muted-foreground">Enable detailed logging</p>
              </div>
              <Switch checked={enableDebug} onCheckedChange={setEnableDebug} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Local/Demo Mode</Label>
                <p className="text-xs text-muted-foreground">Use localStorage instead of backend</p>
              </div>
              <Switch checked={enableLocalMode} onCheckedChange={setEnableLocalMode} />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={saveSettings} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Save AI Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Self-Hosting Info */}
      {!isLovableCloud() && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Self-Hosting Resources</CardTitle>
            <CardDescription>Documentation for self-hosted deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" asChild>
                <a href="/SELF_HOSTING.md" target="_blank" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Self-Hosting Guide
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://docs.lovable.dev" target="_blank" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Documentation
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
