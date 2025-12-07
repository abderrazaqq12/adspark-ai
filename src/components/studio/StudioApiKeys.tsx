import { useState } from 'react';
import { Key, ArrowRight, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface StudioApiKeysProps {
  onNext: () => void;
}

const apiKeyFields = [
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'elevenlabs', label: 'ElevenLabs', placeholder: 'Enter API key' },
  { id: 'runway', label: 'Runway', placeholder: 'Enter API key' },
  { id: 'heygen', label: 'HeyGen', placeholder: 'Enter API key' },
];

export const StudioApiKeys = ({ onNext }: StudioApiKeysProps) => {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [validated, setValidated] = useState<Record<string, boolean | null>>({});
  const { toast } = useToast();

  const handleKeyChange = (id: string, value: string) => {
    setKeys(prev => ({ ...prev, [id]: value }));
    setValidated(prev => ({ ...prev, [id]: null }));
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const validateKey = (id: string) => {
    // Simulate validation
    const isValid = keys[id]?.length > 10;
    setValidated(prev => ({ ...prev, [id]: isValid }));
    toast({
      title: isValid ? "Key Valid" : "Key Invalid",
      description: isValid ? `${id} API key validated successfully` : `${id} API key validation failed`,
      variant: isValid ? "default" : "destructive",
    });
  };

  const handleSave = () => {
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been securely stored",
    });
    onNext();
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
                    placeholder={field.placeholder}
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
                  Test
                </Button>
                {validated[field.id] !== null && (
                  validated[field.id] ? 
                    <CheckCircle2 className="w-5 h-5 text-green-500 self-center" /> : 
                    <XCircle className="w-5 h-5 text-destructive self-center" />
                )}
              </div>
            </div>
          ))}

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
