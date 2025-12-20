import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowRight, 
  Loader2, 
  Mic, 
  Play,
  Pause,
  Download,
  RefreshCw,
  Volume2,
  Clock,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStudioPrompts } from '@/hooks/useStudioPrompts';
import { AudienceTargeting } from './AudienceTargeting';

interface StudioVoiceoverProps {
  onNext: () => void;
}

interface VoiceoverTrack {
  id: string;
  scriptIndex: number;
  text: string;
  audioUrl: string | null;
  duration: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

interface AudienceTargeting {
  targetMarket: string;
  language: string;
  audienceAge: string;
  audienceGender: string;
}

const voices = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', accent: 'American' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'male', accent: 'American' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', accent: 'American' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', accent: 'British' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', accent: 'American' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'female', accent: 'British' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'female', accent: 'British' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', accent: 'British' },
];

export const StudioVoiceover = ({ onNext }: StudioVoiceoverProps) => {
  const { toast } = useToast();
  const { getPrompt } = useStudioPrompts();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL');
  const [voiceModel, setVoiceModel] = useState('eleven_multilingual_v2');
  const [speed, setSpeed] = useState([1.0]);
  const [language, setLanguage] = useState('en');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({});
  
  const [scriptText, setScriptText] = useState('');
  const [tracks, setTracks] = useState<VoiceoverTrack[]>();

  // AI Operator mode
  const [aiOperatorEnabled, setAiOperatorEnabled] = useState(false);
  const [audienceTargeting, setAudienceTargeting] = useState<AudienceTargeting>({
    targetMarket: 'gcc',
    language: 'ar',
    audienceAge: '25-34',
    audienceGender: 'both',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences, ai_operator_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        setAiOperatorEnabled(settings.ai_operator_enabled || false);
        
        const prefs = settings.preferences as Record<string, any>;
        if (prefs) {
          setLanguage(prefs.studio_language?.split('-')[0] || 'en');
          // Load audience targeting
          setAudienceTargeting({
            targetMarket: prefs.studio_target_market || 'gcc',
            language: prefs.studio_language || 'ar',
            audienceAge: prefs.studio_audience_age || '25-34',
            audienceGender: prefs.studio_audience_gender || 'both',
          });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const generateVoiceover = async () => {
    if (!scriptText.trim()) {
      toast({
        title: "Script Required",
        description: "Please enter script text to generate voiceover",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Split script into segments if too long
      const segments = scriptText.split('\n\n').filter(s => s.trim());
      
      const newTracks: VoiceoverTrack[] = segments.map((text, i) => ({
        id: `track-${Date.now()}-${i}`,
        scriptIndex: i + 1,
        text,
        audioUrl: null,
        duration: 0,
        status: 'generating' as const,
      }));

      setTracks(newTracks);

      // Generate via Supabase edge function
      for (let i = 0; i < newTracks.length; i++) {
          try {
            const response = await supabase.functions.invoke('generate-voiceover', {
              body: {
                text: newTracks[i].text,
                voiceId: selectedVoice,
                model: voiceModel,
                language: audienceTargeting.language.split('-')[0] || language,
              }
            });

            setTracks(prev => prev.map((t, idx) => 
              idx === i 
                ? { 
                    ...t, 
                    audioUrl: response.data?.audioUrl || null,
                    duration: response.data?.duration || 0,
                    status: response.error ? 'failed' : 'completed' 
                  } 
                : t
            ));
          } catch (error) {
          setTracks(prev => prev.map((t, idx) => 
            idx === i ? { ...t, status: 'failed' } : t
          ));
        }
      }

      toast({
        title: "Voiceovers Generated",
        description: `${segments.length} audio tracks created`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate voiceover",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const playTrack = (id: string) => {
    const track = tracks?.find(t => t.id === id);
    if (!track?.audioUrl) return;

    // Stop any currently playing audio
    if (playingId && audioElements[playingId]) {
      audioElements[playingId].pause();
      audioElements[playingId].currentTime = 0;
    }

    if (playingId === id) {
      setPlayingId(null);
    } else {
      // Create or reuse audio element
      let audio = audioElements[id];
      if (!audio) {
        audio = new Audio(track.audioUrl);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
          setPlayingId(null);
          toast({
            title: "Playback Error",
            description: "Failed to play audio track",
            variant: "destructive",
          });
        };
        setAudioElements(prev => ({ ...prev, [id]: audio }));
      }
      audio.play();
      setPlayingId(id);
    }
  };

  // Stop audio when component unmounts
  useEffect(() => {
    return () => {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, [audioElements]);

  const regenerateTrack = async (id: string) => {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    setTracks(prev => prev.map(t => 
      t.id === id ? { ...t, status: 'generating' } : t
    ));

    try {
      const response = await supabase.functions.invoke('generate-voiceover', {
        body: {
          text: track.text,
          voiceId: selectedVoice,
          model: voiceModel,
          language,
        }
      });

      setTracks(prev => prev.map(t => 
        t.id === id 
          ? { 
              ...t, 
              audioUrl: response.data?.audioUrl || t.audioUrl,
              duration: response.data?.duration || t.duration,
              status: response.error ? 'failed' : 'completed' 
            } 
          : t
      ));
    } catch (error) {
      setTracks(prev => prev.map(t => 
        t.id === id ? { ...t, status: 'failed' } : t
      ));
    }
  };

  const completedTracks = tracks.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Voiceover Generation</h2>
          <p className="text-muted-foreground text-sm mt-1">Create AI voiceovers with ElevenLabs</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Step 5</Badge>
      </div>

      {/* Audience Targeting */}
      <AudienceTargeting
        targetMarket={audienceTargeting.targetMarket}
        setTargetMarket={(value) => setAudienceTargeting(prev => ({ ...prev, targetMarket: value }))}
        language={audienceTargeting.language}
        setLanguage={(value) => {
          setAudienceTargeting(prev => ({ ...prev, language: value }));
          setLanguage(value.split('-')[0]);
        }}
        audienceAge={audienceTargeting.audienceAge}
        setAudienceAge={(value) => setAudienceTargeting(prev => ({ ...prev, audienceAge: value }))}
        audienceGender={audienceTargeting.audienceGender}
        setAudienceGender={(value) => setAudienceTargeting(prev => ({ ...prev, audienceGender: value }))}
      />

      {/* Voice Settings */}
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4">Voice Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Voice</Label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender}, {voice.accent})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={voiceModel} onValueChange={setVoiceModel}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eleven_multilingual_v2">Multilingual v2</SelectItem>
                <SelectItem value="eleven_turbo_v2_5">Turbo v2.5</SelectItem>
                <SelectItem value="eleven_flash_v2_5">Flash v2.5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Speed: {speed[0]}x</Label>
            <Slider
              value={speed}
              onValueChange={setSpeed}
              min={0.5}
              max={2}
              step={0.1}
              className="mt-3"
            />
          </div>
        </div>
      </Card>

      {/* Script Input */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Script Text</h3>
        </div>
        <Textarea
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          placeholder="Enter your script text here. Separate paragraphs with blank lines for multiple audio segments..."
          className="min-h-[150px] bg-background"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Tip: Use blank lines to separate script into multiple audio segments
        </p>

        {/* Audio Preview for Generated Tracks */}
        {tracks && tracks.length > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" />
                Generated Audio Tracks
              </h4>
              <Badge variant="secondary">{tracks.filter(t => t.status === 'completed').length}/{tracks.length}</Badge>
            </div>
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div 
                  key={track.id} 
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    playingId === track.id ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                  }`}
                >
                  <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                  <p className="flex-1 text-sm truncate">{track.text.slice(0, 50)}...</p>
                  {track.duration > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {track.duration}s
                    </span>
                  )}
                  {track.status === 'generating' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : track.status === 'completed' && track.audioUrl ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => playTrack(track.id)}
                    >
                      {playingId === track.id ? (
                        <Pause className="w-4 h-4 text-primary" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  ) : track.status === 'failed' ? (
                    <Badge variant="destructive" className="text-[10px]">Failed</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-4">
          <Button onClick={generateVoiceover} disabled={isGenerating} className="w-full gap-2">
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate Voiceover
          </Button>
        </div>
      </Card>

      {/* Generated Tracks */}
      {tracks.length > 0 && (
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Audio Tracks</h3>
            <Badge variant="secondary">{completedTracks}/{tracks.length} completed</Badge>
          </div>
          <div className="space-y-3">
            {tracks.map((track) => (
              <div key={track.id} className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Segment {track.scriptIndex}</Badge>
                      {track.status === 'generating' && (
                        <Badge className="bg-blue-500/20 text-blue-500">Generating...</Badge>
                      )}
                      {track.status === 'completed' && (
                        <Badge className="bg-green-500/20 text-green-500">Ready</Badge>
                      )}
                      {track.status === 'failed' && (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                      {track.duration > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {track.duration}s
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{track.text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {track.status === 'completed' && track.audioUrl && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => playTrack(track.id)}
                        >
                          {playingId === track.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => window.open(track.audioUrl!, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => regenerateTrack(track.id)}
                      disabled={track.status === 'generating'}
                    >
                      <RefreshCw className={`w-4 h-4 ${track.status === 'generating' ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Continue */}
      <div className="flex justify-end">
        <Button onClick={onNext} className="gap-2">
          Continue to Video Creation
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};