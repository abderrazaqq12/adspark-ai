import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  ChevronDown, 
  Save, 
  Loader2, 
  Image, 
  Video, 
  Mic, 
  Globe, 
  User, 
  Sparkles,
  Package,
  Layout,
  Plus,
  Trash2,
  Wand2,
  Layers,
  MessageSquare,
  Zap,
  Bot,
  Film,
  Type,
  Palette,
  Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// All available functions in the SaaS
const AVAILABLE_FUNCTIONS = [
  { value: "product_content", label: "Product Content / Marketing Angles", category: "Studio" },
  { value: "landing_page_content", label: "Landing Page Content", category: "Studio" },
  { value: "voiceover_scripts", label: "Voiceover Scripts", category: "Studio" },
  { value: "product_name", label: "Product Name Generator", category: "Studio" },
  { value: "image_generation", label: "Image Generation", category: "Studio" },
  { value: "image_prompt_builder", label: "Image Prompt Builder", category: "Studio" },
  { value: "product_description", label: "Product Description", category: "Studio" },
  { value: "heygen_emotion", label: "HeyGen AI Emotion", category: "Avatar" },
  { value: "avatar_women_35", label: "Avatar Women 35+", category: "Avatar" },
  { value: "avatar_women_product", label: "Avatar Women + Product", category: "Avatar" },
  { value: "avatar_men_55", label: "Avatar Men 55+", category: "Avatar" },
  { value: "landing_page_builder", label: "Landing Page Builder (Code)", category: "Landing Pages" },
  { value: "hero_ui_landing", label: "Hero UI Landing Page", category: "Landing Pages" },
  { value: "brand_creation", label: "Brand Creation", category: "Marketing" },
  { value: "sora_video", label: "Sora Video Creation", category: "Video" },
  { value: "product_title", label: "Product Title Generator", category: "Marketing" },
  { value: "heygen_agent", label: "HeyGen Agent", category: "Avatar" },
  { value: "product_animation", label: "Product Animation", category: "Video" },
  { value: "scene_breakdown", label: "Scene Breakdown", category: "Video" },
  { value: "script_generation", label: "Script Generation", category: "Content" },
  { value: "marketing_hooks", label: "Marketing Hooks", category: "Marketing" },
  { value: "offer_generation", label: "Offer Generation", category: "Marketing" },
  { value: "faq_generation", label: "FAQ Generation", category: "Content" },
  { value: "social_proof", label: "Social Proof / Reviews", category: "Content" },
  { value: "video_assembly", label: "Video Assembly Settings", category: "Video" },
  { value: "subtitle_generation", label: "Subtitle Generation", category: "Video" },
  { value: "thumbnail_generation", label: "Thumbnail Generation", category: "Image" },
  { value: "batch_generation", label: "Batch Generation", category: "Automation" },
  { value: "ai_operator", label: "AI Operator Agent", category: "Automation" },
  { value: "quality_check", label: "AI Quality Check", category: "Automation" },
  { value: "custom", label: "Custom Function", category: "Custom" },
];

const FUNCTION_ICONS: Record<string, React.ReactNode> = {
  product_content: <Sparkles className="w-4 h-4" />,
  landing_page_content: <Globe className="w-4 h-4" />,
  voiceover_scripts: <Mic className="w-4 h-4" />,
  product_name: <Package className="w-4 h-4" />,
  image_generation: <Image className="w-4 h-4" />,
  image_prompt_builder: <Image className="w-4 h-4" />,
  product_description: <FileText className="w-4 h-4" />,
  heygen_emotion: <User className="w-4 h-4" />,
  avatar_women_35: <User className="w-4 h-4" />,
  avatar_women_product: <User className="w-4 h-4" />,
  avatar_men_55: <User className="w-4 h-4" />,
  landing_page_builder: <Layout className="w-4 h-4" />,
  hero_ui_landing: <Layout className="w-4 h-4" />,
  brand_creation: <Palette className="w-4 h-4" />,
  sora_video: <Video className="w-4 h-4" />,
  product_title: <Type className="w-4 h-4" />,
  heygen_agent: <Bot className="w-4 h-4" />,
  product_animation: <Film className="w-4 h-4" />,
  scene_breakdown: <Layers className="w-4 h-4" />,
  script_generation: <MessageSquare className="w-4 h-4" />,
  marketing_hooks: <Zap className="w-4 h-4" />,
  offer_generation: <Sparkles className="w-4 h-4" />,
  faq_generation: <MessageSquare className="w-4 h-4" />,
  social_proof: <User className="w-4 h-4" />,
  video_assembly: <Video className="w-4 h-4" />,
  subtitle_generation: <Type className="w-4 h-4" />,
  thumbnail_generation: <Image className="w-4 h-4" />,
  batch_generation: <Layers className="w-4 h-4" />,
  ai_operator: <Bot className="w-4 h-4" />,
  quality_check: <Wand2 className="w-4 h-4" />,
  custom: <Settings2 className="w-4 h-4" />,
};

interface StudioPrompt {
  id: string;
  name: string;
  function: string;
  prompt: string;
  description: string;
  isCustom?: boolean;
}

const DEFAULT_PROMPTS: Omit<StudioPrompt, 'id'>[] = [
  {
    name: "Product Marketing Angles",
    function: "product_content",
    description: "Used in Studio Step 2 - Product Content to generate marketing angles",
    prompt: `You are a top-performing digital marketer with deep experience in product positioning, emotional copywriting, and conversion-optimized messaging.

📦 Based on the product name, product description, ingredients, and any available features or benefits:
{{ product_name }}
{{ product_description }}

🎯 Your Task:
Analyze the product and extract the most persuasive, value-driven insights. Return your answer in three clear sections:

1. Problems Solved
2. Customer Value
3. Marketing Angles

- Give me the results in arabic language`
  },
  {
    name: "Landing Page Content",
    function: "landing_page_content",
    description: "Used in Studio Step 4 - Landing Page Generator for Arabic copy",
    prompt: `You are a senior Arabic eCommerce conversion copywriter, trained on the marketing frameworks of Alex Hormozi and Russell Brunson.

📥 You Will Receive:
Product Name: {{ product_name }}
Description: {{ product_description }}

🎯 Your Goal:
Create a high-converting, emotionally resonant Arabic product description tailored for Saudi eCommerce shoppers.`
  },
  {
    name: "Voiceover Scripts",
    function: "voiceover_scripts",
    description: "Used in Studio Step 5 - Voiceover for generating video ad scripts",
    prompt: `You are a professional digital marketer and UGC ad specialist who has created over 1,000 high-performing video ad scripts for eCommerce brands targeting the Saudi market.

Generate 10 unique 30-second ad scripts, written in spoken Saudi Arabic dialect — designed for Snapchat or TikTok.`
  },
  {
    name: "Product Name Generator",
    function: "product_name",
    description: "Used to generate compelling product names",
    prompt: `استخدم الصيغة التالية لإنشاء اسم المنتج

أسم المنتج + المكون الرئيسي + فوائده`
  },
  {
    name: "Image Generation",
    function: "image_generation",
    description: "Used in Studio Step 3 - Image Generation for product photos",
    prompt: `Act as a professional product photographer. Generate 6 high-quality square images (1:1 format) for the product. The product is targeted at Saudi Arabian men and women aged 30+.`
  },
  {
    name: "Image Prompt Builder",
    function: "image_prompt_builder",
    description: "Advanced image prompt for eCommerce product photos",
    prompt: `Generate 6 high-quality square (1:1) images for an eCommerce store using the attached product image. The product targets Saudi Arabian customers aged 34+.`
  },
  {
    name: "Product Description",
    function: "product_description",
    description: "Generate marketing product descriptions in Arabic",
    prompt: `📝 Prompt لإنشاء وصف تسويقي لمنتج باللغة العربية موجهًا لعملاء السعودية`
  },
  {
    name: "HeyGen AI Emotion",
    function: "heygen_emotion",
    description: "Avatar animation and emotion settings for HeyGen",
    prompt: `Realism and dynamism - Realistic animations, emotional storytelling
Mouth & Lip Sync, Hands & Arms, Head & Torso, Eyes & Brows`
  },
  {
    name: "Avatar Women 35+",
    function: "avatar_women_35",
    description: "Generate realistic female Saudi avatar",
    prompt: `Generate a realistic full-body or half-body avatar of a 35-year-old Saudi Arabian woman, standing or sitting naturally, suitable for 9:16 vertical format.`
  },
  {
    name: "Avatar Women + Product",
    function: "avatar_women_product",
    description: "Female avatar holding product",
    prompt: `Generate a realistic full-body or half-body avatar of a 35-year-old Saudi Arabian woman, dressed in traditional attire, holding a product.`
  },
  {
    name: "Avatar Men 55+",
    function: "avatar_men_55",
    description: "Generate realistic male Saudi avatar",
    prompt: `Generate a hyper-realistic full-body avatar of a 55-year-old Saudi Arabian man, styled and posed in a way that looks indistinguishable from a real human photograph.`
  },
  {
    name: "Landing Page Builder",
    function: "landing_page_builder",
    description: "Generate landing page code in Arabic RTL",
    prompt: `Design a modern, mobile-first landing page for an eCommerce product in Saudi Arabic dialect (dir="rtl", right-aligned text).`
  },
  {
    name: "Hero UI Landing",
    function: "hero_ui_landing",
    description: "Create modern landing page with Hero UI",
    prompt: `Create a modern, mobile-first landing page in Saudi Arabic dialect language for an eCommerce product.`
  },
  {
    name: "Brand Creation",
    function: "brand_creation",
    description: "Complete brand document creation",
    prompt: `You are a Brand Creator Expert. Your job is to take the product information I provide and build out a complete brand document.`
  },
  {
    name: "Sora Video Creation",
    function: "sora_video",
    description: "Create TikTok-style product videos",
    prompt: `Create a high-quality 9:16 TikTok-style product video. No voiceover or on-screen text. Focus entirely on visual storytelling.`
  },
  {
    name: "Product Title Generator",
    function: "product_title",
    description: "Generate emotionally compelling product titles",
    prompt: `Write one single product title that is emotionally compelling and makes the reader want to buy the product immediately.`
  },
  {
    name: "HeyGen Agent",
    function: "heygen_agent",
    description: "Professional UGC video ad creator settings",
    prompt: `You are a professional UGC video ad creator specialized in eCommerce and COD businesses in Saudi Arabia.`
  },
  {
    name: "Product Animation",
    function: "product_animation",
    description: "Create premium product animation videos",
    prompt: `Create a high-quality product animation video using the provided product photo. Premium studio look with elegant slow motion + cinematic lighting.`
  }
];

export default function StudioPrompts() {
  const [prompts, setPrompts] = useState<StudioPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({});
  const [editedPrompts, setEditedPrompts] = useState<Record<string, { prompt: string; function: string; name: string; description: string }>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: "", function: "", description: "", prompt: "" });

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      const savedData = (settings?.preferences as Record<string, any>)?.studio_prompts_v2 || {};
      const savedPrompts = savedData.prompts || {};
      const customPrompts = savedData.custom_prompts || [];

      // Merge default prompts with saved prompts
      const mergedPrompts: StudioPrompt[] = DEFAULT_PROMPTS.map((defaultPrompt, index) => {
        const saved = savedPrompts[defaultPrompt.function];
        return {
          ...defaultPrompt,
          id: `default_${index}`,
          prompt: saved?.prompt || defaultPrompt.prompt,
          function: saved?.function || defaultPrompt.function,
          name: saved?.name || defaultPrompt.name,
          description: saved?.description || defaultPrompt.description,
          isCustom: false,
        };
      });

      // Add custom prompts
      customPrompts.forEach((custom: any, index: number) => {
        mergedPrompts.push({
          id: `custom_${index}`,
          name: custom.name,
          function: custom.function,
          description: custom.description,
          prompt: custom.prompt,
          isCustom: true,
        });
      });

      setPrompts(mergedPrompts);
      
      // Initialize edited prompts
      const initialEdits: Record<string, { prompt: string; function: string; name: string; description: string }> = {};
      mergedPrompts.forEach(p => {
        initialEdits[p.id] = {
          prompt: p.prompt,
          function: p.function,
          name: p.name,
          description: p.description,
        };
      });
      setEditedPrompts(initialEdits);
    } catch (error) {
      console.error("Error loading prompts:", error);
      toast.error("Failed to load prompts");
    } finally {
      setLoading(false);
    }
  };

  const savePrompts = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current preferences
      const { data: settings } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentPrefs = (settings?.preferences as Record<string, any>) || {};
      
      // Separate default and custom prompts
      const defaultPromptsData: Record<string, any> = {};
      const customPromptsData: any[] = [];

      Object.entries(editedPrompts).forEach(([id, data]) => {
        const prompt = prompts.find(p => p.id === id);
        if (prompt?.isCustom) {
          customPromptsData.push({
            name: data.name,
            function: data.function,
            description: data.description,
            prompt: data.prompt,
          });
        } else if (prompt) {
          defaultPromptsData[data.function] = {
            name: data.name,
            function: data.function,
            description: data.description,
            prompt: data.prompt,
          };
        }
      });

      // Update with new format
      const updatedPrefs = {
        ...currentPrefs,
        studio_prompts_v2: {
          prompts: defaultPromptsData,
          custom_prompts: customPromptsData,
        },
        // Also keep old format for backward compatibility
        studio_prompts: Object.fromEntries(
          Object.entries(defaultPromptsData).map(([key, val]: [string, any]) => [key, val.prompt])
        ),
      };

      const { error } = await supabase
        .from("user_settings")
        .update({ preferences: updatedPrefs })
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      setPrompts(prev => prev.map(p => ({
        ...p,
        ...(editedPrompts[p.id] || {}),
      })));

      toast.success("Prompts saved successfully");
    } catch (error) {
      console.error("Error saving prompts:", error);
      toast.error("Failed to save prompts");
    } finally {
      setSaving(false);
    }
  };

  const togglePrompt = (id: string) => {
    setExpandedPrompts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updatePromptField = (id: string, field: string, value: string) => {
    setEditedPrompts(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const resetPrompt = (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt || prompt.isCustom) return;

    const defaultPrompt = DEFAULT_PROMPTS.find(p => p.function === prompt.function);
    if (defaultPrompt) {
      setEditedPrompts(prev => ({
        ...prev,
        [id]: {
          prompt: defaultPrompt.prompt,
          function: defaultPrompt.function,
          name: defaultPrompt.name,
          description: defaultPrompt.description,
        },
      }));
      toast.success("Prompt reset to default");
    }
  };

  const addNewPrompt = () => {
    if (!newPrompt.name || !newPrompt.function || !newPrompt.prompt) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newId = `custom_${Date.now()}`;
    const newPromptData: StudioPrompt = {
      id: newId,
      name: newPrompt.name,
      function: newPrompt.function,
      description: newPrompt.description,
      prompt: newPrompt.prompt,
      isCustom: true,
    };

    setPrompts(prev => [...prev, newPromptData]);
    setEditedPrompts(prev => ({
      ...prev,
      [newId]: {
        prompt: newPrompt.prompt,
        function: newPrompt.function,
        name: newPrompt.name,
        description: newPrompt.description,
      },
    }));

    setNewPrompt({ name: "", function: "", description: "", prompt: "" });
    setIsAddDialogOpen(false);
    toast.success("New prompt added. Don't forget to save!");
  };

  const deletePrompt = (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt?.isCustom) {
      toast.error("Cannot delete default prompts");
      return;
    }

    setPrompts(prev => prev.filter(p => p.id !== id));
    setEditedPrompts(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    toast.success("Prompt deleted. Don't forget to save!");
  };

  const getIcon = (functionName: string) => {
    return FUNCTION_ICONS[functionName] || <FileText className="w-4 h-4" />;
  };

  const getFunctionLabel = (functionValue: string) => {
    return AVAILABLE_FUNCTIONS.find(f => f.value === functionValue)?.label || functionValue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Studio Prompts
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Customize the AI prompts used in each Studio step. Each prompt is linked to a specific function.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Custom Prompt</DialogTitle>
                  <DialogDescription>
                    Create a new prompt and link it to a specific function in the platform.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Prompt Name *</Label>
                    <Input
                      value={newPrompt.name}
                      onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Custom Marketing Hook Generator"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Linked Function *</Label>
                    <Select
                      value={newPrompt.function}
                      onValueChange={(value) => setNewPrompt(prev => ({ ...prev, function: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a function to link this prompt to" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(
                          AVAILABLE_FUNCTIONS.reduce((acc, func) => {
                            if (!acc[func.category]) acc[func.category] = [];
                            acc[func.category].push(func);
                            return acc;
                          }, {} as Record<string, typeof AVAILABLE_FUNCTIONS>)
                        ).map(([category, funcs]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                              {category}
                            </div>
                            {funcs.map((func) => (
                              <SelectItem key={func.value} value={func.value}>
                                <div className="flex items-center gap-2">
                                  {getIcon(func.value)}
                                  <span>{func.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newPrompt.description}
                      onChange={(e) => setNewPrompt(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g., Used for generating custom marketing hooks"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prompt Text *</Label>
                    <Textarea
                      value={newPrompt.prompt}
                      onChange={(e) => setNewPrompt(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="Enter your prompt text here..."
                      className="min-h-[150px] font-mono text-sm"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addNewPrompt}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Prompt
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={savePrompts} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save All Prompts
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {prompts.map((prompt) => (
          <Collapsible key={prompt.id} open={expandedPrompts[prompt.id]}>
            <CollapsibleTrigger 
              className="w-full"
              onClick={() => togglePrompt(prompt.id)}
            >
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    {getIcon(editedPrompts[prompt.id]?.function || prompt.function)}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{editedPrompts[prompt.id]?.name || prompt.name}</p>
                      {prompt.isCustom && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">Custom</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{editedPrompts[prompt.id]?.description || prompt.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={editedPrompts[prompt.id]?.function || prompt.function}
                    onValueChange={(value) => updatePromptField(prompt.id, "function", value)}
                  >
                    <SelectTrigger className="w-[200px] bg-background" onClick={(e) => e.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(
                        AVAILABLE_FUNCTIONS.reduce((acc, func) => {
                          if (!acc[func.category]) acc[func.category] = [];
                          acc[func.category].push(func);
                          return acc;
                        }, {} as Record<string, typeof AVAILABLE_FUNCTIONS>)
                      ).map(([category, funcs]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {category}
                          </div>
                          {funcs.map((func) => (
                            <SelectItem key={func.value} value={func.value}>
                              <div className="flex items-center gap-2">
                                {getIcon(func.value)}
                                <span className="truncate">{func.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedPrompts[prompt.id] ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 border border-t-0 border-border rounded-b-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prompt Name</Label>
                    <Input
                      value={editedPrompts[prompt.id]?.name || ""}
                      onChange={(e) => updatePromptField(prompt.id, "name", e.target.value)}
                      placeholder="Enter prompt name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={editedPrompts[prompt.id]?.description || ""}
                      onChange={(e) => updatePromptField(prompt.id, "description", e.target.value)}
                      placeholder="Enter description"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">
                      Linked Function: <code className="bg-muted px-1 py-0.5 rounded text-xs">{getFunctionLabel(editedPrompts[prompt.id]?.function || prompt.function)}</code>
                    </Label>
                    <div className="flex items-center gap-2">
                      {prompt.isCustom && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => deletePrompt(prompt.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      )}
                      {!prompt.isCustom && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => resetPrompt(prompt.id)}
                        >
                          Reset to Default
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={editedPrompts[prompt.id]?.prompt || ""}
                    onChange={(e) => updatePromptField(prompt.id, "prompt", e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    placeholder="Enter your custom prompt..."
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
