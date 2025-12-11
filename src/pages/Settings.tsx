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
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, FileText, Loader2, Pencil, Webhook, Copy, CheckCircle, XCircle, ExternalLink, Zap, Key, Eye, EyeOff, Bot, RefreshCw, DollarSign, Sparkles, TrendingUp, Crown, ChevronDown, Power, Database, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BatchApiKeyTester from "@/components/BatchApiKeyTester";
import EngineUsageAnalytics from "@/components/EngineUsageAnalytics";
import N8nBackendSettings from "@/components/N8nBackendSettings";
import { StudioDataSettings } from "@/components/studio/StudioDataSettings";
import StudioPrompts from "@/components/StudioPrompts";
import DeploymentSettings from "@/components/DeploymentSettings";
import { useSecureApiKeys } from "@/hooks/useSecureApiKeys";


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
  KLING_ACCESS_KEY: "https://app.klingai.com/global/dev/api-key",
  KLING_SECRET_KEY: "https://app.klingai.com/global/dev/api-key",
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
  KIEAI_API_KEY: "https://docs.kie.ai/",
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
    description: "Free tier: 10 req/hour. Gemma 3 models FREE forever",
    placeholder: "aiml_xxxxxxxxxxxxxxxx",
    models: [
      { id: "gemma-3-4b", name: "Gemma 3 4B (FREE)", description: "Free - Google's fast model" },
      { id: "gemma-3-12b", name: "Gemma 3 12B (FREE)", description: "Free - Better reasoning" },
      { id: "gemma-3-27b", name: "Gemma 3 27B (FREE)", description: "Free - Best open model" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "OpenAI's most capable" },
      { id: "claude-3-sonnet", name: "Claude 3 Sonnet", description: "Balanced performance" },
      { id: "llama-3.1-70b", name: "Llama 3.1 70B", description: "Meta's open model" },
      { id: "flux-pro", name: "Flux Pro", description: "Image generation" },
    ]
  },
  {
    key: "OPENROUTER_API_KEY",
    label: "OpenRouter",
    description: "29+ FREE models including Gemma 3, Llama 3.3, Gemini 2.0",
    placeholder: "sk-or-v1-xxxxxxxxxxxxxxxx",
    models: [
      { id: "google/gemma-3-4b-free", name: "Gemma 3 4B (FREE)", description: "$0/M tokens" },
      { id: "google/gemma-3-12b-free", name: "Gemma 3 12B (FREE)", description: "$0/M tokens" },
      { id: "google/gemma-3-27b-free", name: "Gemma 3 27B (FREE)", description: "$0/M tokens, 131K ctx" },
      { id: "google/gemini-2.0-flash-exp-free", name: "Gemini 2.0 Flash (FREE)", description: "$0/M, 1M context" },
      { id: "meta-llama/llama-3.3-70b-instruct-free", name: "Llama 3.3 70B (FREE)", description: "$0/M, 131K ctx" },
      { id: "meta-llama/llama-3.2-3b-instruct-free", name: "Llama 3.2 3B (FREE)", description: "$0/M tokens" },
      { id: "nousresearch/hermes-3-405b-instruct-free", name: "Hermes 3 405B (FREE)", description: "$0/M tokens" },
      { id: "mistralai/mistral-7b-instruct-free", name: "Mistral 7B (FREE)", description: "$0/M tokens" },
      { id: "amazon/nova-2-lite-free", name: "Nova 2 Lite (FREE)", description: "1M context" },
      { id: "nvidia/nemotron-nano-12b-2-vl-free", name: "Nemotron 12B (FREE)", description: "Vision model" },
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
    description: "Fast video & image - Wan 2.5 $0.05/sec (CHEAPEST)",
    placeholder: "fal_xxxxxxxxxxxxxxxx",
    models: [
      { id: "wan-2.5", name: "Wan 2.5 ($0.05/sec)", description: "CHEAPEST - 20 sec/$1" },
      { id: "kling-2.5-turbo-pro", name: "Kling 2.5 Pro ($0.07/sec)", description: "14 sec/$1" },
      { id: "veo-3", name: "Veo 3 ($0.40/sec)", description: "High quality" },
      { id: "ovi", name: "Ovi ($0.20/video)", description: "5 videos/$1" },
      { id: "flux-pro", name: "Flux Pro", description: "Best image quality" },
      { id: "flux-schnell", name: "Flux Schnell", description: "Fast image gen" },
      { id: "stable-video-diffusion", name: "Stable Video", description: "Image to video" },
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
  {
    key: "KIEAI_API_KEY",
    label: "Kie.ai",
    description: "Unified API for Veo3, Suno, Runway, Luma, Flux Kontext & more",
    placeholder: "kie_xxxxxxxxxxxxxxxx",
    models: [
      { id: "veo3.1", name: "Veo 3.1", description: "Google's latest video model" },
      { id: "runway-gen3", name: "Runway Gen-3", description: "High-quality video" },
      { id: "luma-dream", name: "Luma Dream Machine", description: "Creative video gen" },
      { id: "suno-v3", name: "Suno v3", description: "AI music generation" },
      { id: "flux-kontext", name: "Flux Kontext", description: "Context-aware images" },
      { id: "4o-image", name: "4o Image", description: "OpenAI image generation" },
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
      { key: "KLING_ACCESS_KEY", label: "Kling AI Access Key", description: "Kling AI Access Key (part 1 of 2)", placeholder: "A8faJnmkGtN9RfyH..." },
      { key: "KLING_SECRET_KEY", label: "Kling AI Secret Key", description: "Kling AI Secret Key (part 2 of 2)", placeholder: "BPHb98dtYLtMdPAT..." },
      { key: "VIDU_API_KEY", label: "Vidu API Key", description: "Text-to-video with character consistency", placeholder: "vd_xxxxxxxxxxxxxxxx" },
      { key: "LTX_API_KEY", label: "LTX Studio API Key", description: "AI filmmaking and video creation", placeholder: "ltx_xxxxxxxxxxxxxxxx" },
      { key: "WAN_API_KEY", label: "Wan Video API Key", description: "Fast text-to-video ($0.05/sec - cheapest)", placeholder: "wan_xxxxxxxxxxxxxxxx" },
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
  
  // Secure API Keys hook
  const { 
    providers: secureProviders, 
    loading: secureKeysLoading, 
    saveApiKey: saveSecureApiKey,
    deleteApiKey: deleteSecureApiKey,
    toggleApiKeyActive: toggleSecureKeyActive,
    hasApiKey,
    isApiKeyActive,
    refreshProviders,
  } = useSecureApiKeys();
  
  // API Keys state - now only for input values (not storage)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [activatedModels, setActivatedModels] = useState<Record<string, string[]>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [savingKeys, setSavingKeys] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [activeApiKeys, setActiveApiKeys] = useState<Record<string, boolean>>({});
  
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
        // Only load activated models from user_settings (not API keys)
        if (settingsRes.data.api_keys) {
          const keys = settingsRes.data.api_keys as Record<string, any>;
          const modelsOnly: Record<string, string[]> = {};
          
          Object.entries(keys).forEach(([key, value]) => {
            if (key.endsWith('_MODELS') && Array.isArray(value)) {
              modelsOnly[key.replace('_MODELS', '')] = value;
            }
          });
          
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
      
      // Refresh secure API key providers
      await refreshProviders();
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

      // Save each API key securely using the secure_api_keys table
      const savePromises: Promise<boolean>[] = [];
      
      Object.entries(apiKeys).forEach(([provider, key]) => {
        if (key && key.trim().length > 0) {
          // Save to secure storage
          savePromises.push(
            saveSecureApiKey(provider, key, activeApiKeys[provider] ?? true)
          );
        }
      });
      
      await Promise.all(savePromises);

      // Only save model preferences to user_settings (no API keys)
      const modelPrefs: Record<string, any> = {};
      Object.entries(activatedModels).forEach(([provider, models]) => {
        modelPrefs[`${provider}_MODELS`] = models;
      });

      const { error } = await supabase
        .from("user_settings")
        .update({ api_keys: modelPrefs })
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Clear the input fields after saving (keys are now stored securely)
      setApiKeys({});
      await refreshProviders();
      
      toast.success("API keys saved securely", {
        description: "Your API keys are now encrypted and stored safely",
        icon: <ShieldCheck className="h-4 w-4 text-green-500" />,
      });
    } catch (error) {
      console.error("Error saving API keys:", error);
      toast.error("Failed to save API keys");
    } finally {
      setSavingKeys(false);
    }
  };

  const toggleApiKeyActive = async (key: string) => {
    // Check if key exists in secure storage
    if (hasApiKey(key)) {
      // Toggle in secure storage
      const newState = !isApiKeyActive(key);
      await toggleSecureKeyActive(key, newState);
    } else {
      // Toggle in local state for new keys being entered
      setActiveApiKeys(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };
  
  const handleDeleteApiKey = async (provider: string) => {
    const success = await deleteSecureApiKey(provider);
    if (success) {
      toast.success(`${provider} API key deleted`);
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

      <Tabs defaultValue="deployment" className="space-y-6">
          <TabsList className="bg-muted/50 flex-wrap h-auto p-1">
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="backend">Backend Mode</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Deployment Tab */}
        <TabsContent value="deployment" className="space-y-6">
          <DeploymentSettings />
        </TabsContent>

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
                  {hasApiKey('OPENAI_API_KEY') && <Badge className="bg-green-500/20 text-green-500">ChatGPT ✓</Badge>}
                  {hasApiKey('GEMINI_API_KEY') && <Badge className="bg-blue-500/20 text-blue-500">Gemini ✓</Badge>}
                  {!hasApiKey('OPENAI_API_KEY') && <Badge variant="outline">ChatGPT (needs key)</Badge>}
                  {!hasApiKey('GEMINI_API_KEY') && <Badge variant="outline">Gemini (needs key)</Badge>}
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
                    const isSecurelyStored = hasApiKey(provider.key);
                    const hasInputValue = !!apiKeys[provider.key];
                    const keyStatus = isSecurelyStored || hasInputValue;
                    
                    return (
                      <div key={provider.key} className="border border-border rounded-lg overflow-hidden">
                        <div 
                          className={`p-4 cursor-pointer transition-colors ${keyStatus ? 'bg-primary/5' : 'bg-muted/20'}`}
                          onClick={() => setExpandedProviders(prev => ({ ...prev, [provider.key]: !prev[provider.key] }))}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${isSecurelyStored ? 'bg-green-500' : hasInputValue ? 'bg-yellow-500' : 'bg-muted-foreground'}`} />
                              <div>
                                <Label className="text-foreground font-medium cursor-pointer">{provider.label}</Label>
                                <p className="text-xs text-muted-foreground">{provider.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {keyStatus && selectedModels.length > 0 && (
                                <Badge className="bg-primary/20 text-primary text-xs">
                                  {selectedModels.length} models active
                                </Badge>
                              )}
                              {isSecurelyStored && (
                                <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                                  <ShieldCheck className="w-3 h-3 mr-1" />
                                  Secured
                                </Badge>
                              )}
                              {!isSecurelyStored && hasInputValue && (
                                <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs">
                                  Unsaved
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
                            {(isSecurelyStored || hasInputValue) && (
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
                    {category.keys.map((config) => {
                      const isKlingKey = config.key === 'KLING_ACCESS_KEY' || config.key === 'KLING_SECRET_KEY';
                      const isActive = activeApiKeys[config.key] !== false; // Default to active
                      
                      return (
                        <div 
                          key={config.key} 
                          className={`p-3 rounded-lg space-y-2 border transition-all ${
                            isActive 
                              ? 'bg-muted/20 border-border' 
                              : 'bg-muted/5 border-border/50 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={isActive}
                                onCheckedChange={() => toggleApiKeyActive(config.key)}
                                className="data-[state=checked]:bg-primary"
                              />
                              <Label className={`font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {config.label}
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              {isActive && keyTestResults[config.key] && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${keyTestResults[config.key].success ? "text-green-500 border-green-500" : "text-red-500 border-red-500"}`}
                                >
                                  {keyTestResults[config.key].success ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                  {keyTestResults[config.key].success ? "Verified" : "Failed"}
                                </Badge>
                              )}
                              {isActive && apiKeys[config.key] && !keyTestResults[config.key] && (
                                <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Connected
                                </Badge>
                              )}
                              {!isActive && (
                                <Badge variant="outline" className="text-muted-foreground border-muted text-xs">
                                  <Power className="w-3 h-3 mr-1" />
                                  Disabled
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground ml-10">{config.description}</p>
                          {isActive && (
                            <div className="flex gap-2 ml-10">
                              <div className="relative flex-1">
                                <Input
                                  type={showKeys[config.key] ? "text" : "password"}
                                  placeholder={config.placeholder || "Enter API key..."}
                                  value={apiKeys[config.key] || ""}
                                  onChange={(e) => {
                                    setApiKeys({ ...apiKeys, [config.key]: e.target.value });
                                    // For Kling, auto-enable when both keys are entered
                                    if (e.target.value) {
                                      setActiveApiKeys(prev => ({ ...prev, [config.key]: true }));
                                    }
                                  }}
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
                              {/* Test button - for Kling, test both keys together */}
                              {!isKlingKey ? (
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
                              ) : config.key === 'KLING_SECRET_KEY' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9"
                                  disabled={!apiKeys['KLING_ACCESS_KEY'] || !apiKeys['KLING_SECRET_KEY'] || testingKey === 'KLING_API_KEY'}
                                  onClick={() => {
                                    // Combine access and secret keys for testing
                                    const combinedKey = `${apiKeys['KLING_ACCESS_KEY']}:${apiKeys['KLING_SECRET_KEY']}`;
                                    setApiKeys(prev => ({ ...prev, 'KLING_API_KEY': combinedKey }));
                                    testApiKey('KLING_API_KEY');
                                  }}
                                >
                                  {testingKey === 'KLING_API_KEY' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  <span className="ml-1 text-xs">Test Kling</span>
                                </Button>
                              )}
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
                          )}
                        </div>
                      );
                    })}
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

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Data Integrations
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect Google Drive and Google Sheets for seamless Studio workflow automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudioDataSettings />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="space-y-6">
          <StudioPrompts />
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

              {/* AI Agent Settings */}
              <div className="space-y-3">
                <Label className="text-foreground text-lg font-semibold flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  AI Agent
                </Label>
                <p className="text-sm text-muted-foreground">
                  Choose which AI model to use for text content generation in Studio
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">AI Model for Text Generation</Label>
                <RadioGroup
                  value={(settings as any)?.ai_agent || "gemini"}
                  onValueChange={(v) => setSettings(s => s ? { ...s, ai_agent: v } as any : null)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      (settings as any)?.ai_agent === "chatgpt"
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-muted/20 border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="chatgpt" id="ai-chatgpt" className="sr-only" />
                    <Label htmlFor="ai-chatgpt" className="cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#10a37f] flex items-center justify-center text-white font-bold text-sm">
                          G
                        </div>
                        <span className="font-semibold text-foreground">ChatGPT</span>
                      </div>
                      <p className="text-sm text-muted-foreground">OpenAI GPT-4 for high-quality content</p>
                    </Label>
                    {(settings as any)?.ai_agent === "chatgpt" && (
                      <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      (settings as any)?.ai_agent === "gemini" || !(settings as any)?.ai_agent
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-muted/20 border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="gemini" id="ai-gemini" className="sr-only" />
                    <Label htmlFor="ai-gemini" className="cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          G
                        </div>
                        <span className="font-semibold text-foreground">Gemini</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Google Gemini for fast & efficient content</p>
                    </Label>
                    {((settings as any)?.ai_agent === "gemini" || !(settings as any)?.ai_agent) && (
                      <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Make sure you have the corresponding API key configured in the API Keys section
                </p>
              </div>

              <Separator className="bg-border" />

              {/* Default Audience Settings */}
              <div className="space-y-3">
                <Label className="text-foreground text-lg font-semibold">Default Audience</Label>
                <p className="text-sm text-muted-foreground">
                  Set default language and market for content generation
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Default Language</Label>
                  <Select 
                    value={settings?.default_language || "ar"} 
                    onValueChange={(v) => setSettings(s => s ? { ...s, default_language: v } : null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">Arabic (Saudi Dialect)</SelectItem>
                      <SelectItem value="ar-msa">Arabic (Modern Standard)</SelectItem>
                      <SelectItem value="ar-gulf">Arabic (Gulf)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Default Market</Label>
                  <Select 
                    value={(settings as any)?.default_market || "GCC"} 
                    onValueChange={(v) => setSettings(s => s ? { ...s, default_market: v } as any : null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GCC">GCC</SelectItem>
                      <SelectItem value="EUROPE">Europe</SelectItem>
                      <SelectItem value="LATAM">LATAM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backend Mode Tab */}
        <TabsContent value="backend" className="space-y-6">
          <N8nBackendSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
