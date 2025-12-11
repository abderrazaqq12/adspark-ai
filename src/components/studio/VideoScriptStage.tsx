import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, 
  Loader2, 
  Sparkles, 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Volume2,
  Wand2,
  ArrowRight,
  Copy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBackendMode } from '@/hooks/useBackendMode';

// Script types for video ads
const SCRIPT_TYPES = [
  { id: 'ugc', name: 'UGC Product Ad', description: 'User-generated content style' },
  { id: 'problem-solution', name: 'Problem/Solution', description: 'Pain point → solution flow' },
  { id: 'emotional-hook', name: 'Emotional Hook', description: 'Emotion-driven storytelling' },
  { id: 'storytelling', name: 'Storytelling', description: 'Narrative-based ad' },
  { id: 'testimonial', name: 'Testimonial', description: 'Customer review style' },
  { id: 'fast-paced', name: 'Fast-Paced TikTok', description: 'Quick cuts, high energy' },
  { id: 'dramatic', name: 'Dramatic', description: 'Cinematic, impactful' },
  { id: 'educational', name: 'Educational', description: 'Informative how-to style' },
];

// ElevenLabs voices
const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', accent: 'American' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'male', accent: 'American' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'female', accent: 'Arabic' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', accent: 'British' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', accent: 'American' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', accent: 'Spanish' },
];

const ELEVENLABS_MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: '29 languages' },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', description: 'Fast, low latency' },
  { id: 'eleven_flash_v2_5', name: 'Flash v2.5', description: 'Ultra-fast' },
];

interface GeneratedScript {
  id: string;
  originalText: string;
  correctedText: string | null;
  vocalizedText: string | null;
  audioUrl: string | null;
  status: 'pending' | 'generating' | 'validating' | 'completed' | 'failed';
  validationIssues: string[];
}

interface VideoScriptStageProps {
  onNext: () => void;
  productInfo: { name: string; description: string; imageUrl: string; link: string };
  language: string;
  market: string;
}

export const VideoScriptStage = ({ onNext, productInfo, language, market }: VideoScriptStageProps) => {
  const { n8nEnabled: useN8nBackend, aiOperatorEnabled } = useBackendMode();
  
  // Script generation settings
  const [scriptCount, setScriptCount] = useState('5');
  const [scriptType, setScriptType] = useState('ugc');
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Voice settings
  const [selectedVoice, setSelectedVoice] = useState('pFZP5JQG7iQjIQuC4Bku'); // Arabic Lily
  const [selectedModel, setSelectedModel] = useState('eleven_multilingual_v2');
  
  // Generated scripts
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  
  // Audio playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Load saved scripts on mount
  useEffect(() => {
    loadSavedScripts();
  }, []);

  const loadSavedScripts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings?.preferences) {
        const prefs = settings.preferences as Record<string, any>;
        if (prefs.video_scripts) {
          setScripts(prefs.video_scripts);
        }
      }
    } catch (error) {
      console.error('Error loading scripts:', error);
    }
  };

  const saveScripts = async (newScripts: GeneratedScript[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPrefs = (settings?.preferences as Record<string, unknown>) || {};
      
      // Serialize scripts for JSON storage
      const scriptsToSave = JSON.parse(JSON.stringify(newScripts));
      
      await supabase
        .from('user_settings')
        .update({
          preferences: {
            ...currentPrefs,
            video_scripts: scriptsToSave,
          } as any
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving scripts:', error);
    }
  };

  const generateScripts = async () => {
    if (!productInfo.name) {
      toast.error('Please enter product information first');
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const count = parseInt(scriptCount);
      const scriptTypeInfo = SCRIPT_TYPES.find(t => t.id === scriptType);

      const { data, error } = await supabase.functions.invoke('generate-scripts', {
        body: {
          productName: productInfo.name,
          productDescription: productInfo.description,
          scriptType: scriptType,
          scriptTypeName: scriptTypeInfo?.name || 'UGC Product Ad',
          count,
          language: language || 'ar',
          market: market || 'gcc',
          customPrompt: customPrompt || null,
        }
      });

      if (error) throw error;

      const generatedScripts: GeneratedScript[] = (data.scripts || []).map((text: string, i: number) => ({
        id: `script-${Date.now()}-${i}`,
        originalText: text,
        correctedText: null,
        vocalizedText: null,
        audioUrl: null,
        status: 'pending' as const,
        validationIssues: [],
      }));

      setScripts(generatedScripts);
      saveScripts(generatedScripts);
      setActiveTab('validate');
      
      toast.success(`Generated ${generatedScripts.length} scripts`);
    } catch (error: any) {
      console.error('Script generation error:', error);
      toast.error(error.message || 'Failed to generate scripts');
    } finally {
      setIsGenerating(false);
    }
  };

  const validateScripts = async () => {
    if (scripts.length === 0) {
      toast.error('No scripts to validate');
      return;
    }

    setIsValidating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const updatedScripts = [...scripts];

      for (let i = 0; i < updatedScripts.length; i++) {
        updatedScripts[i].status = 'validating';
        setScripts([...updatedScripts]);

        // Use dedicated arabic-vocalization function with comprehensive Gulf dialect rules
        const { data, error } = await supabase.functions.invoke('arabic-vocalization', {
          body: {
            content: updatedScripts[i].originalText,
            contentType: 'script',
            language: language || 'ar',
            checks: ['grammar', 'logic', 'cta', 'hallucination', 'arabic_vocalization', 'vocalization'],
            includeDialectConversion: language === 'ar', // Only apply Gulf dialect for Arabic
          }
        });

        if (error) {
          updatedScripts[i].status = 'failed';
          updatedScripts[i].validationIssues = ['Validation failed'];
        } else {
          updatedScripts[i].correctedText = data.correctedText || updatedScripts[i].originalText;
          updatedScripts[i].vocalizedText = data.vocalizedText || data.correctedText || updatedScripts[i].originalText;
          updatedScripts[i].validationIssues = data.issues || [];
          // Store applied rules for display
          if (data.appliedRules?.length > 0) {
            updatedScripts[i].validationIssues = [
              ...updatedScripts[i].validationIssues,
              `Applied ${data.appliedRules.length} Gulf dialect optimizations`
            ];
          }
          updatedScripts[i].status = 'completed';
        }

        setScripts([...updatedScripts]);
      }

      saveScripts(updatedScripts);
      setActiveTab('voiceover');
      toast.success('Scripts validated with Gulf dialect optimization');
    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error(error.message || 'Failed to validate scripts');
    } finally {
      setIsValidating(false);
    }
  };

  const generateVoiceover = async (scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    if (!script) return;

    const textToSpeak = script.vocalizedText || script.correctedText || script.originalText;

    const updatedScripts = scripts.map(s => 
      s.id === scriptId ? { ...s, status: 'generating' as const } : s
    );
    setScripts(updatedScripts);

    try {
      const { data, error } = await supabase.functions.invoke('generate-voiceover', {
        body: {
          text: textToSpeak,
          voiceId: selectedVoice,
          model: selectedModel,
          language: language || 'ar',
        }
      });

      if (error) throw error;

      const finalScripts = scripts.map(s => 
        s.id === scriptId 
          ? { ...s, audioUrl: data.audioUrl, status: 'completed' as const }
          : s
      );
      setScripts(finalScripts);
      saveScripts(finalScripts);
      
      toast.success('Voice-over generated');
    } catch (error: any) {
      const finalScripts = scripts.map(s => 
        s.id === scriptId ? { ...s, status: 'failed' as const } : s
      );
      setScripts(finalScripts);
      toast.error(error.message || 'Failed to generate voice-over');
    }
  };

  const regenerateVoiceover = async (scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    if (!script) return;

    // Clear old audio URL first
    const updatedScripts = scripts.map(s => 
      s.id === scriptId ? { ...s, audioUrl: null } : s
    );
    setScripts(updatedScripts);

    await generateVoiceover(scriptId);
  };

  const playAudio = (scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    if (!script?.audioUrl) return;

    // Stop any currently playing
    if (playingId && audioRefs.current[playingId]) {
      audioRefs.current[playingId].pause();
      audioRefs.current[playingId].currentTime = 0;
    }

    if (playingId === scriptId) {
      setPlayingId(null);
      return;
    }

    let audio = audioRefs.current[scriptId];
    if (!audio) {
      audio = new Audio(script.audioUrl);
      audio.onended = () => setPlayingId(null);
      audioRefs.current[scriptId] = audio;
    }

    audio.play();
    setPlayingId(scriptId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const hasValidatedScripts = scripts.some(s => s.correctedText || s.vocalizedText);
  const hasVoiceovers = scripts.some(s => s.audioUrl);

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          Video Script Text & Audio
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Generate AI scripts, validate for quality, and create voice-overs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate" className="gap-2">
              <FileText className="w-4 h-4" />
              Generate Scripts
            </TabsTrigger>
            <TabsTrigger value="validate" className="gap-2" disabled={scripts.length === 0}>
              <Wand2 className="w-4 h-4" />
              AI Validation
            </TabsTrigger>
            <TabsTrigger value="voiceover" className="gap-2" disabled={!hasValidatedScripts}>
              <Volume2 className="w-4 h-4" />
              Voice-Over
            </TabsTrigger>
          </TabsList>

          {/* Generate Scripts Tab */}
          <TabsContent value="generate" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>How Many Scripts?</Label>
                <Select value={scriptCount} onValueChange={setScriptCount}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Script</SelectItem>
                    <SelectItem value="3">3 Scripts</SelectItem>
                    <SelectItem value="5">5 Scripts</SelectItem>
                    <SelectItem value="10">10 Scripts</SelectItem>
                    <SelectItem value="15">15 Scripts</SelectItem>
                    <SelectItem value="20">20 Scripts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Video Script Type</Label>
                <Select value={scriptType} onValueChange={setScriptType}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCRIPT_TYPES.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex flex-col">
                          <span>{type.name}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Custom AI Prompt (Optional)</Label>
              <Textarea
                placeholder="Add specific instructions for script generation... e.g., 'Focus on emotional benefits', 'Use Saudi dialect', 'Include urgency CTA'"
                className="min-h-[100px] bg-muted/50"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>

            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Product Context</span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>{productInfo.name || 'No product name'}</strong>
                {productInfo.description && ` - ${productInfo.description.slice(0, 100)}...`}
              </p>
            </div>

            <Button 
              onClick={generateScripts} 
              disabled={isGenerating || !productInfo.name}
              className="w-full bg-gradient-primary"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating {scriptCount} Scripts...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate {scriptCount} Scripts
                </>
              )}
            </Button>

            {scripts.length > 0 && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {scripts.map((script, i) => (
                  <div key={script.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Script {i + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(script.originalText)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3" dir="rtl">
                      {script.originalText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* AI Validation Tab */}
          <TabsContent value="validate" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                Two-Stage AI Validation
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="font-medium text-foreground mb-1">1. Script Mistake Checker</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Grammar & logic errors</li>
                    <li>• Remove hallucinations</li>
                    <li>• CTA clarity check</li>
                    <li>• Structure optimization</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="font-medium text-foreground mb-1">2. Gulf Arabic Vocalization</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• ق → گ (Qaf to G sound)</li>
                    <li>• ك → چ (Kaf softening)</li>
                    <li>• ج → ي (Jim to Y)</li>
                    <li>• Gulf expressions (الحين، شنو، ليش)</li>
                  </ul>
                </div>
              </div>
              
              {/* Additional Gulf dialect features */}
              <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-medium text-primary mb-2">Enhanced Gulf Dialect Features:</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Diacritics:</span>
                    <p>مُنتَج، جَودة، سِعر</p>
                  </div>
                  <div>
                    <span className="font-medium">E-commerce:</span>
                    <p>COD → كاش، ٪ → بالمية</p>
                  </div>
                  <div>
                    <span className="font-medium">CTAs:</span>
                    <p>أطلُب الحين، خُذ</p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={validateScripts} 
              disabled={isValidating || scripts.length === 0}
              className="w-full"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating Scripts...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Validate All Scripts
                </>
              )}
            </Button>

            {scripts.length > 0 && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {scripts.map((script, i) => (
                  <div key={script.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">Script {i + 1}</span>
                      <Badge variant={
                        script.status === 'completed' ? 'default' :
                        script.status === 'validating' ? 'secondary' :
                        script.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {script.status === 'validating' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {script.status}
                      </Badge>
                    </div>

                    {script.validationIssues.length > 0 && (
                      <div className="mb-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-xs font-medium text-yellow-600 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Issues Found:
                        </p>
                        <ul className="text-xs text-muted-foreground">
                          {script.validationIssues.map((issue, j) => (
                            <li key={j}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Original Script</Label>
                        <p className="text-sm mt-1 p-2 rounded bg-background/50" dir="rtl">
                          {script.originalText}
                        </p>
                      </div>

                      {script.correctedText && (
                        <div>
                          <Label className="text-xs text-green-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            AI Corrected Script
                          </Label>
                          <p className="text-sm mt-1 p-2 rounded bg-green-500/5 border border-green-500/20" dir="rtl">
                            {script.correctedText}
                          </p>
                        </div>
                      )}

                      {script.vocalizedText && script.vocalizedText !== script.correctedText && (
                        <div>
                          <Label className="text-xs text-primary flex items-center gap-1">
                            <Volume2 className="w-3 h-3" />
                            Voice-Optimized Script (Arabic Vocalization)
                          </Label>
                          <p className="text-sm mt-1 p-2 rounded bg-primary/5 border border-primary/20" dir="rtl">
                            {script.vocalizedText}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Voice-Over Tab */}
          <TabsContent value="voiceover" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" />
                ElevenLabs Voice Settings
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ELEVENLABS_VOICES.map(voice => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <Badge variant="outline" className="text-[10px]">{voice.accent}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ELEVENLABS_MODELS.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col">
                            <span>{model.name}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {scripts.filter(s => s.correctedText || s.vocalizedText).map((script, i) => (
                <div key={script.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Script {i + 1}</span>
                    <div className="flex items-center gap-2">
                      {script.audioUrl ? (
                        <>
                          <Button
                            variant={playingId === script.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => playAudio(script.id)}
                          >
                            {playingId === script.id ? (
                              <>
                                <Pause className="w-3 h-3 mr-1" />
                                Playing
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                Play
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => regenerateVoiceover(script.id)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Regenerate
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateVoiceover(script.id)}
                          disabled={script.status === 'generating'}
                        >
                          {script.status === 'generating' ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1" />
                              Generate Voice
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground p-2 rounded bg-background/50" dir="rtl">
                    {script.vocalizedText || script.correctedText || script.originalText}
                  </p>

                  {script.audioUrl && (
                    <div className="mt-3 p-2 rounded bg-primary/10 border border-primary/20">
                      <audio 
                        controls 
                        src={script.audioUrl} 
                        className="w-full h-8"
                        style={{ minHeight: '32px' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Continue Button */}
        <div className="flex justify-between pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {scripts.length > 0 && (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {scripts.length} scripts • {scripts.filter(s => s.audioUrl).length} voiceovers ready
              </span>
            )}
          </div>
          <Button 
            onClick={onNext} 
            disabled={scripts.length === 0}
            className="gap-2"
          >
            Continue to Scene Builder
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoScriptStage;
