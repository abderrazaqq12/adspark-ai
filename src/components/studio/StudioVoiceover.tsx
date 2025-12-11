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
  Sparkles,
  Webhook,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Wand2
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
  aiChecked?: boolean;
  aiCheckResult?: {
    hasErrors: boolean;
    corrections: string[];
    originalText: string;
    correctedText: string;
  };
}

interface Script {
  id: string;
  raw_text: string;
  language: string;
  tone: string;
  status: string;
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
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [isGeneratingScripts, setIsGeneratingScripts] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL');
  const [voiceModel, setVoiceModel] = useState('eleven_multilingual_v2');
  const [speed, setSpeed] = useState([1.0]);
  const [language, setLanguage] = useState('ar');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({});
  
  // Script generation settings
  const [scriptsCount, setScriptsCount] = useState('3');
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [existingScripts, setExistingScripts] = useState<Script[]>([]);
  
  const [scriptText, setScriptText] = useState('');
  const [tracks, setTracks] = useState<VoiceoverTrack[]>([]);
  const [generatedScripts, setGeneratedScripts] = useState<string[]>([]);

  // N8n backend mode settings
  const [useN8nBackend, setUseN8nBackend] = useState(false);
  const [aiOperatorEnabled, setAiOperatorEnabled] = useState(false);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [audienceTargeting, setAudienceTargeting] = useState<AudienceTargeting>({
    targetMarket: 'gcc',
    language: 'ar-sa',
    audienceAge: '25-34',
    audienceGender: 'both',
  });

  useEffect(() => {
    loadSettings();
    loadExistingScripts();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences, use_n8n_backend, ai_operator_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        setUseN8nBackend(settings.use_n8n_backend || false);
        setAiOperatorEnabled(settings.ai_operator_enabled || false);
        
        const prefs = settings.preferences as Record<string, any>;
        if (prefs) {
          setLanguage(prefs.studio_language?.split('-')[0] || 'ar');
          setAudienceTargeting({
            targetMarket: prefs.studio_target_market || 'gcc',
            language: prefs.studio_language || 'ar-sa',
            audienceAge: prefs.studio_audience_age || '25-34',
            audienceGender: prefs.studio_audience_gender || 'both',
          });
          const stageWebhooks = prefs.stage_webhooks || {};
          if (stageWebhooks.voiceover?.webhook_url) {
            setN8nWebhookUrl(stageWebhooks.voiceover.webhook_url);
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadExistingScripts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: scripts } = await supabase
        .from('scripts')
        .select('id, raw_text, language, tone, status')
        .order('created_at', { ascending: false })
        .limit(20);

      if (scripts) {
        setExistingScripts(scripts);
      }
    } catch (error) {
      console.error('Error loading scripts:', error);
    }
  };

  const generateScriptsWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter an AI prompt to generate scripts",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingScripts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('generate-scripts', {
        body: {
          prompt: aiPrompt,
          count: parseInt(scriptsCount),
          language: language,
          targetMarket: audienceTargeting.targetMarket,
          audienceAge: audienceTargeting.audienceAge,
          audienceGender: audienceTargeting.audienceGender,
        }
      });

      if (response.error) throw response.error;

      const scripts = response.data?.scripts || [];
      setGeneratedScripts(scripts);
      
      if (scripts.length > 0) {
        setScriptText(scripts[0]);
      }

      toast({
        title: "Scripts Generated",
        description: `${scripts.length} video scripts created`,
      });

      // Reload existing scripts
      loadExistingScripts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate scripts",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingScripts(false);
    }
  };

  const handleScriptSelection = (scriptId: string) => {
    setSelectedScriptId(scriptId);
    const script = existingScripts.find(s => s.id === scriptId);
    if (script) {
      setScriptText(script.raw_text);
    }
  };

  const checkArabicText = async () => {
    if (!scriptText.trim()) {
      toast({
        title: "Script Required",
        description: "Please enter script text to check",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingAI(true);
    try {
      const response = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'check_arabic_text',
          text: scriptText,
          language: language,
          checkType: 'grammar_vocalization',
        }
      });

      if (response.error) throw response.error;

      const result = response.data;
      
      if (result?.corrections?.length > 0) {
        toast({
          title: "AI Check Complete",
          description: `Found ${result.corrections.length} suggestions for improvement`,
        });
        
        if (result.correctedText) {
          setScriptText(result.correctedText);
        }
      } else {
        toast({
          title: "AI Check Complete",
          description: "No issues found. Script looks good!",
        });
      }
    } catch (error: any) {
      toast({
        title: "AI Check Failed",
        description: error.message || "Could not check the text",
        variant: "destructive",
      });
    } finally {
      setIsCheckingAI(false);
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

      const voiceoverPrompt = aiOperatorEnabled ? getPrompt('voiceover_scripts', {
        product_name: '',
        product_description: '',
      }) : '';

      if (useN8nBackend && n8nWebhookUrl) {
        console.log('Calling Voiceover webhook:', n8nWebhookUrl);
        
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_voiceover',
            segments: segments,
            voiceId: selectedVoice,
            model: voiceModel,
            speed: speed[0],
            prompt: voiceoverPrompt,
            audienceTargeting: {
              targetMarket: audienceTargeting.targetMarket,
              language: audienceTargeting.language,
              audienceAge: audienceTargeting.audienceAge,
              audienceGender: audienceTargeting.audienceGender,
            },
            userId: session.user.id,
            timestamp: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.tracks) {
            setTracks(data.tracks);
          } else {
            setTracks(prev => prev.map(t => ({ ...t, status: 'completed' as const })));
          }
          toast({
            title: "Voiceovers Generated",
            description: `${segments.length} audio tracks processed via webhook`,
          });
        } else {
          throw new Error(`Webhook error: ${response.status}`);
        }
      } else {
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
      }
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

    if (playingId && audioElements[playingId]) {
      audioElements[playingId].pause();
      audioElements[playingId].currentTime = 0;
    }

    if (playingId === id) {
      setPlayingId(null);
    } else {
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
          <h2 className="text-2xl font-bold text-foreground">Video Script Text & Audio</h2>
          <p className="text-muted-foreground text-sm mt-1">Generate AI scripts and voiceovers</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Step 4</Badge>
      </div>

      {/* Webhook indicator */}
      {useN8nBackend && n8nWebhookUrl && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <Webhook className="w-3 h-3 text-green-500" />
          <span>Webhook enabled: {n8nWebhookUrl.substring(0, 50)}...</span>
        </div>
      )}

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

      {/* Script Generation */}
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          Generate Video Scripts
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Number of Scripts</Label>
            <Select value={scriptsCount} onValueChange={setScriptsCount}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n} Scripts</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 space-y-2">
            <Label>AI Prompt</Label>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe your video script requirements... e.g., 'Create a 30-second product ad script for a pain relief gel targeting Saudi audience'"
              className="bg-background min-h-[80px]"
            />
          </div>
        </div>

        <Button 
          onClick={generateScriptsWithAI} 
          disabled={isGeneratingScripts}
          className="gap-2"
        >
          {isGeneratingScripts ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate {scriptsCount} Scripts
        </Button>

        {/* Generated Scripts Preview */}
        {generatedScripts.length > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
            <Label className="text-sm mb-2 block">Generated Scripts ({generatedScripts.length})</Label>
            <div className="space-y-2">
              {generatedScripts.map((script, idx) => (
                <Button
                  key={idx}
                  variant={scriptText === script ? "default" : "outline"}
                  size="sm"
                  className="mr-2"
                  onClick={() => setScriptText(script)}
                >
                  Script {idx + 1}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Existing Scripts Dropdown */}
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Select Existing Script
        </h3>
        <Select value={selectedScriptId} onValueChange={handleScriptSelection}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Choose from your saved scripts..." />
          </SelectTrigger>
          <SelectContent>
            {existingScripts.map((script) => (
              <SelectItem key={script.id} value={script.id}>
                {script.raw_text.substring(0, 60)}... ({script.language || 'N/A'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

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
                <SelectItem value="ar">Arabic</SelectItem>
                <SelectItem value="en">English</SelectItem>
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

      {/* Script Input & AI Check */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Script Text</h3>
          {language === 'ar' && (
            <Button
              variant="outline"
              size="sm"
              onClick={checkArabicText}
              disabled={isCheckingAI}
              className="gap-2"
            >
              {isCheckingAI ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              AI Check (Grammar & Vocalization)
            </Button>
          )}
        </div>
        
        <Textarea
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          placeholder="Enter your script text here or generate/select from above. Separate paragraphs with blank lines for multiple audio segments..."
          className="min-h-[150px] bg-background"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        />
        
        <div className="flex items-center gap-2 mt-2">
          <p className="text-xs text-muted-foreground flex-1">
            Tip: Use blank lines to separate script into multiple audio segments
          </p>
          {language === 'ar' && (
            <Badge variant="secondary" className="text-[10px]">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Arabic text will be checked for errors
            </Badge>
          )}
        </div>

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
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    playingId === track.id ? 'bg-primary/10 border border-primary/30' : 'bg-background/50'
                  }`}
                >
                  <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                  <p className="flex-1 text-sm truncate" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    {track.text.slice(0, 60)}...
                  </p>
                  {track.duration > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {track.duration}s
                    </span>
                  )}
                  {track.status === 'generating' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : track.status === 'completed' && track.audioUrl ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => playTrack(track.id)}
                      >
                        {playingId === track.id ? (
                          <Pause className="w-4 h-4 text-primary" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(track.audioUrl!, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : track.status === 'failed' ? (
                    <Badge variant="destructive" className="text-[10px]">Failed</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Voiceover Button */}
        <div className="mt-4">
          <Button onClick={generateVoiceover} disabled={isGenerating} className="w-full gap-2">
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            Generate Voiceover
          </Button>
        </div>
      </Card>

      {/* Generated Tracks Detailed View */}
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
                    <p className="text-sm text-muted-foreground line-clamp-2" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                      {track.text}
                    </p>
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
          Continue to Scene Builder
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
