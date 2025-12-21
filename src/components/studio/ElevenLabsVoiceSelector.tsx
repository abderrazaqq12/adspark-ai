import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Voice {
  id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

interface ElevenLabsVoiceSelectorProps {
  selectedVoice: string;
  onVoiceSelect: (voiceId: string) => void;
}

// Default library voices as fallback
const DEFAULT_LIBRARY_VOICES: Voice[] = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', labels: { accent: 'American', gender: 'female' } },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', labels: { accent: 'American', gender: 'male' } },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', labels: { accent: 'Arabic', gender: 'female' } },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', labels: { accent: 'British', gender: 'male' } },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', labels: { accent: 'American', gender: 'male' } },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', labels: { accent: 'Spanish', gender: 'female' } },
];

export const ElevenLabsVoiceSelector = ({
  selectedVoice,
  onVoiceSelect,
}: ElevenLabsVoiceSelectorProps) => {
  const [allVoices, setAllVoices] = useState<Voice[]>(DEFAULT_LIBRARY_VOICES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-voiceover', {
        body: { action: 'get_voices' }
      });

      if (error) throw error;

      const voices: Voice[] = [];
      if (data.my_voices) {
        voices.push(...data.my_voices.map((v: Voice) => ({ ...v, category: 'cloned' })));
      }
      if (data.library_voices) {
        voices.push(...data.library_voices);
      }
      
      if (voices.length > 0) {
        setAllVoices(voices);
      }
    } catch (error: any) {
      console.error('Error fetching voices:', error);
      toast.error('Could not fetch custom voices');
    } finally {
      setIsLoading(false);
    }
  };

  const getVoiceLabel = (voice: Voice) => {
    const parts = [voice.name];
    if (voice.labels?.accent) parts.push(`(${voice.labels.accent})`);
    if (voice.category === 'cloned') parts.push('— Cloned');
    return parts.join(' ');
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-primary" />
        Voice
      </Label>
      <Select value={selectedVoice} onValueChange={onVoiceSelect} disabled={isLoading}>
        <SelectTrigger className="bg-background">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading voices...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a voice" />
          )}
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {allVoices.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              {getVoiceLabel(voice)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ElevenLabsVoiceSelector;
