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
  Copy,
  Globe,
  Moon,
  Users,
  Trash2,
  Pencil,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBackendMode } from '@/hooks/useBackendMode';
import { VoiceAudioPlayer } from './VoiceAudioPlayer';
import { ElevenLabsVoiceSelector } from './ElevenLabsVoiceSelector';

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

// Removed hardcoded ELEVENLABS_VOICES - now fetched dynamically via ElevenLabsVoiceSelector

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
  status: 'pending' | 'generating' | 'validating' | 'completed' | 'failed' | 'regenerating';
  validationIssues: string[];
  isEditing?: boolean;
  isLocked?: boolean;
  editedText?: string;
}

// Store generation parameters for regeneration
interface GenerationParams {
  scriptType: string;
  scriptTypeName: string;
  language: string;
  market: string;
  customPrompt: string;
  audienceAge: string;
  audienceGender: string;
  productName: string;
  productDescription: string;
}

interface VideoScriptStageProps {
  onNext: () => void;
  productInfo: { name: string; description: string; imageUrl: string; link: string };
  language: string;
  market: string;
}

export const VideoScriptStage = ({ onNext, productInfo, language, market }: VideoScriptStageProps) => {
  const { aiOperatorEnabled } = useBackendMode();
  
  // Script generation settings
  const [scriptCount, setScriptCount] = useState('5');
  const [scriptType, setScriptType] = useState('ugc');
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Audience targeting
  const [targetCountry, setTargetCountry] = useState(market || 'gcc');
  const [selectedLanguage, setSelectedLanguage] = useState(language || 'ar');
  const [audienceAge, setAudienceAge] = useState('25-34');
  const [audienceGender, setAudienceGender] = useState('all');
  
  // Voice settings
  const [selectedVoice, setSelectedVoice] = useState('pFZP5JQG7iQjIQuC4Bku'); // Arabic Lily
  const [selectedModel, setSelectedModel] = useState('eleven_multilingual_v2');
  
  // Generated scripts
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  
  // Store generation params for individual regeneration
  const [generationParams, setGenerationParams] = useState<GenerationParams | null>(null);
  
  // Note: Audio playback is now handled by VoiceAudioPlayer component

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

      // Save generation params for individual regeneration
      const params: GenerationParams = {
        scriptType,
        scriptTypeName: scriptTypeInfo?.name || 'UGC Product Ad',
        language: selectedLanguage || 'ar',
        market: targetCountry || 'gcc',
        customPrompt: customPrompt || '',
        audienceAge,
        audienceGender,
        productName: productInfo.name,
        productDescription: productInfo.description,
      };
      setGenerationParams(params);

      const { data, error } = await supabase.functions.invoke('generate-scripts', {
        body: {
          productName: productInfo.name,
          productDescription: productInfo.description,
          scriptType: scriptType,
          scriptTypeName: scriptTypeInfo?.name || 'UGC Product Ad',
          count,
          language: selectedLanguage || 'ar',
          market: targetCountry || 'gcc',
          customPrompt: customPrompt || null,
          audienceAge,
          audienceGender,
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
        isEditing: false,
        isLocked: false,
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

  // Delete a single script
  const deleteScript = (scriptId: string) => {
    const updatedScripts = scripts.filter(s => s.id !== scriptId);
    setScripts(updatedScripts);
    saveScripts(updatedScripts);
    toast.success('Script removed');
  };

  // Regenerate a single script using stored params
  const regenerateScript = async (scriptId: string, index: number) => {
    if (!generationParams) {
      toast.error('Generation parameters not found. Please generate new scripts first.');
      return;
    }

    // Mark script as regenerating
    const updatedScripts = scripts.map(s => 
      s.id === scriptId ? { ...s, status: 'regenerating' as const } : s
    );
    setScripts(updatedScripts);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-scripts', {
        body: {
          productName: generationParams.productName,
          productDescription: generationParams.productDescription,
          scriptType: generationParams.scriptType,
          scriptTypeName: generationParams.scriptTypeName,
          count: 1,
          language: generationParams.language,
          market: generationParams.market,
          customPrompt: generationParams.customPrompt || null,
          audienceAge: generationParams.audienceAge,
          audienceGender: generationParams.audienceGender,
        }
      });

      if (error) throw error;

      const newText = data.scripts?.[0] || '';
      
      const finalScripts = scripts.map(s => 
        s.id === scriptId 
          ? { 
              ...s, 
              originalText: newText,
              correctedText: null,
              vocalizedText: null,
              audioUrl: null,
              status: 'pending' as const,
              validationIssues: [],
              isEditing: false,
              editedText: undefined,
            } 
          : s
      );
      setScripts(finalScripts);
      saveScripts(finalScripts);
      toast.success(`Script ${index + 1} regenerated`);
    } catch (error: any) {
      const finalScripts = scripts.map(s => 
        s.id === scriptId ? { ...s, status: 'pending' as const } : s
      );
      setScripts(finalScripts);
      toast.error(error.message || 'Failed to regenerate script');
    }
  };

  // Toggle edit mode for a script
  const toggleEditScript = (scriptId: string) => {
    const updatedScripts = scripts.map(s => 
      s.id === scriptId 
        ? { 
            ...s, 
            isEditing: !s.isEditing,
            editedText: s.isEditing ? undefined : (s.originalText),
          } 
        : s
    );
    setScripts(updatedScripts);
  };

  // Update script text while editing
  const updateScriptText = (scriptId: string, newText: string) => {
    const updatedScripts = scripts.map(s => 
      s.id === scriptId ? { ...s, editedText: newText } : s
    );
    setScripts(updatedScripts);
  };

  // Save edited script
  const saveEditedScript = (scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    if (!script?.editedText) return;

    const updatedScripts = scripts.map(s => 
      s.id === scriptId 
        ? { 
            ...s, 
            originalText: s.editedText || s.originalText,
            isEditing: false,
            editedText: undefined,
            // Clear validation since text changed
            correctedText: null,
            vocalizedText: null,
            validationIssues: [],
            status: 'pending' as const,
          } 
        : s
    );
    setScripts(updatedScripts);
    saveScripts(updatedScripts);
    toast.success('Script updated');
  };

  // Toggle lock state for a script
  const toggleLockScript = (scriptId: string) => {
    const updatedScripts = scripts.map(s => 
      s.id === scriptId ? { ...s, isLocked: !s.isLocked } : s
    );
    setScripts(updatedScripts);
    saveScripts(updatedScripts);
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

      // Handle both URL and base64 responses
      let audioUrl = data.audio_url;
      
      // If we got base64 instead of URL (e.g., storage failed), create blob URL
      if (!audioUrl && data.audio_base64) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        audioUrl = URL.createObjectURL(audioBlob);
      }

      if (!audioUrl) {
        throw new Error('No audio returned from API');
      }

      const finalScripts = scripts.map(s => 
        s.id === scriptId 
          ? { ...s, audioUrl, status: 'completed' as const }
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
      toast.error(error.message || 'Voice generation failed. Check API key or try again.');
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

  const deleteAudio = (scriptId: string) => {
    const updatedScripts = scripts.map(s => 
      s.id === scriptId ? { ...s, audioUrl: null } : s
    );
    setScripts(updatedScripts);
    saveScripts(updatedScripts);
  };

  // Note: playAudio function moved to VoiceAudioPlayer component

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

            {/* Audience Targeting Section */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Audience Targeting
              </h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Target Country</Label>
                  <Select value={targetCountry} onValueChange={setTargetCountry}>
                    <SelectTrigger className="bg-background">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-yellow-400" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      <SelectItem value="gcc">GCC</SelectItem>
                      <SelectItem value="sa">Saudi Arabia</SelectItem>
                      <SelectItem value="ae">UAE</SelectItem>
                      <SelectItem value="kw">Kuwait</SelectItem>
                      <SelectItem value="qa">Qatar</SelectItem>
                      <SelectItem value="bh">Bahrain</SelectItem>
                      <SelectItem value="om">Oman</SelectItem>
                      <SelectItem value="eg">Egypt</SelectItem>
                      <SelectItem value="eu">Europe</SelectItem>
                      <SelectItem value="us">USA</SelectItem>
                      <SelectItem value="latam">LATAM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Language</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="bg-background border-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Audience Age</Label>
                  <Select value={audienceAge} onValueChange={setAudienceAge}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      <SelectItem value="18-24">18-24</SelectItem>
                      <SelectItem value="25-34">25-34</SelectItem>
                      <SelectItem value="35-44">35-44</SelectItem>
                      <SelectItem value="45-54">45-54</SelectItem>
                      <SelectItem value="55+">55+</SelectItem>
                      <SelectItem value="all">All Ages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Audience Gender</Label>
                  <Select value={audienceGender} onValueChange={setAudienceGender}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

            {scripts.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {scripts.map((script, i) => (
                  <div 
                    key={script.id} 
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      script.status === 'regenerating' 
                        ? 'bg-primary/10 border-primary/30 animate-pulse' 
                        : script.isLocked 
                          ? 'bg-muted/50 border-primary/40' 
                          : 'bg-muted/30 border-border'
                    }`}
                  >
                    {/* Header with controls */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Script {i + 1}</span>
                        {script.isLocked && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                        {script.status === 'regenerating' && (
                          <Badge variant="secondary" className="text-xs">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Regenerating...
                          </Badge>
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {!script.isLocked && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => toggleEditScript(script.id)}
                              className="h-8 w-8 p-0"
                              title={script.isEditing ? "Cancel edit" : "Edit script"}
                            >
                              <Pencil className={`w-3.5 h-3.5 ${script.isEditing ? 'text-primary' : ''}`} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => regenerateScript(script.id, i)}
                              disabled={script.status === 'regenerating'}
                              className="h-8 w-8 p-0"
                              title="Regenerate script"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${script.status === 'regenerating' ? 'animate-spin' : ''}`} />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleLockScript(script.id)}
                          className="h-8 w-8 p-0"
                          title={script.isLocked ? "Unlock script" : "Lock script"}
                        >
                          {script.isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(script.originalText)}
                          className="h-8 w-8 p-0"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        {!script.isLocked && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteScript(script.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete script"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Script content - editable or read-only */}
                    {script.isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={script.editedText || script.originalText}
                          onChange={(e) => updateScriptText(script.id, e.target.value)}
                          className="min-h-[100px] text-sm bg-background"
                          dir="rtl"
                        />
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleEditScript(script.id)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => saveEditedScript(script.id)}
                            className="bg-gradient-primary"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground" dir="rtl">
                        {script.originalText}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No scripts generated yet</p>
                <p className="text-xs mt-1">Configure settings above and click "Generate Scripts"</p>
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

            {scripts.length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {scripts.map((script, i) => (
                  <div 
                    key={script.id} 
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      script.status === 'validating' 
                        ? 'bg-primary/10 border-primary/30' 
                        : script.status === 'regenerating'
                          ? 'bg-yellow-500/10 border-yellow-500/30 animate-pulse'
                          : script.isLocked 
                            ? 'bg-muted/50 border-primary/40' 
                            : 'bg-muted/30 border-border'
                    }`}
                  >
                    {/* Header with controls */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Script {i + 1}</span>
                        <Badge variant={
                          script.status === 'completed' ? 'default' :
                          script.status === 'validating' ? 'secondary' :
                          script.status === 'regenerating' ? 'outline' :
                          script.status === 'failed' ? 'destructive' : 'outline'
                        }>
                          {(script.status === 'validating' || script.status === 'regenerating') && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          {script.status}
                        </Badge>
                        {script.isLocked && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {!script.isLocked && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => regenerateScript(script.id, i)}
                              disabled={script.status === 'regenerating' || script.status === 'validating'}
                              className="h-8 w-8 p-0"
                              title="Regenerate script"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${script.status === 'regenerating' ? 'animate-spin' : ''}`} />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleLockScript(script.id)}
                          className="h-8 w-8 p-0"
                          title={script.isLocked ? "Unlock script" : "Lock script"}
                        >
                          {script.isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(script.vocalizedText || script.correctedText || script.originalText)}
                          className="h-8 w-8 p-0"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        {!script.isLocked && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteScript(script.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete script"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No scripts to validate</p>
                <p className="text-xs mt-1">Generate scripts first in the "Generate Scripts" tab</p>
              </div>
            )}
          </TabsContent>

          {/* Voice-Over Tab */}
          <TabsContent value="voiceover" className="space-y-4 mt-4">
            {/* Voice Settings */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Voice Selector with Library/My Voices tabs */}
                <ElevenLabsVoiceSelector 
                  selectedVoice={selectedVoice}
                  onVoiceSelect={setSelectedVoice}
                />

                {/* Model Selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Select Model
                  </Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-background">
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
                  
                  <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                    <p><strong>Multilingual v2:</strong> Best quality, 29 languages</p>
                    <p><strong>Turbo v2.5:</strong> Fast generation, good for iteration</p>
                    <p><strong>Flash v2.5:</strong> Ultra-fast, draft quality</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scripts with Voice Generation */}
            {scripts.filter(s => s.correctedText || s.vocalizedText).length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {scripts.filter(s => s.correctedText || s.vocalizedText).map((script, i) => (
                  <div 
                    key={script.id} 
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      script.status === 'generating' 
                        ? 'bg-primary/10 border-primary/30' 
                        : script.isLocked 
                          ? 'bg-muted/50 border-primary/40' 
                          : 'bg-muted/30 border-border'
                    }`}
                  >
                    {/* Header with controls */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Script {i + 1}</span>
                        {script.isLocked && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                        {script.audioUrl && (
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Audio Ready
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleLockScript(script.id)}
                          className="h-8 w-8 p-0"
                          title={script.isLocked ? "Unlock script" : "Lock script"}
                        >
                          {script.isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(script.vocalizedText || script.correctedText || script.originalText)}
                          className="h-8 w-8 p-0"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        {!script.isLocked && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteScript(script.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete script"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Script text */}
                    <p className="text-sm text-muted-foreground p-2 rounded bg-background/50 mb-3" dir="rtl">
                      {script.vocalizedText || script.correctedText || script.originalText}
                    </p>

                    {/* Audio Player */}
                    <VoiceAudioPlayer
                      audioUrl={script.audioUrl}
                      isGenerating={script.status === 'generating'}
                      isLocked={script.isLocked}
                      onGenerate={() => generateVoiceover(script.id)}
                      onRegenerate={() => regenerateVoiceover(script.id)}
                      onDelete={() => deleteAudio(script.id)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No validated scripts available</p>
                <p className="text-xs mt-1">Validate scripts first in the "AI Validation" tab</p>
              </div>
            )}

            {/* Batch Generate All Button */}
            {scripts.filter(s => (s.correctedText || s.vocalizedText) && !s.audioUrl).length > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Generate All Voice-Overs</p>
                    <p className="text-xs text-muted-foreground">
                      {scripts.filter(s => (s.correctedText || s.vocalizedText) && !s.audioUrl).length} scripts without audio
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const scriptsToGenerate = scripts.filter(s => (s.correctedText || s.vocalizedText) && !s.audioUrl && !s.isLocked);
                      for (const script of scriptsToGenerate) {
                        await generateVoiceover(script.id);
                      }
                    }}
                    disabled={scripts.some(s => s.status === 'generating')}
                  >
                    {scripts.some(s => s.status === 'generating') ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 mr-1" />
                        Generate All
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
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
