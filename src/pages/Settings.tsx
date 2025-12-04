import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, Plus, Trash2, FileText, Loader2, Pencil, Webhook, Copy, CheckCircle, XCircle, ExternalLink, Zap, Key, Eye, EyeOff, Bot, RefreshCw, DollarSign, Sparkles, TrendingUp, Crown, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BatchApiKeyTester from "@/components/BatchApiKeyTester";
import EngineUsageAnalytics from "@/components/EngineUsageAnalytics";

interface PromptTemplate {
  id: string;
  name: string;
  template_text: string;
  variables: string[];
  language: string | null;
  category: string | null;
  is_default: boolean | null;
}

interface UserSettings {
  id: string;
  default_language: string | null;
  default_voice: string | null;
  use_free_tier_only: boolean | null;
  pricing_tier: string | null;
  api_keys: Record<string, string> | null;
}

const PRICING_TIERS = [
  { 
    value: "free", 
    label: "Free Tier", 
    description: "Only use free AI engines",
    icon: Sparkles,
    color: "text-green-500",
    bgColor: "bg-green-500/10 border-green-500/30"
  },
  { 
    value: "cheap", 
    label: "Budget", 
    description: "Low-cost engines like Hailuo, Wan Video",
    icon: DollarSign,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/30"
  },
  { 
    value: "normal", 
    label: "Standard", 
    description: "Balanced cost & quality engines",
    icon: TrendingUp,
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/30"
  },
  { 
    value: "expensive", 
    label: "Premium", 
    description: "Best quality: Runway, Sora, HeyGen",
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/30"
  },
];

interface APIKeyConfig {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  websiteUrl?: string;
}

interface APIKeyCategory {
  name: string;
  keys: APIKeyConfig[];
}

// Direct API settings page URLs (not homepages)
const API_WEBSITE_URLS: Record<string, string> = {
  // AI Assistants
  OPENAI_API_KEY: "https://platform.openai.com/api-keys",
  GEMINI_API_KEY: "https://aistudio.google.com/apikey",
  // Text-to-Video
  RUNWAY_API_KEY: "https://app.runwayml.com/settings/api-keys",
  PIKA_API_KEY: "https://pika.art/settings/api",
  HAILUO_API_KEY: "https://hailuoai.com/settings/api",
  KLING_API_KEY: "https://klingai.com/developer/api-keys",
  VIDU_API_KEY: "https://www.vidu.studio/settings/api",
  LTX_API_KEY: "https://ltx.studio/settings/api",
  WAN_API_KEY: "https://www.wan.video/api",
  SKYREELS_API_KEY: "https://skyreels.ai/settings",
  SEEDANCE_API_KEY: "https://seedance.ai/api",
  HIGGSFIELD_API_KEY: "https://higgsfield.ai/settings/api",
  // Avatar & UGC
  HEYGEN_API_KEY: "https://app.heygen.com/settings/api",
  ELAI_API_KEY: "https://app.elai.io/settings/api-keys",
  ARCADS_API_KEY: "https://arcads.ai/settings/api",
  CREATIFY_API_KEY: "https://creatify.ai/settings/api",
  JOGG_API_KEY: "https://jogg.ai/settings/api",
  TWINADS_API_KEY: "https://twinads.ai/settings",
  VIDNOZ_API_KEY: "https://www.vidnoz.com/api",
  CELEBIFY_API_KEY: "https://celebify.ai/api",
  OMNIHUMAN_API_KEY: "https://omnihuman.ai/settings",
  HEDRA_API_KEY: "https://www.hedra.com/settings/api",
  // Image-to-Video
  LEONARDO_API_KEY: "https://app.leonardo.ai/settings/api",
  FLORAFAUNA_API_KEY: "https://florafauna.ai/settings/api",
  // Template & Editing
  PICTORY_API_KEY: "https://pictory.ai/settings/api",
  QUSO_API_KEY: "https://quso.ai/settings/api",
  TOPVIEW_API_KEY: "https://topview.ai/settings/api",
  FLEXCLIP_API_KEY: "https://flexclip.com/settings/api",
  FLIKI_API_KEY: "https://fliki.ai/settings/api",
  INVIDEO_API_KEY: "https://ai.invideo.io/settings/api",
  CREATOMATE_API_KEY: "https://creatomate.com/settings/api-keys",
  JSON2VIDEO_API_KEY: "https://json2video.com/dashboard/api-keys",
  SHOTSTACK_API_KEY: "https://dashboard.shotstack.io/api-keys",
  WISECUT_API_KEY: "https://wisecut.video/settings/api",
  ZEBRACAT_API_KEY: "https://zebracat.ai/settings/api",
  OPUS_API_KEY: "https://opus.pro/settings/api",
  CAPTIONS_API_KEY: "https://captions.ai/settings/api",
  NIM_API_KEY: "https://nim.video/settings/api",
  SCADE_API_KEY: "https://scade.pro/settings/api",
  CRAYO_API_KEY: "https://crayo.ai/settings/api",
  // Voice & Audio
  ELEVENLABS_API_KEY: "https://elevenlabs.io/settings/api-keys",
  FLAIR_API_KEY: "https://flair.ai/settings/api",
  // AI Platforms
  HUGGINGFACE_API_KEY: "https://huggingface.co/settings/tokens",
  LIVGEN_API_KEY: "https://livgen.ai/settings/api",
  AIVIDEO_API_KEY: "https://aivideo.com/settings/api",
  // Global Providers
  AIMLAPI_API_KEY: "https://aimlapi.com/settings/api-keys",
  OPENROUTER_API_KEY: "https://openrouter.ai/settings/keys",
  EDENAI_API_KEY: "https://app.edenai.run/admin/account/settings",
  FAL_API_KEY: "https://fal.ai/dashboard/keys",
  APIFRAME_API_KEY: "https://apiframe.pro/settings/api",
  GOOGLE_AI_STUDIO_KEY: "https://aistudio.google.com/apikey",
  VERTEX_AI_KEY: "https://console.cloud.google.com/apis/credentials",
};

// Global API providers with multiple models
interface GlobalAPIProvider {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  models: { id: string; name: string; description: string }[];
}

const GLOBAL_API_PROVIDERS: GlobalAPIProvider[] = [
  {
    key: "AIMLAPI_API_KEY",
    label: "AIML API",
    description: "Access 200+ AI models including GPT-4, Claude, Llama",
    placeholder: "aiml_xxxxxxxxxxxxxxxx",
    models: [
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "OpenAI's most capable model" },
      { id: "gpt-4o", name: "GPT-4o", description: "OpenAI's fastest GPT-4" },
      { id: "claude-3-opus", name: "Claude 3 Opus", description: "Anthropic's most powerful" },
      { id: "claude-3-sonnet", name: "Claude 3 Sonnet", description: "Balanced performance" },
      { id: "llama-3.1-70b", name: "Llama 3.1 70B", description: "Meta's open model" },
      { id: "mistral-large", name: "Mistral Large", description: "Mistral's flagship" },
      { id: "flux-pro", name: "Flux Pro", description: "Image generation" },
      { id: "stable-diffusion-xl", name: "SDXL", description: "Image generation" },
    ]
  },
  {
    key: "OPENROUTER_API_KEY",
    label: "OpenRouter",
    description: "Unified API for all major LLMs with automatic fallbacks",
    placeholder: "sk-or-v1-xxxxxxxxxxxxxxxx",
    models: [
      { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", description: "via OpenRouter" },
      { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", description: "via OpenRouter" },
      { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", description: "via OpenRouter" },
      { id: "meta-llama/llama-3.1-405b", name: "Llama 3.1 405B", description: "Largest Llama" },
      { id: "mistral/mistral-large", name: "Mistral Large", description: "via OpenRouter" },
      { id: "cohere/command-r-plus", name: "Command R+", description: "Cohere's best" },
    ]
  },
  {
    key: "EDENAI_API_KEY",
    label: "Eden AI",
    description: "Multi-provider AI APIs for text, image, video, audio",
    placeholder: "eyJhbGciOiJIUzI1NiIs...",
    models: [
      { id: "text-generation", name: "Text Generation", description: "Multiple providers" },
      { id: "image-generation", name: "Image Generation", description: "DALL-E, Stable Diffusion" },
      { id: "speech-to-text", name: "Speech to Text", description: "Multiple providers" },
      { id: "text-to-speech", name: "Text to Speech", description: "Multiple voices" },
      { id: "video-analysis", name: "Video Analysis", description: "Content detection" },
      { id: "translation", name: "Translation", description: "100+ languages" },
    ]
  },
  {
    key: "FAL_API_KEY",
    label: "Fal AI",
    description: "Fast inference for image & video models",
    placeholder: "fal_xxxxxxxxxxxxxxxx",
    models: [
      { id: "flux-pro", name: "Flux Pro", description: "Best image quality" },
      { id: "flux-dev", name: "Flux Dev", description: "Development model" },
      { id: "flux-schnell", name: "Flux Schnell", description: "Fast generation" },
      { id: "stable-video-diffusion", name: "Stable Video", description: "Image to video" },
      { id: "animate-diff", name: "AnimateDiff", description: "Animation generation" },
      { id: "lora-training", name: "LoRA Training", description: "Custom model training" },
    ]
  },
  {
    key: "APIFRAME_API_KEY",
    label: "APIframe",
    description: "Unified API for video generation platforms",
    placeholder: "af_xxxxxxxxxxxxxxxx",
    models: [
      { id: "runway-gen3", name: "Runway Gen-3", description: "via APIframe" },
      { id: "luma-dream", name: "Luma Dream Machine", description: "via APIframe" },
      { id: "kling-ai", name: "Kling AI", description: "via APIframe" },
      { id: "minimax-video", name: "MiniMax Video", description: "via APIframe" },
      { id: "cogvideox", name: "CogVideoX", description: "via APIframe" },
    ]
  },
  {
    key: "GOOGLE_AI_STUDIO_KEY",
    label: "Google AI Studio",
    description: "Access Gemini models directly from Google",
    placeholder: "AIzaSy...",
    models: [
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Best for complex tasks" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast & efficient" },
      { id: "gemini-pro-vision", name: "Gemini Pro Vision", description: "Multimodal" },
      { id: "text-embedding", name: "Text Embedding", description: "Semantic search" },
      { id: "imagen-3", name: "Imagen 3", description: "Image generation" },
    ]
  },
  {
    key: "VERTEX_AI_KEY",
    label: "Vertex AI",
    description: "Google Cloud's enterprise AI platform",
    placeholder: "ya29.xxxxxxxxxxxxxxxx",
    models: [
      { id: "gemini-1.5-pro-preview", name: "Gemini 1.5 Pro", description: "Enterprise grade" },
      { id: "gemini-1.5-flash-preview", name: "Gemini 1.5 Flash", description: "Low latency" },
      { id: "imagen-3", name: "Imagen 3", description: "Enterprise images" },
      { id: "video-generation", name: "Video Generation", description: "Enterprise video" },
      { id: "speech-to-text-v2", name: "Speech to Text v2", description: "High accuracy" },
      { id: "text-to-speech-v2", name: "Text to Speech v2", description: "Natural voices" },
    ]
  },
];

const API_KEY_CATEGORIES: APIKeyCategory[] = [
  {
    name: "AI Assistants",
    keys: [
      { key: "OPENAI_API_KEY", label: "OpenAI API Key", description: "For ChatGPT AI Assistant", placeholder: "sk-proj-xxxxxxxxxxxxxxxx" },
      { key: "GEMINI_API_KEY", label: "Google Gemini API Key", description: "For Gemini AI Assistant", placeholder: "AIzaSyxxxxxxxxxxxxxxxxxx" },
    ]
  },
  {
    name: "Text-to-Video Engines",
    keys: [
      { key: "RUNWAY_API_KEY", label: "Runway API Key", description: "High-quality cinematic video generation", placeholder: "rw_xxxxxxxxxxxxxxxx" },
      { key: "PIKA_API_KEY", label: "Pika Labs API Key", description: "Creative & animated video generation", placeholder: "pk_xxxxxxxxxxxxxxxx" },
      { key: "HAILUO_API_KEY", label: "Hailuo AI API Key", description: "Fast video generation with realistic motion", placeholder: "hl_xxxxxxxxxxxxxxxx" },
      { key: "KLING_API_KEY", label: "Kling AI API Key", description: "High-quality AI video with long duration", placeholder: "kl_xxxxxxxxxxxxxxxx" },
      { key: "VIDU_API_KEY", label: "Vidu API Key", description: "Text-to-video with character consistency", placeholder: "vd_xxxxxxxxxxxxxxxx" },
      { key: "LTX_API_KEY", label: "LTX Studio API Key", description: "AI filmmaking and video creation", placeholder: "ltx_xxxxxxxxxxxxxxxx" },
      { key: "WAN_API_KEY", label: "Wan Video API Key", description: "Fast text-to-video generation", placeholder: "wan_xxxxxxxxxxxxxxxx" },
      { key: "SKYREELS_API_KEY", label: "SkyReels API Key", description: "Cinematic video generation", placeholder: "sr_xxxxxxxxxxxxxxxx" },
      { key: "SEEDANCE_API_KEY", label: "Seedance API Key", description: "Dance & motion video generation", placeholder: "sd_xxxxxxxxxxxxxxxx" },
      { key: "HIGGSFIELD_API_KEY", label: "Higgsfield API Key", description: "Personalized AI video creation", placeholder: "hf_xxxxxxxxxxxxxxxx" },
    ]
  },
  {
    name: "Avatar & UGC Engines",
    keys: [
      { key: "HEYGEN_API_KEY", label: "HeyGen API Key", description: "Professional avatar video generation", placeholder: "hg_xxxxxxxxxxxxxxxx" },
      { key: "ELAI_API_KEY", label: "Elai.io API Key", description: "AI avatar video from text", placeholder: "el_xxxxxxxxxxxxxxxx" },
      { key: "ARCADS_API_KEY", label: "Arcads API Key", description: "UGC-style ad video generation", placeholder: "arc_xxxxxxxxxxxxxxxx" },
      { key: "CREATIFY_API_KEY", label: "Creatify API Key", description: "AI-powered ad creative generation", placeholder: "cr_xxxxxxxxxxxxxxxx" },
      { key: "JOGG_API_KEY", label: "Jogg AI API Key", description: "AI avatar marketing videos", placeholder: "jg_xxxxxxxxxxxxxxxx" },
      { key: "TWINADS_API_KEY", label: "TwinAds API Key", description: "AI twin avatar ads", placeholder: "tw_xxxxxxxxxxxxxxxx" },
      { key: "VIDNOZ_API_KEY", label: "Vidnoz API Key", description: "AI avatar video maker", placeholder: "vn_xxxxxxxxxxxxxxxx" },
      { key: "CELEBIFY_API_KEY", label: "CelebifyAI API Key", description: "Celebrity-style avatar videos", placeholder: "cb_xxxxxxxxxxxxxxxx" },
      { key: "OMNIHUMAN_API_KEY", label: "OmniHuman API Key", description: "Realistic human avatar generation", placeholder: "oh_xxxxxxxxxxxxxxxx" },
      { key: "HEDRA_API_KEY", label: "Hedra API Key", description: "AI character video generation", placeholder: "hd_xxxxxxxxxxxxxxxx" },
    ]
  },
  {
    name: "Image-to-Video Engines",
    keys: [
      { key: "LEONARDO_API_KEY", label: "Leonardo AI API Key", description: "Image generation & animation", placeholder: "leo_xxxxxxxxxxxxxxxx" },
      { key: "FLORAFAUNA_API_KEY", label: "Flora Fauna API Key", description: "Product image animation", placeholder: "ff_xxxxxxxxxxxxxxxx" },
    ]
  },
  {
    name: "Template & Editing Engines",
    keys: [
      { key: "PICTORY_API_KEY", label: "Pictory API Key", description: "Script to video with templates", placeholder: "pic_xxxxxxxxxxxxxxxx" },
      { key: "QUSO_API_KEY", label: "Quso AI API Key", description: "Social media video automation", placeholder: "qs_xxxxxxxxxxxxxxxx" },
      { key: "TOPVIEW_API_KEY", label: "TopView API Key", description: "AI video ads from URLs", placeholder: "tv_xxxxxxxxxxxxxxxx" },
      { key: "FLEXCLIP_API_KEY", label: "FlexClip API Key", description: "Template-based video editor", placeholder: "fc_xxxxxxxxxxxxxxxx" },
      { key: "FLIKI_API_KEY", label: "Fliki API Key", description: "Text to video with voiceover", placeholder: "fl_xxxxxxxxxxxxxxxx" },
      { key: "INVIDEO_API_KEY", label: "InVideo API Key", description: "AI video creation platform", placeholder: "iv_xxxxxxxxxxxxxxxx" },
      { key: "CREATOMATE_API_KEY", label: "Creatomate API Key", description: "Video automation API", placeholder: "cm_xxxxxxxxxxxxxxxx" },
      { key: "JSON2VIDEO_API_KEY", label: "JSON2Video API Key", description: "Programmatic video generation", placeholder: "j2v_xxxxxxxxxxxxxxxx" },
      { key: "SHOTSTACK_API_KEY", label: "Shotstack API Key", description: "Cloud video editing API", placeholder: "ss_xxxxxxxxxxxxxxxx" },
      { key: "WISECUT_API_KEY", label: "Wisecut API Key", description: "AI video editing automation", placeholder: "wc_xxxxxxxxxxxxxxxx" },
      { key: "ZEBRACAT_API_KEY", label: "Zebracat API Key", description: "AI marketing video creator", placeholder: "zb_xxxxxxxxxxxxxxxx" },
      { key: "OPUS_API_KEY", label: "Opus Pro API Key", description: "Long-form to short-form clips", placeholder: "op_xxxxxxxxxxxxxxxx" },
      { key: "CAPTIONS_API_KEY", label: "Captions AI API Key", description: "AI captions & video editing", placeholder: "cap_xxxxxxxxxxxxxxxx" },
      { key: "NIM_API_KEY", label: "Nim Video API Key", description: "AI video summarization", placeholder: "nim_xxxxxxxxxxxxxxxx" },
      { key: "SCADE_API_KEY", label: "Scade Pro API Key", description: "AI workflow automation", placeholder: "sc_xxxxxxxxxxxxxxxx" },
      { key: "CRAYO_API_KEY", label: "Crayo AI API Key", description: "Short-form video automation", placeholder: "cy_xxxxxxxxxxxxxxxx" },
    ]
  },
  {
    name: "Voice & Audio",
    keys: [
      { key: "ELEVENLABS_API_KEY", label: "ElevenLabs API Key", description: "High-quality voice synthesis", placeholder: "xi_xxxxxxxxxxxxxxxx" },
      { key: "FLAIR_API_KEY", label: "Flair AI API Key", description: "AI voiceover generation", placeholder: "flair_xxxxxxxxxxxxxxxx" },
    ]
  },
  {
    name: "AI Platforms",
    keys: [
      { key: "HUGGINGFACE_API_KEY", label: "Hugging Face API Key", description: "Open-source AI models", placeholder: "hf_xxxxxxxxxxxxxxxx" },
      { key: "LIVGEN_API_KEY", label: "LivGen API Key", description: "Live AI video generation", placeholder: "lg_xxxxxxxxxxxxxxxx" },
      { key: "AIVIDEO_API_KEY", label: "AI Video API Key", description: "General AI video platform", placeholder: "aiv_xxxxxxxxxxxxxxxx" },
    ]
  },
];

const DEFAULT_N8N_WEBHOOK_URL = "https://bedeukijnixeihjepbjg.supabase.co/functions/v1/n8n-webhook";

const AVAILABLE_ACTIONS = [
  { action: "create_project", description: "Create a new project", example: { name: "My Campaign", product_name: "Premium Watch", language: "en" } },
  { action: "get_projects", description: "List all projects", example: { limit: 10 } },
  { action: "create_script", description: "Create a new script", example: { projectId: "uuid", raw_text: "Your script text..." } },
  { action: "generate_scripts", description: "AI generate scripts", example: { projectId: "uuid", templateId: "uuid" } },
  { action: "breakdown_scenes", description: "Break script into scenes", example: { scriptId: "uuid" } },
  { action: "batch_generate", description: "Start batch video generation", example: { scriptId: "uuid", variationsPerScene: 5, randomEngines: true } },
  { action: "process_queue", description: "Process generation queue", example: { limit: 10 } },
  { action: "generate_voiceover", description: "Generate voiceover audio", example: { scriptId: "uuid", voice: "en-US-Neural2-D" } },
  { action: "assemble_video", description: "Assemble final video", example: { scriptId: "uuid", format: "mp4", addSubtitles: true } },
  { action: "get_engines", description: "List AI engines", example: { type: "video", status: "active" } },
  { action: "route_engine", description: "Auto-route to best engine", example: { sceneType: "product_showcase", complexity: "high" } },
  { action: "full_pipeline", description: "Run entire workflow", example: { projectName: "Summer Sale", product_name: "Sunglasses", scriptText: "Your script...", variationsPerScene: 3 } },
];

export default function Settings() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    template_text: "",
    language: "en",
    category: "script",
  });
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [activatedModels, setActivatedModels] = useState<Record<string, string[]>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [savingKeys, setSavingKeys] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  
  // n8n integration state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [selectedAction, setSelectedAction] = useState(AVAILABLE_ACTIONS[0]);
  const [testPayload, setTestPayload] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userN8nWebhook, setUserN8nWebhook] = useState("");
  const [n8nApiKey, setN8nApiKey] = useState("");
  const [savingN8nSettings, setSavingN8nSettings] = useState(false);
  const [testingUserWebhook, setTestingUserWebhook] = useState(false);
  const [userWebhookStatus, setUserWebhookStatus] = useState<"idle" | "success" | "error">("idle");
  
  // AI n8n helper state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAction, setAiAction] = useState<"generate_workflow" | "suggest_nodes" | "help">("suggest_nodes");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  
  // n8n workflow management state
  const [deployingWorkflow, setDeployingWorkflow] = useState(false);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [n8nWorkflows, setN8nWorkflows] = useState<any[]>([]);
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  
  // Google Drive integration state
  const [googleDriveFolderUrl, setGoogleDriveFolderUrl] = useState("");
  const [savingGoogleDrive, setSavingGoogleDrive] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setTestPayload(JSON.stringify({
      action: selectedAction.action,
      userId: userId || "your-user-id",
      data: selectedAction.example
    }, null, 2));
  }, [selectedAction, userId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      const [templatesRes, settingsRes] = await Promise.all([
        supabase.from("prompt_templates").select("*").order("created_at", { ascending: false }),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      
      const templatesWithVariables = (templatesRes.data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? (t.variables as string[]) : []
      }));
      setTemplates(templatesWithVariables as PromptTemplate[]);
      
      if (settingsRes.data) {
        setSettings(settingsRes.data as UserSettings);
        if (settingsRes.data.api_keys) {
          const keys = settingsRes.data.api_keys as Record<string, any>;
          // Separate API keys from activated models
          const apiKeysOnly: Record<string, string> = {};
          const modelsOnly: Record<string, string[]> = {};
          
          Object.entries(keys).forEach(([key, value]) => {
            if (key.endsWith('_MODELS') && Array.isArray(value)) {
              modelsOnly[key.replace('_MODELS', '')] = value;
            } else if (typeof value === 'string') {
              apiKeysOnly[key] = value;
            }
          });
          
          setApiKeys(apiKeysOnly);
          setActivatedModels(modelsOnly);
        }
        // Load n8n settings and Google Drive from preferences
        const prefs = settingsRes.data.preferences as Record<string, any> | null;
        if (prefs) {
          setUserN8nWebhook(prefs.n8n_webhook_url || "");
          setN8nApiKey(prefs.n8n_api_key || "");
          setGoogleDriveFolderUrl(prefs.google_drive_folder_url || "");
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "")))];
  };

  const handleSaveTemplate = async () => {
    if (!formData.name || !formData.template_text) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const variables = extractVariables(formData.template_text);
      
      if (editingTemplate) {
        const { error } = await supabase
          .from("prompt_templates")
          .update({
            name: formData.name,
            template_text: formData.template_text,
            variables,
            language: formData.language,
            category: formData.category,
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template updated");
      } else {
        const { error } = await supabase
          .from("prompt_templates")
          .insert({
            user_id: user.id,
            name: formData.name,
            template_text: formData.template_text,
            variables,
            language: formData.language,
            category: formData.category,
          });

        if (error) throw error;
        toast.success("Template created");
      }

      setDialogOpen(false);
      setEditingTemplate(null);
      setFormData({ name: "", template_text: "", language: "en", category: "script" });
      fetchData();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from("prompt_templates").delete().eq("id", id);
      if (error) throw error;
      toast.success("Template deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template_text: template.template_text,
      language: template.language || "en",
      category: template.category || "script",
    });
    setDialogOpen(true);
  };

  const handleSaveApiKeys = async () => {
    setSavingKeys(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Combine API keys with activated models
      const combinedKeys: Record<string, any> = { ...apiKeys };
      Object.entries(activatedModels).forEach(([provider, models]) => {
        combinedKeys[`${provider}_MODELS`] = models;
      });

      const { error } = await supabase
        .from("user_settings")
        .update({ api_keys: combinedKeys })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("API keys and model preferences saved securely");
    } catch (error) {
      console.error("Error saving API keys:", error);
      toast.error("Failed to save API keys");
    } finally {
      setSavingKeys(false);
    }
  };

  const toggleModel = (providerKey: string, modelId: string) => {
    setActivatedModels(prev => {
      const current = prev[providerKey] || [];
      if (current.includes(modelId)) {
        return { ...prev, [providerKey]: current.filter(m => m !== modelId) };
      } else {
        return { ...prev, [providerKey]: [...current, modelId] };
      }
    });
  };

  const toggleAllModels = (providerKey: string, models: { id: string }[]) => {
    const current = activatedModels[providerKey] || [];
    const allSelected = models.every(m => current.includes(m.id));
    
    if (allSelected) {
      setActivatedModels(prev => ({ ...prev, [providerKey]: [] }));
    } else {
      setActivatedModels(prev => ({ ...prev, [providerKey]: models.map(m => m.id) }));
    }
  };

  const testApiKey = async (keyType: string) => {
    const apiKey = apiKeys[keyType];
    if (!apiKey) {
      toast.error("Please enter an API key first");
      return;
    }

    setTestingKey(keyType);
    try {
      const { data, error } = await supabase.functions.invoke('test-api-connection', {
        body: { apiKeyType: keyType, apiKey },
      });

      if (error) throw error;

      setKeyTestResults(prev => ({
        ...prev,
        [keyType]: { success: data.success, message: data.message },
      }));

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error testing API key:", error);
      setKeyTestResults(prev => ({
        ...prev,
        [keyType]: { success: false, message: "Connection test failed" },
      }));
      toast.error("Failed to test API connection");
    } finally {
      setTestingKey(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .update({
          default_language: settings.default_language,
          pricing_tier: settings.pricing_tier,
        })
        .eq("id", settings.id);

      if (error) throw error;
      toast.success("Settings saved");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const testN8NConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus("idle");
    
    try {
      const payload = JSON.parse(testPayload);
      const response = await fetch(DEFAULT_N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus("success");
        toast.success("Connection successful!", {
          description: `Action "${payload.action}" executed successfully`,
        });
        console.log("n8n webhook result:", result);
      } else {
        setConnectionStatus("error");
        toast.error("Connection failed", { description: result.error });
      }
    } catch (error) {
      setConnectionStatus("error");
      toast.error("Connection failed", { 
        description: error instanceof Error ? error.message : "Invalid JSON or network error" 
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const testUserN8nWebhook = async () => {
    if (!userN8nWebhook) {
      toast.error("Please enter your n8n webhook URL first");
      return;
    }

    setTestingUserWebhook(true);
    setUserWebhookStatus("idle");
    
    try {
      const response = await fetch(userN8nWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors", // n8n webhooks may not have CORS headers
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          source: "VideoAI Platform",
        }),
      });
      
      // Since no-cors doesn't return response data, we assume success if no error
      setUserWebhookStatus("success");
      toast.success("Request sent to your n8n webhook", {
        description: "Check your n8n execution history to confirm receipt",
      });
    } catch (error) {
      setUserWebhookStatus("error");
      toast.error("Failed to connect to webhook", {
        description: error instanceof Error ? error.message : "Network error",
      });
    } finally {
      setTestingUserWebhook(false);
    }
  };

  const saveN8nSettings = async () => {
    setSavingN8nSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current preferences and merge
      const { data: currentSettings } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .single();

      const currentPrefs = (currentSettings?.preferences as Record<string, any>) || {};
      const updatedPrefs = {
        ...currentPrefs,
        n8n_webhook_url: userN8nWebhook,
        n8n_api_key: n8nApiKey,
      };

      const { error } = await supabase
        .from("user_settings")
        .update({ preferences: updatedPrefs })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("n8n settings saved successfully");
    } catch (error) {
      console.error("Error saving n8n settings:", error);
      toast.error("Failed to save n8n settings");
    } finally {
      setSavingN8nSettings(false);
    }
  };

  const saveGoogleDriveSettings = async () => {
    setSavingGoogleDrive(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current preferences and merge
      const { data: currentSettings } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .single();

      const currentPrefs = (currentSettings?.preferences as Record<string, any>) || {};
      const updatedPrefs = {
        ...currentPrefs,
        google_drive_folder_url: googleDriveFolderUrl,
      };

      const { error } = await supabase
        .from("user_settings")
        .update({ preferences: updatedPrefs })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Google Drive settings saved. New projects will auto-create folders.");
    } catch (error) {
      console.error("Error saving Google Drive settings:", error);
      toast.error("Failed to save Google Drive settings");
    } finally {
      setSavingGoogleDrive(false);
    }
  };

  const generateAiN8nHelp = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a description of what you want to automate");
      return;
    }

    setAiLoading(true);
    setAiResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("n8n-ai-helper", {
        body: { prompt: aiPrompt, action: aiAction },
      });

      if (error) throw error;

      if (data.success) {
        setAiResult(data.content);
        toast.success("AI generated suggestions!");
      } else {
        throw new Error(data.error || "Failed to generate response");
      }
    } catch (error) {
      console.error("AI error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get AI help");
    } finally {
      setAiLoading(false);
    }
  };

  const deployWorkflowToN8n = async (workflow: any) => {
    if (!userN8nWebhook || !n8nApiKey) {
      toast.error("Please configure your n8n webhook URL and API key first");
      return;
    }

    setDeployingWorkflow(true);
    try {
      const { data, error } = await supabase.functions.invoke("n8n-ai-helper", {
        body: {
          action: "deploy_workflow",
          n8nBaseUrl: userN8nWebhook,
          n8nApiKey: n8nApiKey,
          workflow: workflow,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message || "Workflow deployed successfully!");
        await listN8nWorkflows(); // Refresh the list
      } else {
        throw new Error(data.error || "Failed to deploy workflow");
      }
    } catch (error) {
      console.error("Deploy error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to deploy workflow");
    } finally {
      setDeployingWorkflow(false);
    }
  };

  const listN8nWorkflows = async () => {
    if (!userN8nWebhook || !n8nApiKey) {
      toast.error("Please configure your n8n webhook URL and API key first");
      return;
    }

    setLoadingWorkflows(true);
    try {
      const { data, error } = await supabase.functions.invoke("n8n-ai-helper", {
        body: {
          action: "list_workflows",
          n8nBaseUrl: userN8nWebhook,
          n8nApiKey: n8nApiKey,
        },
      });

      if (error) throw error;

      if (data.success) {
        setN8nWorkflows(data.workflows || []);
        setShowWorkflowManager(true);
        toast.success(`Found ${data.workflows?.length || 0} workflows`);
      } else {
        throw new Error(data.error || "Failed to list workflows");
      }
    } catch (error) {
      console.error("List workflows error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to list workflows");
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const toggleWorkflowActive = async (workflowId: string, active: boolean) => {
    if (!userN8nWebhook || !n8nApiKey) return;

    try {
      const { data, error } = await supabase.functions.invoke("n8n-ai-helper", {
        body: {
          action: "activate_workflow",
          n8nBaseUrl: userN8nWebhook,
          n8nApiKey: n8nApiKey,
          workflow: { id: workflowId, active },
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        await listN8nWorkflows(); // Refresh
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Toggle workflow error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update workflow");
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage API keys, prompt templates, and integrations
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="bg-muted/50">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="n8n">n8n Integration</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                API Keys Management
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect your own API keys to use premium AI video services. Keys are encrypted and stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-lg mb-4">
                <h4 className="font-medium text-foreground flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-primary" />
                  AI Assistant Access
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  With API keys configured, you can use the AI Assistant in the Create Video page:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Lovable AI (Free)</Badge>
                  {apiKeys.OPENAI_API_KEY && <Badge className="bg-green-500/20 text-green-500">ChatGPT ✓</Badge>}
                  {apiKeys.GEMINI_API_KEY && <Badge className="bg-blue-500/20 text-blue-500">Gemini ✓</Badge>}
                  {!apiKeys.OPENAI_API_KEY && <Badge variant="outline">ChatGPT (needs key)</Badge>}
                  {!apiKeys.GEMINI_API_KEY && <Badge variant="outline">Gemini (needs key)</Badge>}
                </div>
              </div>

              {/* Global API Keys Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">🌐 Global API Keys</h3>
                  <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                    Multi-Model Providers
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  These providers give access to multiple AI models with a single API key. Select which models you want to activate.
                </p>
                
                <div className="grid gap-4">
                  {GLOBAL_API_PROVIDERS.map((provider) => {
                    const isExpanded = expandedProviders[provider.key];
                    const selectedModels = activatedModels[provider.key] || [];
                    const hasKey = !!apiKeys[provider.key];
                    
                    return (
                      <div key={provider.key} className="border border-border rounded-lg overflow-hidden">
                        <div 
                          className={`p-4 cursor-pointer transition-colors ${hasKey ? 'bg-primary/5' : 'bg-muted/20'}`}
                          onClick={() => setExpandedProviders(prev => ({ ...prev, [provider.key]: !prev[provider.key] }))}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                              <div>
                                <Label className="text-foreground font-medium cursor-pointer">{provider.label}</Label>
                                <p className="text-xs text-muted-foreground">{provider.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasKey && selectedModels.length > 0 && (
                                <Badge className="bg-primary/20 text-primary text-xs">
                                  {selectedModels.length} models active
                                </Badge>
                              )}
                              {hasKey && (
                                <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Connected
                                </Badge>
                              )}
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="p-4 border-t border-border bg-muted/10 space-y-4">
                            {/* API Key Input */}
                            <div className="space-y-2">
                              <Label className="text-sm">API Key</Label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    type={showKeys[provider.key] ? "text" : "password"}
                                    placeholder={provider.placeholder}
                                    value={apiKeys[provider.key] || ""}
                                    onChange={(e) => setApiKeys({ ...apiKeys, [provider.key]: e.target.value })}
                                    className="pr-10 h-9 text-sm"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full w-9"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleKeyVisibility(provider.key);
                                    }}
                                  >
                                    {showKeys[provider.key] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </Button>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9"
                                  disabled={!apiKeys[provider.key] || testingKey === provider.key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    testApiKey(provider.key);
                                  }}
                                >
                                  {testingKey === provider.key ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  <span className="ml-1 text-xs">Test</span>
                                </Button>
                                {API_WEBSITE_URLS[provider.key] && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(API_WEBSITE_URLS[provider.key], '_blank');
                                    }}
                                    title={`Open ${provider.label} settings page`}
                                  >
                                    <ExternalLink className="w-3 h-3 text-primary" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {/* Model Selection */}
                            {hasKey && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm">Available Models</Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAllModels(provider.key, provider.models);
                                    }}
                                  >
                                    {provider.models.every(m => selectedModels.includes(m.id)) ? 'Deselect All' : 'Select All'}
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {provider.models.map((model) => {
                                    const isSelected = selectedModels.includes(model.id);
                                    return (
                                      <button
                                        key={model.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleModel(provider.key, model.id);
                                        }}
                                        className={`p-2 rounded-lg border text-left transition-all ${
                                          isSelected
                                            ? 'bg-primary/20 border-primary'
                                            : 'bg-muted/20 border-border hover:border-primary/50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={`w-3 h-3 rounded-sm border ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                            {isSelected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                                          </div>
                                          <div>
                                            <p className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                              {model.name}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">{model.description}</p>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Separator className="bg-border" />
              </div>

              {API_KEY_CATEGORIES.map((category) => (
                <div key={category.name} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {category.keys.filter(k => apiKeys[k.key]).length}/{category.keys.length} connected
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {category.keys.map((config) => (
                      <div key={config.key} className="p-3 bg-muted/20 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-foreground font-medium">{config.label}</Label>
                          <div className="flex items-center gap-2">
                            {keyTestResults[config.key] && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${keyTestResults[config.key].success ? "text-green-500 border-green-500" : "text-red-500 border-red-500"}`}
                              >
                                {keyTestResults[config.key].success ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                {keyTestResults[config.key].success ? "Verified" : "Failed"}
                              </Badge>
                            )}
                            {apiKeys[config.key] && !keyTestResults[config.key] && (
                              <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Connected
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showKeys[config.key] ? "text" : "password"}
                              placeholder={config.placeholder || "Enter API key..."}
                              value={apiKeys[config.key] || ""}
                              onChange={(e) => setApiKeys({ ...apiKeys, [config.key]: e.target.value })}
                              className="pr-10 h-9 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full w-9"
                              onClick={() => toggleKeyVisibility(config.key)}
                            >
                              {showKeys[config.key] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9"
                            disabled={!apiKeys[config.key] || testingKey === config.key}
                            onClick={() => testApiKey(config.key)}
                          >
                            {testingKey === config.key ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            <span className="ml-1 text-xs">Test</span>
                          </Button>
                          {API_WEBSITE_URLS[config.key] && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => window.open(API_WEBSITE_URLS[config.key], '_blank')}
                              title={`Open ${config.label} settings page`}
                            >
                              <ExternalLink className="w-3 h-3 text-primary" />
                            </Button>
                          )}
                          {apiKeys[config.key] && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => {
                                setApiKeys({ ...apiKeys, [config.key]: "" });
                                setKeyTestResults(prev => {
                                  const newResults = { ...prev };
                                  delete newResults[config.key];
                                  return newResults;
                                });
                              }}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="bg-border" />
                </div>
              ))}

              {/* Batch API Key Tester */}
              <BatchApiKeyTester apiKeys={apiKeys} />

              <Button 
                onClick={handleSaveApiKeys} 
                disabled={savingKeys}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
              >
                {savingKeys ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save All API Keys
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <EngineUsageAnalytics />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Prompt Templates
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Create and manage script generation templates with variables
                  </CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) {
                    setEditingTemplate(null);
                    setFormData({ name: "", template_text: "", language: "en", category: "script" });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary text-primary-foreground">
                      <Plus className="w-4 h-4 mr-2" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Template Name</Label>
                          <Input
                            placeholder="e.g., UGC Product Ad"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="script">Script</SelectItem>
                              <SelectItem value="hook">Hook</SelectItem>
                              <SelectItem value="cta">Call to Action</SelectItem>
                              <SelectItem value="testimonial">Testimonial</SelectItem>
                              <SelectItem value="carousel">Carousel</SelectItem>
                              <SelectItem value="story">Story</SelectItem>
                              <SelectItem value="explainer">Explainer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Language</Label>
                        <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ar">Arabic</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Template Text</Label>
                        <Textarea
                          placeholder="Use {{variable_name}} for dynamic content..."
                          value={formData.template_text}
                          onChange={(e) => setFormData({ ...formData, template_text: e.target.value })}
                          rows={8}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Available variables: {"{{product_name}}, {{problem}}, {{benefits}}, {{cta}}, {{audience}}, {{brand_tone}}, {{hooks}}, {{offer}}"}
                        </p>
                      </div>
                      {formData.template_text && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Detected variables:</p>
                          <div className="flex flex-wrap gap-1">
                            {extractVariables(formData.template_text).map((v) => (
                              <Badge key={v} variant="secondary">{v}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button onClick={handleSaveTemplate} disabled={saving} className="w-full">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {editingTemplate ? "Update Template" : "Save Template"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No templates yet. Create your first one!</p>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-start justify-between p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground">{template.name}</h4>
                          {template.is_default && <Badge variant="outline">Default</Badge>}
                          <Badge variant="secondary">{template.language}</Badge>
                          <Badge variant="outline">{template.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {template.template_text}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((v) => (
                            <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="icon" variant="ghost" onClick={() => handleEditTemplate(template)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!template.is_default && (
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteTemplate(template.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* n8n Integration Tab */}
        <TabsContent value="n8n" className="space-y-6">
          {/* Google Drive Integration */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-blue-500" />
                Google Drive Integration
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Automatically create folders for new projects in Google Drive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Google Drive Folder URL</Label>
                <p className="text-xs text-muted-foreground">
                  Paste a Google Drive folder link with editing access. New projects will auto-create subfolders here.
                </p>
                <Input
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={googleDriveFolderUrl}
                  onChange={(e) => setGoogleDriveFolderUrl(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <Button 
                onClick={saveGoogleDriveSettings}
                disabled={savingGoogleDrive}
                className="bg-gradient-primary text-primary-foreground"
              >
                {savingGoogleDrive ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Google Drive Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                n8n Integration
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect your VideoAI SaaS with n8n for powerful automation workflows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User's n8n Webhook URL */}
              <div className="space-y-2">
                <Label className="text-foreground">Your n8n Webhook URL</Label>
                <p className="text-xs text-muted-foreground">Enter your n8n webhook URL to receive automation triggers</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://n8n.yourdomain.com/webhook/VideoAI"
                    value={userN8nWebhook}
                    onChange={(e) => setUserN8nWebhook(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline"
                    onClick={testUserN8nWebhook}
                    disabled={!userN8nWebhook || testingUserWebhook}
                  >
                    {testingUserWebhook ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="ml-2">Test</span>
                  </Button>
                </div>
                {userWebhookStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-500 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Request sent - check your n8n execution history</span>
                  </div>
                )}
                {userWebhookStatus === "error" && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <XCircle className="w-4 h-4" />
                    <span>Failed to send request</span>
                  </div>
                )}
              </div>

              {/* n8n API Key */}
              <div className="space-y-2">
                <Label className="text-foreground">n8n API Key</Label>
                <p className="text-xs text-muted-foreground">Your n8n instance API key for authentication</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys["N8N_API_KEY"] ? "text" : "password"}
                      placeholder="n8n_api_xxxxxxxxxxxxxxxx"
                      value={n8nApiKey}
                      onChange={(e) => setN8nApiKey(e.target.value)}
                      className="font-mono text-sm pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-9"
                      onClick={() => toggleKeyVisibility("N8N_API_KEY")}
                    >
                      {showKeys["N8N_API_KEY"] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Save n8n Settings Button */}
              <Button
                onClick={saveN8nSettings}
                disabled={savingN8nSettings}
                className="bg-gradient-primary text-primary-foreground"
              >
                {savingN8nSettings ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save n8n Settings
              </Button>

              <Separator className="bg-border" />

              {/* AI n8n Workflow Helper */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">AI Workflow Helper</Label>
                    <p className="text-xs text-muted-foreground">Use AI to generate n8n workflow configurations</p>
                  </div>
                  <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-primary text-primary-foreground">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create with AI
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          AI n8n Workflow Generator
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>What do you want to help with?</Label>
                          <div className="flex gap-2">
                            <Button
                              variant={aiAction === "suggest_nodes" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAiAction("suggest_nodes")}
                            >
                              Suggest Nodes
                            </Button>
                            <Button
                              variant={aiAction === "generate_workflow" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAiAction("generate_workflow")}
                            >
                              Generate Workflow
                            </Button>
                            <Button
                              variant={aiAction === "help" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAiAction("help")}
                            >
                              Get Help
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Describe what you want to automate</Label>
                          <Textarea
                            placeholder={
                              aiAction === "suggest_nodes"
                                ? "e.g., I want to automatically post new video outputs to social media..."
                                : aiAction === "generate_workflow"
                                ? "e.g., Create a workflow that triggers when a video is generated, uploads it to S3, and sends a Slack notification..."
                                : "e.g., How do I connect a webhook to a Google Sheets node?"
                            }
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            rows={4}
                          />
                        </div>

                        <Button
                          onClick={generateAiN8nHelp}
                          disabled={aiLoading || !aiPrompt.trim()}
                          className="w-full bg-gradient-primary text-primary-foreground"
                        >
                          {aiLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate with AI
                            </>
                          )}
                        </Button>

                        {aiResult && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>AI Response</Label>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(typeof aiResult === "string" ? aiResult : JSON.stringify(aiResult, null, 2))}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </Button>
                                {/* Deploy button for generated workflows */}
                                {aiAction === "generate_workflow" && typeof aiResult === "object" && aiResult.nodes && (
                                  <Button
                                    size="sm"
                                    onClick={() => deployWorkflowToN8n(aiResult)}
                                    disabled={deployingWorkflow || !userN8nWebhook || !n8nApiKey}
                                    className="bg-gradient-primary text-primary-foreground"
                                  >
                                    {deployingWorkflow ? (
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <Zap className="w-3 h-3 mr-1" />
                                    )}
                                    Deploy to n8n
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border max-h-[300px] overflow-y-auto">
                              {typeof aiResult === "string" ? (
                                <p className="text-sm whitespace-pre-wrap">{aiResult}</p>
                              ) : (
                                <pre className="text-xs font-mono overflow-x-auto">
                                  {JSON.stringify(aiResult, null, 2)}
                                </pre>
                              )}
                            </div>
                            {typeof aiResult === "object" && aiResult.suggestions && (
                              <div className="space-y-2">
                                <Label className="text-sm">Suggested Nodes:</Label>
                                <div className="grid gap-2">
                                  {aiResult.suggestions.map((s: any, i: number) => (
                                    <div key={i} className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                      <div className="font-medium text-sm">{s.name}</div>
                                      <div className="text-xs text-muted-foreground">{s.node_type}</div>
                                      <div className="text-xs mt-1">{s.description}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!userN8nWebhook || !n8nApiKey ? (
                              <p className="text-xs text-amber-500">Configure n8n URL and API key above to deploy workflows</p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Workflow Manager */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Workflow Manager</Label>
                    <p className="text-xs text-muted-foreground">View and manage your n8n workflows</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={listN8nWorkflows}
                    disabled={loadingWorkflows || !userN8nWebhook || !n8nApiKey}
                  >
                    {loadingWorkflows ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Load Workflows
                  </Button>
                </div>

                {showWorkflowManager && n8nWorkflows.length > 0 && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {n8nWorkflows.map((wf: any) => (
                      <div
                        key={wf.id}
                        className="p-3 rounded-lg bg-muted/30 border border-border flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{wf.name}</div>
                          <div className="text-xs text-muted-foreground">
                            ID: {wf.id} • {wf.nodes?.length || 0} nodes
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge
                            variant={wf.active ? "default" : "secondary"}
                            className={wf.active ? "bg-green-500/20 text-green-500" : ""}
                          >
                            {wf.active ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleWorkflowActive(wf.id, !wf.active)}
                          >
                            {wf.active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showWorkflowManager && n8nWorkflows.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No workflows found in your n8n instance
                  </p>
                )}
              </div>

              <Separator className="bg-border" />
              {/* MCP Integration Info */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="font-medium text-primary">n8n MCP Integration</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This platform supports n8n MCP (Model Context Protocol) integration. You can connect n8n as an MCP server 
                  to expose your workflows as tools for AI assistants.
                </p>
                <div className="space-y-2">
                  <Label className="text-xs">Your n8n MCP Server URL</Label>
                  <Input
                    readOnly
                    value={userN8nWebhook ? userN8nWebhook.replace(/\/?$/, "/mcp-server/http") : "Configure webhook URL above"}
                    className="font-mono text-xs bg-muted/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use this URL to connect n8n as an MCP server in your AI tools
                  </p>
                </div>
                <a 
                  href="https://docs.n8n.io/advanced-ai/accessing-n8n-mcp-server/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Learn more about n8n MCP setup
                </a>
              </div>

              <Separator className="bg-border" />

              {/* VideoAI Webhook (for n8n to call) */}
              <div className="space-y-2">
                <Label className="text-foreground">VideoAI Webhook URL (for n8n)</Label>
                <p className="text-xs text-muted-foreground">Use this URL in your n8n workflows to trigger VideoAI actions</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={DEFAULT_N8N_WEBHOOK_URL}
                    className="font-mono text-sm bg-muted/50"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(DEFAULT_N8N_WEBHOOK_URL)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* User ID */}
              <div className="space-y-2">
                <Label className="text-foreground">Your User ID</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={userId || "Loading..."}
                    className="font-mono text-sm bg-muted/50"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(userId || "")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Available Actions */}
              <div className="space-y-3">
                <Label className="text-foreground">Available Actions</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {AVAILABLE_ACTIONS.map((item) => (
                    <Button
                      key={item.action}
                      variant={selectedAction.action === item.action ? "default" : "outline"}
                      size="sm"
                      className="justify-start text-xs"
                      onClick={() => setSelectedAction(item)}
                    >
                      {item.action}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>{selectedAction.action}:</strong> {selectedAction.description}
                </p>
              </div>

              {/* Test Payload */}
              <div className="space-y-2">
                <Label className="text-foreground">Test Payload</Label>
                <Textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              {/* Test Connection */}
              <div className="flex items-center gap-4">
                <Button 
                  onClick={testN8NConnection} 
                  disabled={testingConnection}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  {testingConnection ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Webhook className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                {connectionStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm">Connected</span>
                  </div>
                )}
                {connectionStatus === "error" && (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm">Failed</span>
                  </div>
                )}
              </div>

              <Separator className="bg-border" />

              {/* n8n Setup Instructions */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Setup Instructions for n8n
                </h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Open your n8n workflow editor</li>
                  <li>Add an <strong>HTTP Request</strong> node</li>
                  <li>Set Method to <strong>POST</strong></li>
                  <li>Paste the Webhook URL above</li>
                  <li>Set Body Content Type to <strong>JSON</strong></li>
                  <li>Use the payload format shown above</li>
                  <li>Connect additional nodes to process the response</li>
                </ol>
                <a 
                  href="https://n8n.srv854030.hstgr.cloud" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                >
                  Open n8n Dashboard
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground">Generation Preferences</CardTitle>
              <CardDescription className="text-muted-foreground">
                Customize your default video generation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing Tier Selector */}
              <div className="space-y-3">
                <Label className="text-foreground text-lg font-semibold">Engine Cost Tier</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select which tier of AI engines to use for video generation
                </p>
                <RadioGroup
                  value={settings?.pricing_tier || "normal"}
                  onValueChange={(v) => setSettings(s => s ? { ...s, pricing_tier: v } : null)}
                  className="grid grid-cols-2 gap-4"
                >
                  {PRICING_TIERS.map((tier) => {
                    const IconComponent = tier.icon;
                    return (
                      <div
                        key={tier.value}
                        className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          settings?.pricing_tier === tier.value
                            ? tier.bgColor
                            : "bg-muted/20 border-border hover:border-primary/50"
                        }`}
                      >
                        <RadioGroupItem value={tier.value} id={tier.value} className="sr-only" />
                        <Label htmlFor={tier.value} className="cursor-pointer">
                          <div className="flex items-center gap-3 mb-2">
                            <IconComponent className={`w-5 h-5 ${tier.color}`} />
                            <span className="font-semibold text-foreground">{tier.label}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{tier.description}</p>
                        </Label>
                        {settings?.pricing_tier === tier.value && (
                          <CheckCircle className={`absolute top-3 right-3 w-5 h-5 ${tier.color}`} />
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-2">
                <Label className="text-foreground">Default Language</Label>
                <Select 
                  value={settings?.default_language || "en"} 
                  onValueChange={(v) => setSettings(s => s ? { ...s, default_language: v } : null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabic (Saudi)</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveSettings} disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
