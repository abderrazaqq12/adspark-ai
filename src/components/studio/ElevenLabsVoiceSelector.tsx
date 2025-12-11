import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Volume2, 
  Loader2, 
  RefreshCw, 
  Check,
  Play,
  Pause,
  User,
  Library
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Voice {
  id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string;
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
  const [voiceTab, setVoiceTab] = useState<'library' | 'my'>('library');
  const [libraryVoices, setLibraryVoices] = useState<Voice[]>(DEFAULT_LIBRARY_VOICES);
  const [myVoices, setMyVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
    };
  }, [previewAudio]);

  const fetchVoices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-voiceover', {
        body: { action: 'get_voices' }
      });

      if (error) throw error;

      if (data.library_voices) {
        setLibraryVoices(data.library_voices);
      }
      if (data.my_voices) {
        setMyVoices(data.my_voices);
      }
    } catch (error: any) {
      console.error('Error fetching voices:', error);
      // Keep default library voices on error
      toast.error('Could not fetch custom voices. Check your ElevenLabs API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const playPreview = async (voice: Voice) => {
    // Stop current preview if playing
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = '';
    }

    if (playingPreview === voice.id) {
      setPlayingPreview(null);
      return;
    }

    if (!voice.preview_url) {
      toast.error('No preview available for this voice');
      return;
    }

    try {
      const audio = new Audio(voice.preview_url);
      audio.onended = () => setPlayingPreview(null);
      audio.onerror = () => {
        setPlayingPreview(null);
        toast.error('Failed to play preview');
      };
      
      setPreviewAudio(audio);
      setPlayingPreview(voice.id);
      await audio.play();
    } catch (error) {
      setPlayingPreview(null);
      toast.error('Failed to play preview');
    }
  };

  const VoiceCard = ({ voice }: { voice: Voice }) => {
    const isSelected = selectedVoice === voice.id;
    const isPlaying = playingPreview === voice.id;
    
    return (
      <div
        className={`p-3 rounded-lg border cursor-pointer transition-all ${
          isSelected 
            ? 'bg-primary/10 border-primary' 
            : 'bg-muted/30 border-border hover:border-primary/50'
        }`}
        onClick={() => onVoiceSelect(voice.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSelected && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium text-sm">{voice.name}</p>
              <div className="flex items-center gap-1 mt-1">
                {voice.labels?.gender && (
                  <Badge variant="outline" className="text-[10px] px-1">
                    {voice.labels.gender}
                  </Badge>
                )}
                {voice.labels?.accent && (
                  <Badge variant="outline" className="text-[10px] px-1">
                    {voice.labels.accent}
                  </Badge>
                )}
                {voice.labels?.language && (
                  <Badge variant="outline" className="text-[10px] px-1">
                    {voice.labels.language}
                  </Badge>
                )}
                {voice.category && voice.category !== 'premade' && (
                  <Badge variant="secondary" className="text-[10px] px-1">
                    {voice.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {voice.preview_url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                playPreview(voice);
              }}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-primary" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          Select Voice
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchVoices}
          disabled={isLoading}
          className="h-8"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          <span className="ml-1 text-xs">Refresh</span>
        </Button>
      </div>

      <Tabs value={voiceTab} onValueChange={(v) => setVoiceTab(v as 'library' | 'my')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="library" className="gap-2">
            <Library className="w-3 h-3" />
            Library Voices
            <Badge variant="secondary" className="text-[10px] ml-1">
              {libraryVoices.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-2">
            <User className="w-3 h-3" />
            My Voices
            <Badge variant="secondary" className="text-[10px] ml-1">
              {myVoices.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-2 gap-2">
                {libraryVoices.map((voice) => (
                  <VoiceCard key={voice.id} voice={voice} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="my" className="mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : myVoices.length > 0 ? (
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-2 gap-2">
                {myVoices.map((voice) => (
                  <VoiceCard key={voice.id} voice={voice} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No custom voices found</p>
              <p className="text-xs mt-1">
                Clone voices in your ElevenLabs dashboard
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Currently selected voice indicator */}
      {selectedVoice && (
        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            Selected: <span className="font-medium text-foreground">
              {[...libraryVoices, ...myVoices].find(v => v.id === selectedVoice)?.name || selectedVoice}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default ElevenLabsVoiceSelector;
