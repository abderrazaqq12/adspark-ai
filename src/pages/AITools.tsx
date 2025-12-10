import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Wand2, 
  Video, 
  Image, 
  Sparkles, 
  Upload, 
  Loader2,
  ArrowUpCircle,
  Type,
  RefreshCw,
  Users,
  Zap,
  Play,
  Settings2
} from "lucide-react";
import { toast } from "sonner";
import { useExtendedAITools } from "@/hooks/useExtendedAITools";

export default function AITools() {
  const { 
    isExecuting, 
    executionProgress, 
    executeTool, 
    getTools,
    getImageModels,
    getVideoModels,
    getTalkingActorModels,
    getPresets
  } = useExtendedAITools();

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [targetMarket, setTargetMarket] = useState("GCC");
  const [language, setLanguage] = useState("ar");

  const tools = getTools();
  const imageModels = getImageModels();
  const videoModels = getVideoModels();
  const talkingActorModels = getTalkingActorModels();
  const presets = getPresets();

  const handleExecuteTool = async (toolId: string) => {
    if (!inputUrl && !prompt) {
      toast.error("Please provide an input URL or prompt");
      return;
    }

    const result = await executeTool({
      toolId,
      prompt,
      language,
      targetMarket,
      inputData: inputUrl ? { imageUrl: inputUrl, videoUrl: inputUrl } : undefined,
    });

    if (result.success && result.outputUrl) {
      setOutputUrl(result.outputUrl);
      toast.success("Tool executed successfully!");
    }
  };

  const toolCategories = [
    {
      id: "tools",
      name: "Tools",
      icon: Wand2,
      items: tools,
      description: "Apply effects and transformations"
    },
    {
      id: "video",
      name: "Video Models",
      icon: Video,
      items: videoModels,
      description: "Generate videos with AI"
    },
    {
      id: "image",
      name: "Image Models",
      icon: Image,
      items: imageModels,
      description: "Generate images with AI"
    },
    {
      id: "actor",
      name: "Talking Actors",
      icon: Users,
      items: talkingActorModels,
      description: "Create talking avatar videos"
    },
    {
      id: "presets",
      name: "Presets",
      icon: Settings2,
      items: presets,
      description: "Pre-configured workflows"
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-primary-foreground" />
            </div>
            AI Tools
          </h1>
          <p className="text-muted-foreground mt-1">
            Apply AI tools to your existing assets - upscale, enhance, add captions, and more
          </p>
        </div>
      </div>

      {/* Audience Targeting */}
      <Card className="bg-gradient-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Audience Targeting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Target Market</Label>
              <Select value={targetMarket} onValueChange={setTargetMarket}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GCC">GCC</SelectItem>
                  <SelectItem value="EUROPE">Europe</SelectItem>
                  <SelectItem value="LATAM">LATAM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tool Selection */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="tools" className="w-full">
            <TabsList className="grid grid-cols-5 bg-muted">
              {toolCategories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                  <cat.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{cat.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {toolCategories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-4">
                <Card className="bg-gradient-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <category.icon className="w-5 h-5 text-primary" />
                      {category.name}
                    </CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.items.map((tool) => (
                        <div
                          key={tool.id}
                          onClick={() => setSelectedTool(tool.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedTool === tool.id
                              ? "bg-primary/10 border-primary"
                              : "bg-muted/30 border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-foreground">{tool.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {tool.pricingTier}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {tool.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tool.inputTypes.map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                          
                          {/* Progress indicator */}
                          {executionProgress[tool.id] !== undefined && (
                            <div className="mt-3">
                              <Progress value={executionProgress[tool.id]} className="h-1" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {executionProgress[tool.id]}% complete
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Input/Output Panel */}
        <div className="space-y-4">
          {/* Input Section */}
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Asset URL</Label>
                <Input
                  placeholder="https://example.com/video.mp4"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="bg-muted/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Prompt (Optional)</Label>
                <Textarea
                  placeholder="Describe what you want..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-muted/50 min-h-[100px]"
                />
              </div>

              <Button
                onClick={() => selectedTool && handleExecuteTool(selectedTool)}
                disabled={isExecuting || !selectedTool}
                className="w-full bg-gradient-primary text-primary-foreground"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Execute Tool
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Output
              </CardTitle>
            </CardHeader>
            <CardContent>
              {outputUrl ? (
                <div className="space-y-3">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    {outputUrl.includes('video') ? (
                      <video src={outputUrl} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={outputUrl} alt="Output" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Play className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(outputUrl, '_blank')}
                    >
                      <ArrowUpCircle className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                  <div className="text-center text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Output will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
