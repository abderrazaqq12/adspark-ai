import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  Sparkles, 
  Loader2, 
  FileText, 
  Mic, 
  Video, 
  Wand2,
  CheckCircle2,
  Circle,
  ChevronRight,
  Palette,
  Globe,
  Save,
  Package,
  Play,
  Pause,
  Volume2,
  X,
  LayoutTemplate,
  RefreshCw,
  Lightbulb,
  Image,
  Layout,
  Trash2
} from "lucide-react";
import { StudioProductInput } from "@/components/studio/StudioProductInput";
import { StudioMarketingEngine } from "@/components/studio/StudioMarketingEngine";
import { StudioImageGeneration } from "@/components/studio/StudioImageGeneration";
import { StudioLandingPage } from "@/components/studio/StudioLandingPage";
import { StudioExport } from "@/components/studio/StudioExport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sceneRouting, videoTypes, exportFormats } from "@/data/aiModels";
import BatchGeneration from "@/components/BatchGeneration";
import AIAssistant from "@/components/AIAssistant";
import VoicePreview from "@/components/VoicePreview";
import { VideoUploadPreview, generateVideoId } from "@/components/VideoUploadPreview";
import BatchAssembly from "@/components/BatchAssembly";
import CostCalculatorPreview from "@/components/CostCalculatorPreview";
import { VideoVarietyEngine } from "@/components/VideoVarietyEngine";
import VideoTimelineEditor from "@/components/VideoTimelineEditor";
import { PipelineStatusIndicator } from "@/components/PipelineStatusIndicator";
import VideoGenerationStage from "@/components/VideoGenerationStage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RealTimeCostTracker } from "@/components/RealTimeCostTracker";
import { AIBrainRecommendations } from "@/components/AIBrainRecommendations";
import { PipelineJobsTracker } from "@/components/PipelineJobsTracker";
import { SmartDefaultsBanner } from "@/components/SmartDefaultsBanner";
import { useSmartDefaults } from "@/hooks/useSmartDefaults";
import { useRealTimeCost } from "@/hooks/useRealTimeCost";

// ElevenLabs voices - expanded list with categories
const ELEVENLABS_VOICES = [
  // Female voices - English
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", language: "en", gender: "female", accent: "American" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", language: "en", gender: "female", accent: "American" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", language: "en", gender: "female", accent: "British" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", language: "en", gender: "female", accent: "American" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", language: "en", gender: "female", accent: "American" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", language: "en", gender: "female", accent: "American" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", language: "en", gender: "female", accent: "American" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", language: "en", gender: "female", accent: "American" },
  { id: "jBpfuIE2acCO8z3wKNLl", name: "Gigi", language: "en", gender: "female", accent: "American" },
  { id: "z9fAnlkpzviPz146aGWa", name: "Glinda", language: "en", gender: "female", accent: "American" },
  { id: "oWAxZDx7w5VEj9dCyTzz", name: "Grace", language: "en", gender: "female", accent: "American" },
  { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", language: "en", gender: "female", accent: "British" },
  { id: "pMsXgVXv3BLzUgSXRplE", name: "Serena", language: "en", gender: "female", accent: "American" },
  
  // Male voices - English
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", language: "en", gender: "male", accent: "American" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", language: "en", gender: "male", accent: "Australian" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", language: "en", gender: "male", accent: "British" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", language: "en", gender: "male", accent: "American" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", language: "en", gender: "male", accent: "American" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", language: "en", gender: "male", accent: "American" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will", language: "en", gender: "male", accent: "American" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", language: "en", gender: "male", accent: "American" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", language: "en", gender: "male", accent: "American" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", language: "en", gender: "male", accent: "American" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", language: "en", gender: "male", accent: "British" },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", language: "en", gender: "male", accent: "American" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", language: "en", gender: "male", accent: "American" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", language: "en", gender: "male", accent: "American" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", language: "en", gender: "male", accent: "American" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", language: "en", gender: "male", accent: "American" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", language: "en", gender: "male", accent: "American" },
  { id: "g5CIjZEefAph4nQFvHAz", name: "Ethan", language: "en", gender: "male", accent: "American" },
  { id: "ODq5zmih8GrVes37Dizd", name: "Patrick", language: "en", gender: "male", accent: "American" },
  { id: "ZQe5CZNOzWyzPSCn5a3c", name: "James", language: "en", gender: "male", accent: "Australian" },
  
  // Multilingual voices
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", language: "es", gender: "female", accent: "Spanish" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", language: "fr", gender: "female", accent: "French" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", language: "ar", gender: "female", accent: "Arabic" },
  { id: "GBv7mTt0atIp3Br8iCZE", name: "Thomas", language: "fr", gender: "male", accent: "French" },
  { id: "Zlb1dXrM653N07WRdFW3", name: "Freya", language: "en", gender: "female", accent: "American" },
  { id: "jsCqWAovK2LkecY7zXl4", name: "Emily", language: "en", gender: "female", accent: "American" },
  { id: "flq6f7yk4E4fJM5XTYuZ", name: "Michael", language: "en", gender: "male", accent: "American" },
];

const ELEVENLABS_MODELS = [
  { id: "eleven_multilingual_v2", name: "Multilingual v2", description: "29 languages, most life-like" },
  { id: "eleven_flash_v2_5", name: "Flash v2.5", description: "32 languages, ultra-fast" },
  { id: "eleven_flash_v2", name: "Flash v2 (v3 Legacy)", description: "Low latency streaming" },
  { id: "eleven_turbo_v2_5", name: "Turbo v2.5", description: "32 languages, low latency" },
  { id: "eleven_turbo_v2", name: "Turbo v2", description: "English only, fastest" },
  { id: "eleven_monolingual_v1", name: "English v1", description: "Legacy English model" },
  { id: "eleven_multilingual_v1", name: "Multilingual v1", description: "10 languages, legacy" },
];

const VOICE_LANGUAGES = [
  { id: "en", name: "English" },
  { id: "ar", name: "Arabic (العربية)" },
  { id: "bg", name: "Bulgarian (Български)" },
  { id: "zh", name: "Chinese (中文)" },
  { id: "hr", name: "Croatian (Hrvatski)" },
  { id: "cs", name: "Czech (Čeština)" },
  { id: "da", name: "Danish (Dansk)" },
  { id: "nl", name: "Dutch (Nederlands)" },
  { id: "fi", name: "Finnish (Suomi)" },
  { id: "fr", name: "French (Français)" },
  { id: "de", name: "German (Deutsch)" },
  { id: "el", name: "Greek (Ελληνικά)" },
  { id: "hi", name: "Hindi (हिन्दी)" },
  { id: "hu", name: "Hungarian (Magyar)" },
  { id: "id", name: "Indonesian (Bahasa)" },
  { id: "it", name: "Italian (Italiano)" },
  { id: "ja", name: "Japanese (日本語)" },
  { id: "ko", name: "Korean (한국어)" },
  { id: "ms", name: "Malay (Bahasa Melayu)" },
  { id: "no", name: "Norwegian (Norsk)" },
  { id: "pl", name: "Polish (Polski)" },
  { id: "pt", name: "Portuguese (Português)" },
  { id: "ro", name: "Romanian (Română)" },
  { id: "ru", name: "Russian (Русский)" },
  { id: "sk", name: "Slovak (Slovenčina)" },
  { id: "es", name: "Spanish (Español)" },
  { id: "sv", name: "Swedish (Svenska)" },
  { id: "ta", name: "Tamil (தமிழ்)" },
  { id: "th", name: "Thai (ไทย)" },
  { id: "tr", name: "Turkish (Türkçe)" },
  { id: "uk", name: "Ukrainian (Українська)" },
  { id: "vi", name: "Vietnamese (Tiếng Việt)" },
];

interface ElevenLabsVoice {
  id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

// Production pipeline stages - includes Studio steps before video creation
const pipelineStages = [
  { id: 0, key: 'studio-product', name: "Product Input", icon: Package, description: "Product details & targeting", required: true },
  { id: 1, key: 'studio-content', name: "Product Content", icon: Lightbulb, description: "Angles, scripts & content", required: false },
  { id: 2, key: 'studio-images', name: "Image Generation", icon: Image, description: "Product images & mockups", required: false },
  { id: 3, key: 'studio-landing', name: "Landing Page", icon: Layout, description: "Sales page content", required: false },
  { id: 4, key: 'scripts', name: "Video Script Text & Audio", icon: Mic, description: "Voice-over scripts and audio", required: true },
  { id: 5, key: 'scenes', name: "Scene Builder", icon: Wand2, description: "AI breaks down script into visual scenes", required: true },
  { id: 6, key: 'video-gen', name: "Video Generation", icon: Video, description: "AI creates video for each scene", required: true },
  { id: 7, key: 'assembly', name: "Assembly & Edit", icon: Palette, description: "Combine, sync, add branding", required: true },
  { id: 8, key: 'export', name: "Export", icon: Globe, description: "Multi-format export", required: true },
];

interface ScriptSlot {
  id: number;
  text: string;
  audioFile: File | null;
  audioUrl: string | null;
  generatedAudioUrl: string | null;
  isGenerating: boolean;
}

interface ProductInfo {
  name: string;
  description: string;
  imageUrl: string;
  link: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  category: string | null;
  template_text: string;
}

export default function CreateVideo() {
  // Product Info state
  const [productInfo, setProductInfo] = useState<ProductInfo>({
    name: "",
    description: "",
    imageUrl: "",
    link: "",
  });
  
  const [scriptSlots, setScriptSlots] = useState<ScriptSlot[]>([
    { id: 1, text: "", audioFile: null, audioUrl: null, generatedAudioUrl: null, isGenerating: false }
  ]);
  
  // Voice settings
  const [selectedVoice, setSelectedVoice] = useState("EXAVITQu4vr4xnSDxMaL"); // Sarah
  const [selectedModel, setSelectedModel] = useState("eleven_multilingual_v2");
  const [voiceLanguage, setVoiceLanguage] = useState("en");
  
  const [currentStage, setCurrentStage] = useState(0);
  const [expandedStage, setExpandedStage] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scenes, setScenes] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["9:16", "16:9", "1:1"]);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<Record<number, HTMLAudioElement>>({});
  const [myVoices, setMyVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [voiceSource, setVoiceSource] = useState<'library' | 'my'>('library');
  
  // Template state
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isGeneratingFromTemplates, setIsGeneratingFromTemplates] = useState(false);

  // Video upload state
  const [uploadedVideos, setUploadedVideos] = useState<Array<{
    id: string;
    file: File;
    url: string;
    thumbnail: string | null;
    type: 'scene' | 'broll';
    duration: number | null;
  }>>([]);

  // Assembly options state
  const [videosToGenerate, setVideosToGenerate] = useState(10);
  const [transitionStyle, setTransitionStyle] = useState('mixed');
  const [randomizeOrder, setRandomizeOrder] = useState(true);
  const [autoAddMusic, setAutoAddMusic] = useState(true);
  
  // Cost & engine preferences
  const [freeEnginesOnly, setFreeEnginesOnly] = useState(true);
  
  // Timeline editor state
  const [showTimelineEditor, setShowTimelineEditor] = useState(false);

  // Confirmation dialog state
  const [showClearPipelineDialog, setShowClearPipelineDialog] = useState(false);

  // Smart defaults and cost tracking hooks
  const { defaults, recordChoice, getDefaultForContext, suggestEngine } = useSmartDefaults(projectId || undefined);
  const { costs, projectCost, estimatedTotal, recordCost } = useRealTimeCost(projectId || undefined);

  // Clear functions for each stage
  const clearStageData = (stageId: number) => {
    switch (stageId) {
      case 0:
        setProductInfo({ name: "", description: "", imageUrl: "", link: "" });
        toast.success("Product input cleared");
        break;
      case 1:
        // Product content is stored in the StudioMarketingEngine component, reset by remounting
        toast.success("Product content cleared");
        break;
      case 2:
        // Image generation is stored in the StudioImageGeneration component, reset by remounting
        toast.success("Image generation cleared");
        break;
      case 3:
        // Landing page content is stored in the StudioLandingPage component, reset by remounting
        toast.success("Landing page cleared");
        break;
      case 4:
        setScriptSlots([{ id: 1, text: "", audioFile: null, audioUrl: null, generatedAudioUrl: null, isGenerating: false }]);
        toast.success("Scripts cleared");
        break;
      case 5:
        setScenes([]);
        toast.success("Scenes cleared");
        break;
      case 6:
        setUploadedVideos([]);
        toast.success("Video generation cleared");
        break;
      case 7:
        // Assembly settings
        setVideosToGenerate(10);
        setTransitionStyle('mixed');
        setRandomizeOrder(true);
        setAutoAddMusic(true);
        toast.success("Assembly settings reset");
        break;
      case 8:
        setSelectedFormats(["9:16", "16:9", "1:1"]);
        toast.success("Export settings reset");
        break;
    }
  };

  const clearAllPipelineData = () => {
    setProductInfo({ name: "", description: "", imageUrl: "", link: "" });
    setScriptSlots([{ id: 1, text: "", audioFile: null, audioUrl: null, generatedAudioUrl: null, isGenerating: false }]);
    setScenes([]);
    setUploadedVideos([]);
    setCurrentStage(0);
    setExpandedStage(0);
    setSelectedTemplates([]);
    setShowClearPipelineDialog(false);
    toast.success("Pipeline reset - all data cleared");
  };

  // Load existing project, voices, and templates
  useEffect(() => {
    loadLatestProject();
    loadMyVoices();
    loadTemplates();
  }, []);

  const loadLatestProject = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, product_name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (projects && projects.length > 0) {
      setProjectId(projects[0].id);
      if (projects[0].product_name) {
        setProductInfo(prev => ({ ...prev, name: projects[0].product_name || "" }));
      }
      
      // Load script for this project
      const { data: scripts } = await supabase
        .from("scripts")
        .select("id, raw_text")
        .eq("project_id", projects[0].id)
        .limit(1);

      if (scripts && scripts.length > 0) {
        setScriptId(scripts[0].id);
        if (scripts[0].raw_text) {
          setScriptSlots([{ id: 1, text: scripts[0].raw_text, audioFile: null, audioUrl: null, generatedAudioUrl: null, isGenerating: false }]);
        }
        
        // Load scenes
        const { data: scenesData } = await supabase
          .from("scenes")
          .select("*")
          .eq("script_id", scripts[0].id)
          .order("index");

        if (scenesData && scenesData.length > 0) {
          setScenes(scenesData.map(s => ({
            title: `Scene ${s.index + 1}`,
            description: s.text,
            duration: s.duration_sec,
            visualPrompt: s.visual_prompt,
          })));
          setCurrentStage(5);
        }
      }
    }
  };

  const loadMyVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-voiceover", {
        body: { action: 'get_voices' },
      });

      if (error) throw error;

      if (data.my_voices && data.my_voices.length > 0) {
        setMyVoices(data.my_voices);
      }
    } catch (error: any) {
      console.error("Error loading voices:", error);
      // Don't show error toast - it's optional
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from("prompt_templates")
        .select("id, name, category, template_text")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error loading templates:", error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : prev.length < 20 ? [...prev, templateId] : prev
    );
  };

  const generateScriptsFromTemplates = async () => {
    if (!productInfo.name.trim()) {
      toast.error("Please enter product name first");
      setExpandedStage(0);
      return;
    }

    if (selectedTemplates.length === 0) {
      toast.error("Please select at least one template");
      return;
    }

    setIsGeneratingFromTemplates(true);
    const newSlots: ScriptSlot[] = [];
    let successCount = 0;

    try {
      for (let i = 0; i < selectedTemplates.length; i++) {
        const templateId = selectedTemplates[i];
        const template = templates.find(t => t.id === templateId);
        if (!template) continue;

        // Fill template variables with product info
        let filledPrompt = template.template_text
          .replace(/\{\{product_name\}\}/g, productInfo.name)
          .replace(/\{\{audience\}\}/g, "general consumers")
          .replace(/\{\{benefits\}\}/g, productInfo.description || "quality and value")
          .replace(/\{\{problem\}\}/g, "common pain points")
          .replace(/\{\{cta\}\}/g, "Shop now!")
          .replace(/\{\{brand_tone\}\}/g, "engaging and professional")
          .replace(/\{\{offer\}\}/g, "limited time offer")
          .replace(/\{\{language\}\}/g, voiceLanguage === 'ar' ? 'Arabic' : voiceLanguage === 'es' ? 'Spanish' : 'English');

        const { data, error } = await supabase.functions.invoke("generate-script-from-product", {
          body: {
            productName: productInfo.name,
            productDescription: filledPrompt,
            productImageUrl: productInfo.imageUrl,
            productLink: productInfo.link,
            language: voiceLanguage,
            tone: template.name,
          },
        });

        if (!error && data.script) {
          newSlots.push({
            id: scriptSlots.length + i + 1,
            text: data.script,
            audioFile: null,
            audioUrl: null,
            generatedAudioUrl: null,
            isGenerating: false,
          });
          successCount++;
        }
      }

      if (newSlots.length > 0) {
        // Replace existing empty slots or add new ones
        const existingNonEmpty = scriptSlots.filter(s => s.text.trim());
        const combined = [...existingNonEmpty, ...newSlots].slice(0, 20);
        
        // Renumber IDs
        setScriptSlots(combined.map((slot, idx) => ({ ...slot, id: idx + 1 })));
        toast.success(`Generated ${successCount} scripts from templates!`);
        setSelectedTemplates([]);
      }
    } catch (error: any) {
      console.error("Error generating from templates:", error);
      toast.error(error.message || "Failed to generate scripts");
    } finally {
      setIsGeneratingFromTemplates(false);
    }
  };
  const generateScriptFromProduct = async (slotId: number) => {
    if (!productInfo.name.trim()) {
      toast.error("Please enter product name first");
      setExpandedStage(4);
      return;
    }

    setIsGeneratingScript(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-script-from-product", {
        body: {
          productName: productInfo.name,
          productDescription: productInfo.description,
          productImageUrl: productInfo.imageUrl,
          productLink: productInfo.link,
          language: voiceLanguage,
        },
      });

      if (error) throw error;

      if (data.script) {
        updateScriptSlot(slotId, "text", data.script);
        toast.success(`Script generated! (~${data.estimated_duration_seconds}s)`);
      }
    } catch (error: any) {
      console.error("Error generating script:", error);
      toast.error(error.message || "Failed to generate script");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const addScriptSlot = () => {
    if (scriptSlots.length >= 20) {
      toast.error("Maximum 20 scripts allowed");
      return;
    }
    setScriptSlots([...scriptSlots, { 
      id: scriptSlots.length + 1, 
      text: "", 
      audioFile: null, 
      audioUrl: null,
      generatedAudioUrl: null,
      isGenerating: false
    }]);
  };

  const removeScriptSlot = (id: number) => {
    if (scriptSlots.length <= 1) return;
    setScriptSlots(scriptSlots.filter(slot => slot.id !== id));
  };

  const updateScriptSlot = (id: number, field: keyof ScriptSlot, value: any) => {
    setScriptSlots(scriptSlots.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const handleAudioUpload = (id: number, file: File) => {
    const url = URL.createObjectURL(file);
    updateScriptSlot(id, "audioFile", file);
    updateScriptSlot(id, "audioUrl", url);
  };

  const generateVoiceover = async (slotId: number) => {
    const slot = scriptSlots.find(s => s.id === slotId);
    if (!slot || !slot.text.trim()) {
      toast.error("Please enter script text first");
      return;
    }

    updateScriptSlot(slotId, "isGenerating", true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-voiceover", {
        body: {
          text: slot.text,
          language: voiceLanguage,
          voiceId: selectedVoice,
          model: selectedModel,
          scriptId: scriptId,
        },
      });

      if (error) throw error;

      if (data.audio_url) {
        updateScriptSlot(slotId, "generatedAudioUrl", data.audio_url);
        toast.success("Voice-over generated!");
      } else if (data.audio_base64) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        updateScriptSlot(slotId, "generatedAudioUrl", audioUrl);
        toast.success("Voice-over generated!");
      }
    } catch (error: any) {
      console.error("Error generating voiceover:", error);
      toast.error(error.message || "Failed to generate voice-over");
    } finally {
      updateScriptSlot(slotId, "isGenerating", false);
    }
  };

  const playAudio = (slotId: number, url: string) => {
    // Stop any currently playing audio
    if (playingAudio !== null && audioElements[playingAudio]) {
      audioElements[playingAudio].pause();
      audioElements[playingAudio].currentTime = 0;
    }

    if (playingAudio === slotId) {
      setPlayingAudio(null);
      return;
    }

    let audio = audioElements[slotId];
    if (!audio) {
      audio = new Audio(url);
      audio.onended = () => setPlayingAudio(null);
      setAudioElements(prev => ({ ...prev, [slotId]: audio }));
    }
    
    audio.play();
    setPlayingAudio(slotId);
  };

  const handleAnalyzeScript = async () => {
    const allScripts = scriptSlots.map(s => s.text).filter(t => t.trim()).join("\n\n---\n\n");
    if (!allScripts.trim()) {
      toast.error("Please enter at least one script");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-script", {
        body: { script: allScripts },
      });

      if (error) throw error;

      setScenes(data.scenes || []);
      setCurrentStage(5);
      setExpandedStage(5);
      toast.success("Scripts analyzed successfully!");
    } catch (error: any) {
      console.error("Error analyzing script:", error);
      toast.error(error.message || "Failed to analyze scripts");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveProjectAndScenes = async () => {
    if (!productInfo.name.trim()) {
      toast.error("Please enter a product name first");
      setExpandedStage(4);
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save");
        return;
      }

      let currentProjectId = projectId;
      let currentScriptId = scriptId;

      // Create project if needed
      if (!currentProjectId) {
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            name: productInfo.name,
            product_name: productInfo.name,
            language: voiceLanguage,
            status: "draft",
            settings: {
              product_description: productInfo.description,
              product_image_url: productInfo.imageUrl,
              product_link: productInfo.link,
            }
          })
          .select()
          .single();

        if (projectError) throw projectError;
        currentProjectId = project.id;
        setProjectId(project.id);

        // Create Google Drive folder if configured
        const { data: userSettings } = await supabase
          .from("user_settings")
          .select("preferences")
          .eq("user_id", user.id)
          .single();

        if (userSettings?.preferences) {
          const prefs = userSettings.preferences as Record<string, any>;
          if (prefs.google_drive_folder_url) {
            // Trigger Google Drive folder creation (would need a separate edge function)
            console.log("Would create Google Drive folder for:", productInfo.name);
          }
        }
      }

      // Create or update script
      const allScriptsText = scriptSlots.map(s => s.text).filter(t => t.trim()).join("\n\n---\n\n");
      if (!currentScriptId) {
        const { data: scriptData, error: scriptError } = await supabase
          .from("scripts")
          .insert({
            project_id: currentProjectId,
            raw_text: allScriptsText,
            language: voiceLanguage,
            status: "analyzed",
          })
          .select()
          .single();

        if (scriptError) throw scriptError;
        currentScriptId = scriptData.id;
        setScriptId(scriptData.id);
      } else {
        await supabase
          .from("scripts")
          .update({ raw_text: allScriptsText })
          .eq("id", currentScriptId);
      }

      // Delete existing scenes for this script
      await supabase.from("scenes").delete().eq("script_id", currentScriptId);

      // Insert new scenes
      const scenesToInsert = scenes.map((scene, index) => ({
        script_id: currentScriptId,
        index,
        text: scene.description || scene.title,
        scene_type: "broll",
        visual_prompt: scene.visualPrompt || null,
        duration_sec: scene.duration || 5,
        status: "pending",
      }));

      const { error: scenesError } = await supabase
        .from("scenes")
        .insert(scenesToInsert);

      if (scenesError) throw scenesError;

      toast.success("Project and scenes saved!");
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  const canProceedFromProductInfo = productInfo.name.trim().length > 0;
  const hasAnyScript = scriptSlots.some(s => s.text.trim() || s.audioUrl || s.generatedAudioUrl);

  return (
    <div className="flex min-h-screen animate-in fade-in duration-500">
      {/* Vertical Pipeline Sidebar */}
      <div className="w-64 shrink-0 border-r border-border bg-gradient-card p-4">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
              <p className="text-xs text-muted-foreground">Production stages</p>
            </div>
            <AlertDialog open={showClearPipelineDialog} onOpenChange={setShowClearPipelineDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Clear all pipeline data"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Pipeline Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all stages including product info, scripts, scenes, and videos. 
                    This action only affects the dashboard view, not your database or Google Sheets.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllPipelineData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {/* Progress Indicator */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-primary">{Math.round((currentStage / (pipelineStages.length - 1)) * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-primary transition-all duration-500 ease-out"
                style={{ width: `${(currentStage / (pipelineStages.length - 1)) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {currentStage} of {pipelineStages.length - 1} steps completed
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {pipelineStages.map((stage, index) => (
            <div key={stage.id} className="flex flex-col">
              <div className="flex items-center group">
                <button
                  onClick={() => {
                    setExpandedStage(stage.id);
                    setCurrentStage(stage.id);
                  }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left flex-1 cursor-pointer ${
                    expandedStage === stage.id 
                      ? 'bg-primary/20 text-primary' 
                      : currentStage > stage.id || currentStage === stage.id
                        ? 'bg-primary/10 text-primary hover:bg-primary/20'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {currentStage > stage.id ? (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  ) : expandedStage === stage.id ? (
                    <stage.icon className="w-5 h-5 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 opacity-50 shrink-0" />
                  )}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium">{stage.name}</span>
                    <span className={`text-[10px] ${stage.required ? 'text-destructive/80' : 'text-muted-foreground'}`}>
                      {stage.required ? '● Required' : '○ Optional'}
                    </span>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearStageData(stage.id);
                  }}
                  title={`Clear ${stage.name}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {index < pipelineStages.length - 1 && (
                <div className="ml-6 h-4 border-l-2 border-muted-foreground/20" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 space-y-8 overflow-auto">
        <div className="flex items-end justify-end">
          <PipelineStatusIndicator 
            pipelineStatus={{
              product_info: currentStage > 0 ? 'completed' : expandedStage === 0 ? 'in_progress' : 'pending',
              scripts: currentStage > 4 ? 'completed' : expandedStage === 4 ? 'in_progress' : 'pending',
              scenes: currentStage > 5 ? 'completed' : expandedStage === 5 ? 'in_progress' : 'pending',
              video_generation: currentStage > 6 ? 'completed' : expandedStage === 6 ? 'in_progress' : 'pending',
              assembly: currentStage > 7 ? 'completed' : expandedStage === 7 ? 'in_progress' : 'pending',
              export: currentStage > 8 ? 'completed' : expandedStage === 8 ? 'in_progress' : 'pending',
            }}
            currentStage={expandedStage}
            onStageClick={(stageId, index) => setExpandedStage(index)}
            compact={true}
          />
        </div>

        {/* Smart Defaults Banner - only show when not on Product Input stage */}
        {expandedStage !== 0 && (
          <SmartDefaultsBanner 
            projectId={projectId || undefined} 
            onApplyDefaults={(appliedDefaults) => {
              if (appliedDefaults.preferredVoice) {
                setSelectedVoice(appliedDefaults.preferredVoice);
              }
              if (appliedDefaults.variationsPerProject) {
                setVideosToGenerate(appliedDefaults.variationsPerProject);
              }
              toast.success('Smart defaults applied!');
            }}
          />
        )}

        <div className="flex flex-col gap-6">
          {/* Stage 0: Studio Product Input */}
          {expandedStage === 0 && (
            <StudioProductInput 
              onNext={() => {
                setExpandedStage(1);
                setCurrentStage(1);
              }}
              onProjectCreated={(newProjectId) => {
                setProjectId(newProjectId);
              }}
              productInfo={productInfo}
              onProductInfoChange={(info) => {
                setProductInfo(info);
              }}
            />
          )}

          {/* Stage 1: Studio Product Content (Optional) */}
          {expandedStage === 1 && (
            <div className="space-y-4">
              <StudioMarketingEngine onNext={() => {
                setExpandedStage(2);
                setCurrentStage(2);
              }} />
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setExpandedStage(2);
                  setCurrentStage(Math.max(currentStage, 2));
                }}
              >
                Skip this step →
              </Button>
            </div>
          )}

          {/* Stage 2: Studio Image Generation (Optional) */}
          {expandedStage === 2 && (
            <div className="space-y-4">
              <StudioImageGeneration 
                onNext={() => {
                  setExpandedStage(3);
                  setCurrentStage(3);
                }}
                projectId={projectId}
              />
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setExpandedStage(3);
                  setCurrentStage(Math.max(currentStage, 3));
                }}
              >
                Skip this step →
              </Button>
            </div>
          )}

          {/* Stage 3: Studio Landing Page (Optional) */}
          {expandedStage === 3 && (
            <div className="space-y-4">
              <StudioLandingPage onNext={() => {
                setExpandedStage(4);
                setCurrentStage(4);
              }} />
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setExpandedStage(4);
                  setCurrentStage(Math.max(currentStage, 4));
                }}
              >
                Skip this step →
              </Button>
            </div>
          )}

          {/* Stage 4: Video Script Text & Audio */}
          {expandedStage === 4 && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Mic className="w-5 h-5 text-primary" />
                  Video Script Text & Audio
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter voice-over scripts or upload audio files. Generate AI voice with ElevenLabs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Voice Settings */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    ElevenLabs Voice Settings
                  </h4>
                  
                  {/* Voice Source Toggle */}
                  <div className="flex gap-2">
                    <Button 
                      variant={voiceSource === 'library' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setVoiceSource('library')}
                    >
                      Library Voices
                    </Button>
                    <Button 
                      variant={voiceSource === 'my' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setVoiceSource('my')}
                      disabled={myVoices.length === 0}
                    >
                      My Voices {myVoices.length > 0 && `(${myVoices.length})`}
                    </Button>
                    {isLoadingVoices && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground text-xs">Voice</Label>
                      <div className="flex gap-2">
                        <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                          <SelectTrigger className="bg-muted/50 flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {voiceSource === 'library' ? (
                              ELEVENLABS_VOICES.map((voice) => (
                                <SelectItem key={voice.id} value={voice.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{voice.name}</span>
                                    <Badge variant="outline" className="text-[10px] px-1">
                                      {voice.accent}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              myVoices.map((voice) => (
                                <SelectItem key={voice.id} value={voice.id}>
                                  {voice.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <VoicePreview
                          voiceId={selectedVoice}
                          voiceName={
                            voiceSource === 'library'
                              ? ELEVENLABS_VOICES.find(v => v.id === selectedVoice)?.name || 'Voice'
                              : myVoices.find(v => v.id === selectedVoice)?.name || 'Voice'
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground text-xs">Language</Label>
                      <Select value={voiceLanguage} onValueChange={setVoiceLanguage}>
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VOICE_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.id} value={lang.id}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground text-xs">Model</Label>
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ELEVENLABS_MODELS.map((model) => (
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

                {/* Script Template Selection */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-primary" />
                      Script Templates
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {selectedTemplates.length} selected
                      </Badge>
                      {isLoadingTemplates && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Select templates to batch generate multiple script variations. Choose up to 20 templates.
                  </p>

                  {templates.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTemplates.includes(template.id)
                              ? 'bg-primary/10 border-primary/50'
                              : 'bg-muted/20 border-border hover:bg-muted/40'
                          }`}
                          onClick={() => toggleTemplateSelection(template.id)}
                        >
                          <Checkbox
                            checked={selectedTemplates.includes(template.id)}
                            onCheckedChange={() => toggleTemplateSelection(template.id)}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {template.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {template.category || 'General'} • {template.template_text.slice(0, 50)}...
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No templates found. Create templates in Prompt Templates page.
                    </div>
                  )}

                  {selectedTemplates.length > 0 && (
                    <Button
                      onClick={generateScriptsFromTemplates}
                      disabled={isGeneratingFromTemplates || !productInfo.name.trim()}
                      className="w-full bg-gradient-primary hover:opacity-90"
                    >
                      {isGeneratingFromTemplates ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating {selectedTemplates.length} Scripts...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Generate {selectedTemplates.length} Scripts from Templates
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Scripts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">Voice-Over Scripts ({scriptSlots.length}/20)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addScriptSlot}
                      disabled={scriptSlots.length >= 20}
                      className="text-xs"
                    >
                      + Add Script
                    </Button>
                  </div>
                  
                  {scriptSlots.map((slot, idx) => (
                    <div key={slot.id} className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Script {idx + 1}</span>
                        {scriptSlots.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeScriptSlot(slot.id)}
                            className="text-destructive hover:text-destructive h-6 px-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <Textarea
                        placeholder="Enter your voice-over script here... (~60 words = 30 seconds)"
                        className="min-h-[100px] bg-muted/50 border-input resize-none"
                        value={slot.text}
                        onChange={(e) => updateScriptSlot(slot.id, "text", e.target.value)}
                      />
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {slot.text.split(/\s+/).filter(Boolean).length} words • ~{Math.round(slot.text.split(/\s+/).filter(Boolean).length / 2)}s
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Generate Script Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateScriptFromProduct(slot.id)}
                            disabled={isGeneratingScript || !productInfo.name.trim()}
                            className="text-xs"
                          >
                            {isGeneratingScript ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Writing...
                              </>
                            ) : (
                              <>
                                <FileText className="w-3 h-3 mr-1" />
                                Generate Script
                              </>
                            )}
                          </Button>

                          {/* Generate Voice Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateVoiceover(slot.id)}
                            disabled={slot.isGenerating || !slot.text.trim()}
                            className="text-xs"
                          >
                            {slot.isGenerating ? (
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

                          {/* Play Generated Voice Button - shown after generation */}
                          {slot.generatedAudioUrl && !slot.audioUrl && (
                            <Button
                              variant={playingAudio === slot.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => playAudio(slot.id, slot.generatedAudioUrl!)}
                              className={`text-xs ${playingAudio === slot.id ? 'bg-primary text-primary-foreground' : ''}`}
                            >
                              {playingAudio === slot.id ? (
                                <>
                                  <Pause className="w-3 h-3 mr-1" />
                                  Playing
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 mr-1" />
                                  Play Voice
                                </>
                              )}
                            </Button>
                          )}

                          {/* Upload Audio */}
                          {!slot.audioUrl && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleAudioUpload(slot.id, file);
                                }}
                              />
                              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                                <Upload className="w-3 h-3 mr-1" />
                                Upload Audio
                              </Badge>
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Audio Player for Uploaded Audio */}
                      {slot.audioUrl && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playAudio(slot.id, slot.audioUrl!)}
                            className="h-8 w-8 p-0"
                          >
                            {playingAudio === slot.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <span className="text-xs text-primary flex-1">Uploaded audio ready</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              updateScriptSlot(slot.id, "audioFile", null);
                              updateScriptSlot(slot.id, "audioUrl", null);
                            }}
                            className="h-6 px-2 text-xs text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      )}

                      {/* Audio Player for Generated Audio */}
                      {slot.generatedAudioUrl && !slot.audioUrl && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playAudio(slot.id, slot.generatedAudioUrl!)}
                            className="h-8 w-8 p-0"
                          >
                            {playingAudio === slot.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <span className="text-xs text-primary flex-1">AI voice-over ready</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateScriptSlot(slot.id, "generatedAudioUrl", null)}
                            className="h-6 px-2 text-xs text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAnalyzeScript}
                    disabled={isAnalyzing || !hasAnyScript}
                    className="flex-1 bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze & Build Scenes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stage 5: Scene Builder */}
          {expandedStage === 5 && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  Scene Builder
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Configure video type and review AI-generated scenes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Video Type, Language & Marketing Hooks - Moved here from Step 1 */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Video Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Video Type</Label>
                      <Select defaultValue="ugc_review">
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {["UGC & Social Proof", "Product & Educational", "Creative & Engagement"].map(category => (
                            <div key={category}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">{category}</div>
                              {videoTypes.filter(t => t.category === category).map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Video Language</Label>
                      <Select defaultValue="en">
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ar">Arabic (العربية)</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish (Español)</SelectItem>
                          <SelectItem value="fr">French (Français)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Marketing Hooks</Label>
                    <div className="flex gap-2 mb-2">
                      <Button variant="outline" size="sm" className="bg-gradient-primary text-primary-foreground">
                        Automatic (AI Generated)
                      </Button>
                      <Button variant="outline" size="sm">
                        Manual
                      </Button>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm text-primary">
                        AI will automatically generate attention-grabbing hooks based on your script and product
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cost Calculator */}
                <CostCalculatorPreview
                  scenesCount={scenes.length || 5}
                  avgDuration={5}
                  videoCount={videosToGenerate}
                  onFreeOnlyChange={setFreeEnginesOnly}
                />

                {/* Scenes organized by script */}
                {scenes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a script and click "Analyze & Build Scenes" in Video Script Text & Audio</p>
                    <p className="text-xs mt-2">AI will auto-route each scene to the best {freeEnginesOnly ? 'free ' : ''}model</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Scenes grouped by script */}
                    {scriptSlots.filter(s => s.text.trim()).map((script, scriptIndex) => {
                      // Calculate which scenes belong to this script
                      const scenesPerScript = Math.ceil(scenes.length / scriptSlots.filter(s => s.text.trim()).length);
                      const startIdx = scriptIndex * scenesPerScript;
                      const endIdx = Math.min(startIdx + scenesPerScript, scenes.length);
                      const scriptScenes = scenes.slice(startIdx, endIdx);

                      if (scriptScenes.length === 0) return null;

                      return (
                        <div key={script.id} className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                              Script {scriptIndex + 1}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {scriptScenes.length} scenes • ~{scriptScenes.reduce((acc, s) => acc + (s.duration || 5), 0)}s
                            </span>
                          </div>
                          
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {scriptScenes.map((scene, idx) => {
                              const globalIndex = startIdx + idx;
                              const routing = sceneRouting.find(r => 
                                scene.title?.toLowerCase().includes(r.sceneType.replace('_', ' ')) ||
                                scene.description?.toLowerCase().includes(r.sceneType.replace('_', ' '))
                              ) || sceneRouting[5];
                              
                              // Select free model if freeEnginesOnly
                              const selectedModel = freeEnginesOnly ? 'NanoBanana' : routing.recommendedModel;
                              
                              return (
                                <div
                                  key={globalIndex}
                                  className="p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/50 transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                                      {globalIndex + 1}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-foreground">{scene.title}</h4>
                                        <div className="flex items-center gap-2">
                                          <Badge className={`border-0 text-xs ${freeEnginesOnly ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                                            {selectedModel}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            {scene.duration}s
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{scene.description}</p>
                                      {scene.visualPrompt && (
                                        <div className="mt-2 p-2 rounded bg-muted/50 border border-border">
                                          <p className="text-xs text-muted-foreground">
                                            <span className="text-primary font-medium">Visual: </span>
                                            {scene.visualPrompt}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {scenes.length > 0 && (
                  <Button
                    onClick={() => {
                      setExpandedStage(6);
                      setCurrentStage(6);
                    }}
                    className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
                  >
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Next: Generate Videos
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage 6: Video Generation */}
          {expandedStage === 6 && scriptId && (
            <VideoGenerationStage 
              scriptId={scriptId}
              onComplete={() => {
                setExpandedStage(7);
                setCurrentStage(7);
              }}
            />
          )}

          {/* Stage 6 Fallback - Upload when no scriptId */}
          {expandedStage === 6 && !scriptId && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  Video Generation
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Generate video for each scene using AI engines or upload your own
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Custom Video Upload Section */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      Upload Your Own Videos
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {uploadedVideos.length} uploaded
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Already have video content? Upload videos to use as scenes or B-roll footage.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            const newVideos = files.map(file => ({
                              id: generateVideoId(),
                              file,
                              url: URL.createObjectURL(file),
                              thumbnail: null,
                              type: 'scene' as const,
                              duration: null,
                            }));
                            setUploadedVideos(prev => [...prev, ...newVideos]);
                            toast.success(`${files.length} scene video(s) added`);
                          }
                        }}
                      />
                      <div className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors text-center">
                        <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Scene Videos</p>
                        <p className="text-xs text-muted-foreground">Main scene content</p>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            const newVideos = files.map(file => ({
                              id: generateVideoId(),
                              file,
                              url: URL.createObjectURL(file),
                              thumbnail: null,
                              type: 'broll' as const,
                              duration: null,
                            }));
                            setUploadedVideos(prev => [...prev, ...newVideos]);
                            toast.success(`${files.length} B-roll video(s) added`);
                          }
                        }}
                      />
                      <div className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">B-Roll Footage</p>
                        <p className="text-xs text-muted-foreground">Supplementary clips</p>
                      </div>
                    </label>
                  </div>

                  {/* Video Thumbnails Preview */}
                  {uploadedVideos.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <VideoUploadPreview
                        videos={uploadedVideos}
                        onRemove={(id) => {
                          const video = uploadedVideos.find(v => v.id === id);
                          if (video) URL.revokeObjectURL(video.url);
                          setUploadedVideos(prev => prev.filter(v => v.id !== id));
                        }}
                        type="scene"
                      />
                      <VideoUploadPreview
                        videos={uploadedVideos}
                        onRemove={(id) => {
                          const video = uploadedVideos.find(v => v.id === id);
                          if (video) URL.revokeObjectURL(video.url);
                          setUploadedVideos(prev => prev.filter(v => v.id !== id));
                        }}
                        type="broll"
                      />
                    </div>
                  )}
                </div>

                {scriptId ? (
                  <BatchGeneration 
                    scriptId={scriptId} 
                    scenesCount={scenes.length}
                    onComplete={() => toast.success("All videos generated!")}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Save your project first to start video generation</p>
                    <p className="text-xs mt-2">Complete earlier steps and save your project</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage 7: Assembly & Edit */}
          {expandedStage === 7 && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Assembly & Edit
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Combine scenes, sync audio, and generate multiple final videos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Batch Assembly Options */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Batch Video Assembly
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Generate multiple final videos with different combinations of scenes and transitions
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Videos to Generate</Label>
                      <Select value={String(videosToGenerate)} onValueChange={(v) => setVideosToGenerate(Number(v))}>
                        <SelectTrigger className="bg-muted/50 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 videos</SelectItem>
                          <SelectItem value="10">10 videos</SelectItem>
                          <SelectItem value="25">25 videos</SelectItem>
                          <SelectItem value="50">50 videos</SelectItem>
                          <SelectItem value="100">100 videos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Transition Style</Label>
                      <Select value={transitionStyle} onValueChange={setTransitionStyle}>
                        <SelectTrigger className="bg-muted/50 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cut">Cut (No transition)</SelectItem>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="slide">Slide</SelectItem>
                          <SelectItem value="zoom">Zoom</SelectItem>
                          <SelectItem value="mixed">Mixed (Random)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div>
                      <p className="text-sm font-medium text-foreground">Randomize Scene Order</p>
                      <p className="text-xs text-muted-foreground">Create unique variations by shuffling scenes</p>
                    </div>
                    <Checkbox checked={randomizeOrder} onCheckedChange={(checked) => setRandomizeOrder(!!checked)} />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Auto-add Music</p>
                      <p className="text-xs text-muted-foreground">AI selects background music per video</p>
                    </div>
                    <Checkbox checked={autoAddMusic} onCheckedChange={(checked) => setAutoAddMusic(!!checked)} />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                    <p className="text-2xl font-bold text-primary">{scenes.length}</p>
                    <p className="text-xs text-muted-foreground">Scenes</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                    <p className="text-2xl font-bold text-primary">{Math.round(scenes.reduce((acc, s) => acc + (s.duration || 3), 0))}s</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                    <p className="text-2xl font-bold text-primary">{videosToGenerate}</p>
                    <p className="text-xs text-muted-foreground">Videos</p>
                  </div>
                </div>

                {/* Video Variety Engine - Generate 20-100 variations */}
                {projectId && (
                  <VideoVarietyEngine
                    projectId={projectId}
                    scriptId={scriptId || undefined}
                    scenesCount={scenes.length || 1}
                    onComplete={(variations) => {
                      toast.success(`Generated ${variations.length} video variations!`);
                    }}
                  />
                )}

                {/* Batch Assembly Component */}
                {scriptId ? (
                  <BatchAssembly
                    scriptId={scriptId}
                    scenesCount={scenes.length}
                    videosToGenerate={videosToGenerate}
                    transitionStyle={transitionStyle}
                    randomizeOrder={randomizeOrder}
                    autoAddMusic={autoAddMusic}
                    onComplete={() => {
                      toast.success("All videos assembled!");
                      setExpandedStage(8);
                      setCurrentStage(8);
                    }}
                  />
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Save your project first to start assembly</p>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    if (scenes.length === 0) {
                      toast.error("No scenes available. Generate scenes first in Scene Builder.");
                      return;
                    }
                    setShowTimelineEditor(true);
                  }}
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Open Timeline Editor
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stage 8: Export */}
          {expandedStage === 8 && (
            <StudioExport />
          )}

          {/* Save Button - shown when scenes exist */}
          {scenes.length > 0 && !scriptId && expandedStage <= 6 && (
            <Button
              onClick={saveProjectAndScenes}
              disabled={isSaving}
              className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Project & Scenes
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <AIAssistant 
        context="video ad creation with scripts, hooks, and marketing copy"
        currentState={{
          productName: productInfo.name,
          scripts: scriptSlots.map(s => s.text).filter(t => t.trim()),
          scenes: scenes,
          stage: currentStage,
        }}
        onSuggestion={(suggestion) => {
          // Auto-fill script with AI suggestion
          if (suggestion && scriptSlots.length > 0) {
            const updatedSlots = [...scriptSlots];
            updatedSlots[0] = { ...updatedSlots[0], text: suggestion };
            setScriptSlots(updatedSlots);
            toast.success("AI suggestion applied to script!");
          }
        }}
      />

      {/* Timeline Editor Dialog */}
      <Dialog open={showTimelineEditor} onOpenChange={setShowTimelineEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Timeline Editor
            </DialogTitle>
          </DialogHeader>
          <VideoTimelineEditor 
            scenes={scenes.map(s => ({
              id: s.id,
              index: s.index,
              text: s.text,
              scene_type: s.scene_type || null,
              visual_prompt: s.visual_prompt || s.visualPrompt || null,
              engine_name: s.engine_name || null,
              engine_id: s.engine_id || null,
              status: s.status || 'pending',
              video_url: s.video_url || s.videoUrl || null,
              duration_sec: s.duration_sec || s.duration || 5,
              transition_type: s.transition_type || s.transitionType || 'cut',
              transition_duration_ms: s.transition_duration_ms || s.transitionDuration || 500,
            }))}
            onScenesUpdate={(updatedScenes) => {
              setScenes(updatedScenes.map(s => ({
                ...s,
                visual_prompt: s.visual_prompt,
                transition_type: s.transition_type,
                transition_duration_ms: s.transition_duration_ms,
              })));
              toast.success("Timeline updated!");
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
