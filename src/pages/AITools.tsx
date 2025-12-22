import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  Wand2, Video, Image, Upload, Loader2, Users, Zap, Settings2, X, FileVideo, FileImage, Layers
} from "lucide-react";
import { toast } from "sonner";
import { useExtendedAITools } from "@/hooks/useExtendedAITools";
import { useBatchProcessing } from "@/hooks/useBatchProcessing";
import { supabase } from "@/integrations/supabase/client";
import { AIToolsDebugPanel } from "@/components/ai-tools/AIToolsDebugPanel";
import { ExecutionStatusTracker } from "@/components/ai-tools/ExecutionStatusTracker";
import { OutputResultPanel } from "@/components/ai-tools/OutputResultPanel";
import { OutputControlsPanel, ImageOutputSettings, VideoOutputSettings } from "@/components/ai-tools/OutputControlsPanel";
import { ExecutionHistoryPanel } from "@/components/ai-tools/ExecutionHistoryPanel";
import { BatchQueuePanel } from "@/components/ai-tools/BatchQueuePanel";

export default function AITools() {
  const { 
    isExecuting, executionProgress, executeTool, getTools, getImageModels, getVideoModels,
    getTalkingActorModels, getPresets, currentDebug, executionTiming, executionHistory,
    lastOutputUrl, lastOutputType, lastSuccess, estimateCost, clearHistory, getTool, lastResults
  } = useExtendedAITools();

  const {
    queue, isProcessing: isBatchProcessing, currentIndex, 
    addToQueue, removeFromQueue, clearQueue, startBatch, pauseBatch
  } = useBatchProcessing();

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [targetMarket, setTargetMarket] = useState("GCC");
  const [language, setLanguage] = useState("ar");
  const [activeCategory, setActiveCategory] = useState("tools");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  
  const [imageSettings, setImageSettings] = useState<ImageOutputSettings>({
    quality: 'standard', aspectRatio: '1:1', resolution: 'auto', numOutputs: 1
  });
  const [videoSettings, setVideoSettings] = useState<VideoOutputSettings>({
    aspectRatio: '16:9', duration: 5, fps: 'auto', qualityTier: 'balanced'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const tools = getTools();
  const imageModels = getImageModels();
  const videoModels = getVideoModels();
  const talkingActorModels = getTalkingActorModels();
  const presets = getPresets();

  const getAcceptedFileTypes = () => {
    switch (activeCategory) {
      case "video": return "video/*";
      case "image": return "image/*";
      case "actor": return "image/*,audio/*";
      default: return "image/*,video/*";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (activeCategory === "video" && !file.type.startsWith("video/")) {
      toast.error("Please upload a video file"); return;
    }
    if (activeCategory === "image" && !file.type.startsWith("image/")) {
      toast.error("Please upload an image file"); return;
    }
    setUploadedFile(file);
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in"); setIsUploading(false); return; }
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/ai-tools/${Date.now()}.${fileExt}`;
      const bucket = file.type.startsWith("video/") ? "videos" : "custom-scenes";
      const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
      setUploadedFileUrl(publicUrl);
      setInputUrl(publicUrl);
      toast.success("File uploaded");
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setUploadedFileUrl(null);
    if (inputUrl === uploadedFileUrl) setInputUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle batch file selection
  const handleBatchFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    await addToQueue(Array.from(files));
    if (batchInputRef.current) batchInputRef.current.value = "";
  };

  // Start batch processing
  const handleStartBatch = () => {
    if (!selectedTool) {
      toast.error("Please select a tool first");
      return;
    }
    startBatch({
      toolId: selectedTool,
      prompt,
      language,
      targetMarket,
      imageSettings: activeCategory === 'image' ? imageSettings : undefined,
      videoSettings: activeCategory === 'video' ? videoSettings : undefined,
    });
  };

  const handleExecuteTool = async (toolId: string) => {
    if (!inputUrl && !prompt) { toast.error("Please provide input or prompt"); return; }
    await executeTool({
      toolId, prompt, language, targetMarket,
      inputData: inputUrl ? { imageUrl: inputUrl, videoUrl: inputUrl } : undefined,
      imageSettings: activeCategory === 'image' ? imageSettings : undefined,
      videoSettings: activeCategory === 'video' ? videoSettings : undefined,
    });
  };

  const currentEstimatedCost = selectedTool 
    ? estimateCost(selectedTool, activeCategory === 'image' ? imageSettings : undefined, activeCategory === 'video' ? videoSettings : undefined)
    : 0;

  const toolCategories = [
    { id: "tools", name: "Tools", icon: Wand2, items: tools, description: "Apply effects and transformations" },
    { id: "video", name: "Video Models", icon: Video, items: videoModels, description: "Generate videos with AI" },
    { id: "image", name: "Image Models", icon: Image, items: imageModels, description: "Generate images with AI" },
    { id: "actor", name: "Talking Actors", icon: Users, items: talkingActorModels, description: "Create talking avatar videos" },
    { id: "presets", name: "Presets", icon: Settings2, items: presets, description: "Pre-configured workflows" },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-primary-foreground" />
            </div>
            AI Tools
          </h1>
          <p className="text-muted-foreground mt-1">Apply AI tools to your assets - upscale, enhance, add captions, and more</p>
        </div>
      </div>

      <Card className="bg-gradient-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Audience Targeting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Target Market</Label>
              <Select value={targetMarket} onValueChange={setTargetMarket}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="tools" className="w-full" onValueChange={setActiveCategory}>
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
                    <CardTitle className="flex items-center gap-2"><category.icon className="w-5 h-5 text-primary" />{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.items.map((tool) => (
                        <div key={tool.id} onClick={() => setSelectedTool(tool.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedTool === tool.id ? "bg-primary/10 border-primary" : "bg-muted/30 border-border hover:border-primary/50"}`}>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-foreground">{tool.name}</h4>
                            <Badge variant="outline" className="text-xs">{tool.pricingTier}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tool.inputTypes.map((type) => (<Badge key={type} variant="secondary" className="text-xs">{type}</Badge>))}
                          </div>
                          {executionProgress[tool.id] !== undefined && (
                            <div className="mt-3">
                              <Progress value={executionProgress[tool.id]} className="h-1" />
                              <p className="text-xs text-muted-foreground mt-1">{executionProgress[tool.id]}% complete</p>
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

        <div className="space-y-4">
          <ExecutionStatusTracker timing={executionTiming} toolName={selectedTool ? getTool(selectedTool)?.name : undefined} />
          
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Input
                </span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="batch-mode" className="text-sm font-normal text-muted-foreground">
                    Batch Mode
                  </Label>
                  <Switch 
                    id="batch-mode" 
                    checked={batchMode} 
                    onCheckedChange={setBatchMode}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {batchMode ? (
                // Batch Mode UI
                <div className="space-y-3">
                  <input 
                    ref={batchInputRef} 
                    type="file" 
                    accept={getAcceptedFileTypes()} 
                    onChange={handleBatchFileSelect} 
                    multiple
                    className="hidden" 
                    id="batch-upload" 
                  />
                  <label 
                    htmlFor="batch-upload" 
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-primary/50 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors bg-primary/5"
                  >
                    <Layers className="w-10 h-10 text-primary mb-2" />
                    <span className="text-sm font-medium text-foreground">Drop multiple files here</span>
                    <span className="text-xs text-muted-foreground mt-1">or click to select files</span>
                  </label>
                  
                  <div className="space-y-2">
                    <Label>Prompt (applies to all files)</Label>
                    <Textarea 
                      placeholder="Describe the transformation to apply..." 
                      value={prompt} 
                      onChange={(e) => setPrompt(e.target.value)} 
                      className="bg-muted/50 min-h-[60px]" 
                    />
                  </div>
                </div>
              ) : (
                // Single Mode UI
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {activeCategory === "video" ? <><FileVideo className="w-4 h-4" /> Upload Video</> : activeCategory === "image" ? <><FileImage className="w-4 h-4" /> Upload Image</> : <><Upload className="w-4 h-4" /> Upload File</>}
                    </Label>
                    <input ref={fileInputRef} type="file" accept={getAcceptedFileTypes()} onChange={handleFileUpload} className="hidden" id="file-upload" />
                    {uploadedFile ? (
                      <div className="relative p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          {uploadedFile.type.startsWith("video/") ? <FileVideo className="w-8 h-8 text-primary" /> : <FileImage className="w-8 h-8 text-primary" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearUploadedFile}><X className="w-4 h-4" /></Button>
                        </div>
                        {isUploading && <Progress value={50} className="h-1 mt-2" />}
                      </div>
                    ) : (
                      <label htmlFor="file-upload" className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload</span>
                      </label>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Asset URL</Label>
                    <Input placeholder="https://example.com/video.mp4" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Prompt (Optional)</Label>
                    <Textarea placeholder="Describe what you want..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="bg-muted/50 min-h-[80px]" />
                  </div>
                  <Button onClick={() => selectedTool && handleExecuteTool(selectedTool)} disabled={isExecuting || !selectedTool} className="w-full bg-gradient-primary text-primary-foreground">
                    {isExecuting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Zap className="w-4 h-4 mr-2" />Execute Tool</>}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Batch Queue Panel */}
          {batchMode && (
            <BatchQueuePanel
              queue={queue}
              isProcessing={isBatchProcessing}
              currentIndex={currentIndex}
              onRemoveItem={removeFromQueue}
              onClearQueue={clearQueue}
              onStartBatch={handleStartBatch}
              onPauseBatch={pauseBatch}
              toolName={selectedTool ? getTool(selectedTool)?.name : undefined}
            />
          )}

          {(activeCategory === 'image' || activeCategory === 'video') && (
            <OutputControlsPanel 
              type={activeCategory as 'image' | 'video'} 
              imageSettings={imageSettings} 
              videoSettings={videoSettings}
              onImageSettingsChange={setImageSettings}
              onVideoSettingsChange={setVideoSettings}
              estimatedCost={currentEstimatedCost}
            />
          )}

          <OutputResultPanel 
            outputUrl={lastOutputUrl} 
            outputType={lastOutputType} 
            isSuccess={lastSuccess} 
            toolName={selectedTool ? getTool(selectedTool)?.name : undefined}
            assetId={selectedTool ? lastResults[selectedTool]?.assetId : undefined}
          />
          
          <AIToolsDebugPanel debug={currentDebug} selectedTool={selectedTool} estimatedCost={currentEstimatedCost} />
          
          <ExecutionHistoryPanel history={executionHistory} onClear={clearHistory} />
        </div>
      </div>
    </div>
  );
}
