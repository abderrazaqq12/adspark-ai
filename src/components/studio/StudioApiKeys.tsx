import { useState, useEffect } from 'react';
import { Key, ArrowRight, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSecureApiKeys } from '@/hooks/useSecureApiKeys';

interface StudioApiKeysProps {
  onNext: () => void;
}

const apiKeyFields = [
  { id: 'OPENAI_API_KEY', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'ELEVENLABS_API_KEY', label: 'ElevenLabs', placeholder: 'Enter API key' },
  { id: 'RUNWAY_API_KEY', label: 'Runway', placeholder: 'Enter API key' },
  { id: 'HEYGEN_API_KEY', label: 'HeyGen', placeholder: 'Enter API key' },
];

export const StudioApiKeys = ({ onNext }: StudioApiKeysProps) => {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [validated, setValidated] = useState<Record<string, boolean | null>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { saveApiKey, providers } = useSecureApiKeys();

  // Load existing keys (status only, not values)
  useEffect(() => {
    if (providers) {
      const updates: Record<string, boolean> = {};
      providers.forEach(p => {
        if (p.is_active) {
          updates[p.provider] = true;
        }
      });
      // We don't set keys values because we can't retrieve them decrypted here easily without excessive RPC calls, 
      // and usually we only let users overwrite them.
      // But we can mark them as "validated" (exists).
      setValidated(prev => ({ ...prev, ...updates }));
    }
  }, [providers]);

  const handleKeyChange = (id: string, value: string) => {
    setKeys(prev => ({ ...prev, [id]: value }));
    // Reset validation status when user types
    setValidated(prev => ({ ...prev, [id]: null }));
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const validateKey = async (id: string) => {
    // Current validation is just "save it". 
    // In future we could call the test-api-connection function.
    // For now, let's just save it.
    if (!keys[id]) return;

    try {
      const success = await saveApiKey(id, keys[id]);
      setValidated(prev => ({ ...prev, [id]: success }));

      toast({
        title: success ? "Key Saved" : "Save Failed",
        description: success ? `${id} saved successfully` : `Failed to save ${id}`,
        variant: success ? "default" : "destructive",
      });
    } catch (error) {
      setValidated(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let allSaved = true;

    try {
      // Save all entered keys
      for (const [provider, key] of Object.entries(keys)) {
        if (key) {
          const success = await saveApiKey(provider, key);
          if (!success) allSaved = false;
        }
      }

      if (allSaved) {
        toast({
          title: "API Keys Saved",
          description: "Your API keys have been securely stored",
        });
        onNext();
      } else {
        toast({
          title: "Some keys failed to save",
          description: "Please check the invalid keys and try again",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">API Keys</h2>
          <p className="text-muted-foreground text-sm mt-1">Configure API keys for external AI services</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Layer 3</Badge>
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="space-y-4">
          {apiKeyFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                {field.label}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKeys[field.id] ? 'text' : 'password'}
                    value={keys[field.id] || ''}
                    onChange={(e) => handleKeyChange(field.id, e.target.value)}
                    placeholder={validated[field.id] ? '(Stored) - Enter new key to overwrite' : field.placeholder}
                    className="bg-background border-border pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(field.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKeys[field.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => validateKey(field.id)}
                  disabled={!keys[field.id]}
                >
                  Save
                </Button>
                {validated[field.id] !== null && validated[field.id] !== undefined && (
                  validated[field.id] ?
                    <CheckCircle2 className="w-5 h-5 text-green-500 self-center" /> :
                    <XCircle className="w-5 h-5 text-destructive self-center" />
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} className="gap-2" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save & Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
