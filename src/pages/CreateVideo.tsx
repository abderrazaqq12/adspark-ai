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
import { StudioUnifiedLandingPage } from "@/components/studio/StudioUnifiedLandingPage";
import { StudioExport } from "@/components/studio/StudioExport";
import { VideoScriptStage } from "@/components/studio/VideoScriptStage";
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
import AIToolsSelector from "@/components/AIToolsSelector";
import { useRealTimeCost } from "@/hooks/useRealTimeCost";
import { UnifiedSceneBuilder, UnifiedScene } from "@/components/video/UnifiedSceneBuilder";
import { AutoAdFactory } from "@/components/video/AutoAdFactory";
import { SmartSceneBuilder } from "@/components/video/SmartSceneBuilder";
import { BackendModeSelector, BackendModeIndicator } from "@/components/BackendModeSelector";
import { useBackendMode } from "@/hooks/useBackendMode";
import { UnifiedVideoCreation } from "@/components/video/UnifiedVideoCreation";

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

// Production pipeline stages - Merged Scene Builder + Video Generation, Auto-Ad Factory for Assembly
const pipelineStages = [
  { id: 0, key: 'studio-product', name: "Product Input", icon: Package, description: "Product details & targeting", required: true },
  { id: 1, key: 'studio-images', name: "Image Generation", icon: Image, description: "Product images & mockups", required: false },
  { id: 2, key: 'studio-landing', name: "Landing Page", icon: Layout, description: "Marketing angles & landing page", required: false },
  { id: 3, key: 'scripts', name: "Voiceover", icon: Mic, description: "Video Script Text & Audio", required: true },
  { id: 4, key: 'unified-scene-video', name: "Scene Builder & Video Generation", icon: Wand2, description: "Build scenes, select engines, generate videos", required: true },
  { id: 5, key: 'auto-ad-factory', name: "Auto-Ad Factory", icon: Palette, description: "Mass-produce <30s ads with one click", required: true },
  { id: 6, key: 'export', name: "Export", icon: Globe, description: "Multi-format export", required: true },
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
  const [unifiedScenes, setUnifiedScenes] = useState<UnifiedScene[]>([]);
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

  // Backend mode state for webhook indicators
  const [webhookConfig, setWebhookConfig] = useState<Record<string, { enabled: boolean; webhook_url: string }>>({});

  // Backend mode hook - replaces individual state for n8n and AI operator
  const { mode: backendMode, setMode: setBackendMode, aiOperatorEnabled, isLoading: isBackendModeLoading } = useBackendMode();

  // Smart defaults and cost tracking hooks
  const { defaults, recordChoice, getDefaultForContext, suggestEngine } = useSmartDefaults(projectId || undefined);
  const { costs, projectCost, estimatedTotal, recordCost } = useRealTimeCost(projectId || undefined);

  // Clear functions for each stage
  // Clear functions for each stage - clears from UI state and user_settings
  const clearStageData = async (stageId: number) => {
    const { data: { user } } = await supabase.auth.getUser();

    const clearFromSettings = async (keys: string[]) => {
      if (!user) return;
      try {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settings?.preferences) {
          const prefs = { ...(settings.preferences as Record<string, unknown>) };
          keys.forEach(key => { delete prefs[key]; });

          await supabase
            .from('user_settings')
            .update({ preferences: prefs as any })
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('Error clearing settings:', error);
      }
    };

    switch (stageId) {
      case 0:
        setProductInfo({ name: "", description: "", imageUrl: "", link: "" });
        await clearFromSettings(['studio_product_name', 'studio_product_url', 'studio_description', 'studio_media_links', 'studio_target_market', 'studio_language', 'studio_audience_age', 'studio_audience_gender']);
        toast.success("Product input cleared");
        break;
      case 1:
        // Image generation clears generated_images in DB if needed
        toast.success("Image generation cleared");
        break;
      case 2:
        await clearFromSettings(['studio_marketing_angles', 'studio_scripts', 'studio_landing_content']);
        toast.success("Landing page cleared");
        break;
      case 3:
        setScriptSlots([{ id: 1, text: "", audioFile: null, audioUrl: null, generatedAudioUrl: null, isGenerating: false }]);
        toast.success("Voiceover scripts cleared");
        break;
      case 4:
        setScenes([]);
        toast.success("Scenes cleared");
        break;
      case 5:
        setUploadedVideos([]);
        toast.success("Video generation cleared");
        break;
      case 6:
        setSelectedFormats(["9:16", "16:9", "1:1"]);
        toast.success("Export settings reset");
        break;
    }
  };

  const clearAllPipelineData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    // Clear UI state
    setProductInfo({ name: "", description: "", imageUrl: "", link: "" });
    setScriptSlots([{ id: 1, text: "", audioFile: null, audioUrl: null, generatedAudioUrl: null, isGenerating: false }]);
    setScenes([]);
    setUploadedVideos([]);
    setCurrentStage(0);
    setExpandedStage(0);
    setSelectedTemplates([]);

    // Clear user_settings preferences related to studio
    if (user) {
      try {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settings?.preferences) {
          const prefs = { ...(settings.preferences as Record<string, unknown>) };
          const keysToRemove = [
            'studio_product_name', 'studio_product_url', 'studio_description',
            'studio_media_links', 'studio_target_market', 'studio_language',
            'studio_audience_age', 'studio_audience_gender', 'studio_marketing_angles',
            'studio_scripts', 'studio_landing_content'
          ];
          keysToRemove.forEach(key => { delete prefs[key]; });

          await supabase
            .from('user_settings')
            .update({ preferences: prefs as any })
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('Error clearing settings:', error);
      }
    }

    setShowClearPipelineDialog(false);
    toast.success("Pipeline reset - all data cleared");
  };

  // Load existing project, voices, templates, and webhook config
  useEffect(() => {
    loadLatestProject();
    loadMyVoices();
    loadTemplates();
    loadWebhookConfig();
  }, []);

  const loadWebhookConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        const prefs = settings.preferences as Record<string, any>;
        if (prefs?.stage_webhooks) {
          setWebhookConfig(prefs.stage_webhooks);
        }
      }
    } catch (error) {
      console.error('Error loading webhook config:', error);
    }
  };

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

          {/* Backend Mode Selector */}
          <div className="mt-4 mb-2">
            <BackendModeSelector compact className="w-full justify-between" />
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
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left flex-1 cursor-pointer ${expandedStage === stage.id
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{stage.name}</span>
                      {aiOperatorEnabled && (
                        <div className="w-2 h-2 rounded-full bg-primary" title="AI Operator active" />
                      )}
                    </div>
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
        <div className="flex items-center justify-between">
          <BackendModeSelector showCard className="w-auto" />
          <PipelineStatusIndicator
            pipelineStatus={{
              product_info: currentStage > 0 ? 'completed' : expandedStage === 0 ? 'in_progress' : 'pending',
              scripts: currentStage > 4 ? 'completed' : expandedStage === 4 ? 'in_progress' : 'pending',
              scenes: currentStage > 5 ? 'completed' : expandedStage === 5 ? 'in_progress' : 'pending',
              video_generation: currentStage > 5 ? 'completed' : expandedStage === 5 ? 'in_progress' : 'pending',
              assembly: currentStage > 6 ? 'completed' : expandedStage === 6 ? 'in_progress' : 'pending',
              export: currentStage > 7 ? 'completed' : expandedStage === 7 ? 'in_progress' : 'pending',
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

          {/* Stage 1: Studio Image Generation (Prioritized) */}
          {expandedStage === 1 && (
            <div className="space-y-4">
              <StudioImageGeneration
                onNext={() => {
                  setExpandedStage(2);
                  setCurrentStage(2);
                }}
                projectId={projectId}
              />
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

          {/* Stage 2: Unified Landing Page (Marketing Angles + Compiler) */}
          {expandedStage === 2 && (
            <StudioUnifiedLandingPage onNext={() => {
              setExpandedStage(3);
              setCurrentStage(3);
            }} />
          )}

          {/* Stage 3: Voiceover (Video Script Text & Audio) */}
          {expandedStage === 3 && (
            <VideoScriptStage
              onNext={() => {
                setExpandedStage(4);
                setCurrentStage(4);
              }}
              productInfo={productInfo}
              language={voiceLanguage}
              market="gcc"
            />
          )}

          {/* Stage 4: Unified Scene Builder & Video Generation */}
          {expandedStage === 4 && (
            <div className="space-y-6">
              {/* Unified Video Creation - Intelligent Engine Selection */}
              <UnifiedVideoCreation
                script={scriptSlots.map(s => s.text).filter(t => t.trim()).join('\n\n')}
                voiceoverUrl={scriptSlots.find(s => s.generatedAudioUrl || s.audioUrl)?.generatedAudioUrl || scriptSlots.find(s => s.audioUrl)?.audioUrl || undefined}
                scenes={unifiedScenes.length > 0 ? unifiedScenes.map(s => ({
                  id: s.id,
                  index: s.index,
                  text: s.text,
                  visualPrompt: s.visualPrompt,
                  duration: s.duration,
                  imageUrl: s.thumbnailUrl, // Use thumbnailUrl as imageUrl fallback
                  videoUrl: s.videoUrl,
                })) : scenes.map((s, i) => ({
                  id: s.id || `scene-${i}`,
                  index: i,
                  text: s.description || s.text || '',
                  visualPrompt: s.visualPrompt || '',
                  duration: s.duration || 5,
                }))}
                images={productInfo.imageUrl ? [productInfo.imageUrl] : []}
                onComplete={(output) => {
                  if (output.status === 'success') {
                    toast.success('Video generated! Proceeding to assembly...');
                    setExpandedStage(5);
                    setCurrentStage(5);
                  }
                }}
              />

              {/* Cost Calculator */}
              <CostCalculatorPreview
                scenesCount={unifiedScenes.length || scenes.length || 5}
                avgDuration={5}
                videoCount={videosToGenerate}
                onFreeOnlyChange={setFreeEnginesOnly}
              />

              {/* Smart Scene Builder - for scene management */}
              {projectId && (
                <SmartSceneBuilder
                  projectId={projectId}
                  scriptId={scriptId || undefined}
                  scenes={unifiedScenes.length > 0 ? unifiedScenes.map(s => ({
                    id: s.id,
                    index: s.index,
                    text: s.text,
                    visualPrompt: s.visualPrompt,
                    duration: s.duration,
                    status: s.status as 'pending' | 'generating' | 'completed' | 'failed',
                    engine: s.engine || 'auto',
                    videoUrl: s.videoUrl,
                    thumbnailUrl: s.thumbnailUrl,
                  })) : scenes.map((s, i) => ({
                    id: s.id || `scene-${i}`,
                    index: i,
                    text: s.description || s.text || '',
                    visualPrompt: s.visualPrompt || s.visual_prompt || '',
                    duration: s.duration || s.duration_sec || 5,
                    status: 'pending' as const,
                    engine: 'auto',
                  }))}
                  onScenesChange={(newScenes) => {
                    setUnifiedScenes(newScenes.map(s => ({
                      ...s,
                      engine: s.engine || 'auto',
                      status: s.status as 'pending' | 'generating' | 'completed' | 'failed',
                    })));
                    setScenes(newScenes.map((s) => ({
                      id: s.id,
                      title: `Scene ${s.index + 1}`,
                      description: s.text,
                      visualPrompt: s.visualPrompt,
                      duration: s.duration,
                    })));
                  }}
                  onProceedToAssembly={() => {
                    setExpandedStage(5);
                    setCurrentStage(5);
                  }}
                  videosToGenerate={videosToGenerate}
                  onVideosToGenerateChange={setVideosToGenerate}
                  productImages={productInfo.imageUrl ? [productInfo.imageUrl] : []}
                />
              )}

              {!projectId && (
                <Card className="bg-gradient-card border-border shadow-card p-8 text-center">
                  <Wand2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Save your project first to use the Scene Builder</p>
                  <p className="text-xs text-muted-foreground mt-2">Complete earlier steps and save your project</p>
                </Card>
              )}
            </div>
          )}

          {/* Stage 5: Auto-Ad Factory (Assembly) */}
          {expandedStage === 5 && (
            <div className="space-y-6">
              {projectId ? (
                <AutoAdFactory
                  projectId={projectId}
                  scriptId={scriptId || undefined}
                  scenesCount={unifiedScenes.length || scenes.length}
                  videosToGenerate={videosToGenerate}
                  onComplete={(videos) => {
                    toast.success(`Created ${videos.length} video ads!`);
                    setExpandedStage(6);
                    setCurrentStage(6);
                  }}
                />
              ) : (
                <Card className="bg-gradient-card border-border shadow-card p-8 text-center">
                  <Palette className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Save your project first to use the Auto-Ad Factory</p>
                </Card>
              )}

              {/* Optional Timeline Editor */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (scenes.length === 0 && unifiedScenes.length === 0) {
                    toast.error("No scenes available. Generate scenes first.");
                    return;
                  }
                  setShowTimelineEditor(true);
                }}
              >
                <Palette className="w-4 h-4 mr-2" />
                Open Timeline Editor (Optional)
              </Button>

              {/* Proceed to Export */}
              <Button
                onClick={() => {
                  setExpandedStage(6);
                  setCurrentStage(6);
                }}
                className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Next: Export Videos
              </Button>
            </div>
          )}

          {/* Stage 6: Export */}
          {expandedStage === 6 && (
            <StudioExport />
          )}

          {/* Save Button - shown when scenes exist */}
          {(scenes.length > 0 || unifiedScenes.length > 0) && !scriptId && expandedStage <= 4 && (
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
            scenes={(unifiedScenes.length > 0 ? unifiedScenes : scenes).map((s, idx) => ({
              id: s.id || `scene-${idx}`,
              index: s.index ?? idx,
              text: s.text || s.description || '',
              scene_type: s.scene_type || s.videoType || null,
              visual_prompt: s.visual_prompt || s.visualPrompt || null,
              engine_name: s.engine_name || s.engine || null,
              engine_id: s.engine_id || null,
              status: s.status || 'pending',
              video_url: s.video_url || s.videoUrl || null,
              duration_sec: s.duration_sec || s.duration || 5,
              transition_type: s.transition_type || s.transitionType || 'cut',
              transition_duration_ms: s.transition_duration_ms || s.transitionDuration || 500,
            }))}
            onScenesUpdate={(updatedScenes) => {
              // Update both state arrays for compatibility
              const mappedScenes = updatedScenes.map(s => ({
                ...s,
                visual_prompt: s.visual_prompt,
                transition_type: s.transition_type,
                transition_duration_ms: s.transition_duration_ms,
              }));
              setScenes(mappedScenes);
              setUnifiedScenes(mappedScenes.map((s, i) => ({
                id: s.id,
                index: i,
                text: s.text,
                visualPrompt: s.visual_prompt || '',
                duration: s.duration_sec || 5,
                status: (s.status || 'pending') as 'pending' | 'generating' | 'completed' | 'failed',
                engine: s.engine_name || 'nano-banana',
                videoUrl: s.video_url || undefined,
              })));
              toast.success("Timeline updated!");
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
