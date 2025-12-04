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
import { Save, Plus, Trash2, FileText, Loader2, Pencil, Webhook, Copy, CheckCircle, XCircle, ExternalLink, Zap, Key, Eye, EyeOff, Bot, RefreshCw, DollarSign, Sparkles, TrendingUp, Crown } from "lucide-react";
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
}

interface APIKeyCategory {
  name: string;
  keys: APIKeyConfig[];
}

const API_KEY_CATEGORIES: APIKeyCategory[] = [
  {
    name: "AI Assistants",
    keys: [
      { key: "OPENAI_API_KEY", label: "OpenAI API Key", description: "For ChatGPT AI Assistant", placeholder: "sk-..." },
      { key: "GEMINI_API_KEY", label: "Google Gemini API Key", description: "For Gemini AI Assistant", placeholder: "AIza..." },
    ]
  },
  {
    name: "Text-to-Video Engines",
    keys: [
      { key: "RUNWAY_API_KEY", label: "Runway API Key", description: "High-quality cinematic video generation", placeholder: "rw_..." },
      { key: "PIKA_API_KEY", label: "Pika Labs API Key", description: "Creative & animated video generation", placeholder: "" },
      { key: "HAILUO_API_KEY", label: "Hailuo AI API Key", description: "Fast video generation with realistic motion", placeholder: "" },
      { key: "KLING_API_KEY", label: "Kling AI API Key", description: "High-quality AI video with long duration", placeholder: "" },
      { key: "VIDU_API_KEY", label: "Vidu API Key", description: "Text-to-video with character consistency", placeholder: "" },
      { key: "LTX_API_KEY", label: "LTX Studio API Key", description: "AI filmmaking and video creation", placeholder: "" },
      { key: "WAN_API_KEY", label: "Wan Video API Key", description: "Fast text-to-video generation", placeholder: "" },
      { key: "SKYREELS_API_KEY", label: "SkyReels API Key", description: "Cinematic video generation", placeholder: "" },
      { key: "SEEDANCE_API_KEY", label: "Seedance API Key", description: "Dance & motion video generation", placeholder: "" },
      { key: "HIGGSFIELD_API_KEY", label: "Higgsfield API Key", description: "Personalized AI video creation", placeholder: "" },
    ]
  },
  {
    name: "Avatar & UGC Engines",
    keys: [
      { key: "HEYGEN_API_KEY", label: "HeyGen API Key", description: "Professional avatar video generation", placeholder: "" },
      { key: "ELAI_API_KEY", label: "Elai.io API Key", description: "AI avatar video from text", placeholder: "" },
      { key: "ARCADS_API_KEY", label: "Arcads API Key", description: "UGC-style ad video generation", placeholder: "" },
      { key: "CREATIFY_API_KEY", label: "Creatify API Key", description: "AI-powered ad creative generation", placeholder: "" },
      { key: "JOGG_API_KEY", label: "Jogg AI API Key", description: "AI avatar marketing videos", placeholder: "" },
      { key: "TWINADS_API_KEY", label: "TwinAds API Key", description: "AI twin avatar ads", placeholder: "" },
      { key: "VIDNOZ_API_KEY", label: "Vidnoz API Key", description: "AI avatar video maker", placeholder: "" },
      { key: "CELEBIFY_API_KEY", label: "CelebifyAI API Key", description: "Celebrity-style avatar videos", placeholder: "" },
      { key: "OMNIHUMAN_API_KEY", label: "OmniHuman API Key", description: "Realistic human avatar generation", placeholder: "" },
      { key: "HEDRA_API_KEY", label: "Hedra API Key", description: "AI character video generation", placeholder: "" },
    ]
  },
  {
    name: "Image-to-Video Engines",
    keys: [
      { key: "LEONARDO_API_KEY", label: "Leonardo AI API Key", description: "Image generation & animation", placeholder: "" },
      { key: "FAL_API_KEY", label: "Fal AI API Key", description: "Fast image-to-video generation", placeholder: "" },
      { key: "FLUX_API_KEY", label: "Flux AI API Key", description: "Image-to-video transformation", placeholder: "" },
      { key: "FLORAFAUNA_API_KEY", label: "Flora Fauna API Key", description: "Product image animation", placeholder: "" },
    ]
  },
  {
    name: "Template & Editing Engines",
    keys: [
      { key: "PICTORY_API_KEY", label: "Pictory API Key", description: "Script to video with templates", placeholder: "" },
      { key: "QUSO_API_KEY", label: "Quso AI API Key", description: "Social media video automation", placeholder: "" },
      { key: "TOPVIEW_API_KEY", label: "TopView API Key", description: "AI video ads from URLs", placeholder: "" },
      { key: "FLEXCLIP_API_KEY", label: "FlexClip API Key", description: "Template-based video editor", placeholder: "" },
      { key: "FLIKI_API_KEY", label: "Fliki API Key", description: "Text to video with voiceover", placeholder: "" },
      { key: "INVIDEO_API_KEY", label: "InVideo API Key", description: "AI video creation platform", placeholder: "" },
      { key: "CREATOMATE_API_KEY", label: "Creatomate API Key", description: "Video automation API", placeholder: "" },
      { key: "JSON2VIDEO_API_KEY", label: "JSON2Video API Key", description: "Programmatic video generation", placeholder: "" },
      { key: "SHOTSTACK_API_KEY", label: "Shotstack API Key", description: "Cloud video editing API", placeholder: "" },
      { key: "WISECUT_API_KEY", label: "Wisecut API Key", description: "AI video editing automation", placeholder: "" },
      { key: "ZEBRACAT_API_KEY", label: "Zebracat API Key", description: "AI marketing video creator", placeholder: "" },
      { key: "OPUS_API_KEY", label: "Opus Pro API Key", description: "Long-form to short-form clips", placeholder: "" },
      { key: "CAPTIONS_API_KEY", label: "Captions AI API Key", description: "AI captions & video editing", placeholder: "" },
      { key: "NIM_API_KEY", label: "Nim Video API Key", description: "AI video summarization", placeholder: "" },
      { key: "SCADE_API_KEY", label: "Scade Pro API Key", description: "AI workflow automation", placeholder: "" },
      { key: "CRAYO_API_KEY", label: "Crayo AI API Key", description: "Short-form video automation", placeholder: "" },
    ]
  },
  {
    name: "Voice & Audio",
    keys: [
      { key: "ELEVENLABS_API_KEY", label: "ElevenLabs API Key", description: "High-quality voice synthesis", placeholder: "" },
      { key: "FLAIR_API_KEY", label: "Flair AI API Key", description: "AI voiceover generation", placeholder: "" },
    ]
  },
  {
    name: "AI Platforms",
    keys: [
      { key: "HUGGINGFACE_API_KEY", label: "Hugging Face API Key", description: "Open-source AI models", placeholder: "hf_..." },
      { key: "LIVGEN_API_KEY", label: "LivGen API Key", description: "Live AI video generation", placeholder: "" },
      { key: "AIVIDEO_API_KEY", label: "AI Video API Key", description: "General AI video platform", placeholder: "" },
    ]
  },
];

const N8N_WEBHOOK_URL = "https://bedeukijnixeihjepbjg.supabase.co/functions/v1/n8n-webhook";

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
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savingKeys, setSavingKeys] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  
  // n8n integration state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [selectedAction, setSelectedAction] = useState(AVAILABLE_ACTIONS[0]);
  const [testPayload, setTestPayload] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

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
          setApiKeys(settingsRes.data.api_keys as Record<string, string>);
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

      const { error } = await supabase
        .from("user_settings")
        .update({ api_keys: apiKeys })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("API keys saved securely");
    } catch (error) {
      console.error("Error saving API keys:", error);
      toast.error("Failed to save API keys");
    } finally {
      setSavingKeys(false);
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
      const response = await fetch(N8N_WEBHOOK_URL, {
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
              {/* Webhook URL */}
              <div className="space-y-2">
                <Label className="text-foreground">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={N8N_WEBHOOK_URL}
                    className="font-mono text-sm bg-muted/50"
                  />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(N8N_WEBHOOK_URL)}>
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
