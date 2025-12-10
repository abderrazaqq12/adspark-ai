import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowRight, 
  Loader2, 
  Image as ImageIcon, 
  Sparkles,
  RefreshCw,
  Download,
  Trash2,
  AlertCircle,
  Webhook
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageGenerationProgress } from '@/components/ImageGenerationProgress';

interface StudioImageGenerationProps {
  onNext: () => void;
  projectId?: string | null;
}

interface GeneratedImage {
  id: string;
  url: string;
  type: string;
  prompt: string;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}

const imageTypes = [
  { id: 'product', name: 'Product Shots', description: 'Clean product images on white background' },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Product in real-life context' },
  { id: 'before-after', name: 'Before/After', description: 'Transformation comparison images' },
  { id: 'mockup', name: 'Mockups', description: 'Product packaging and display mockups' },
  { id: 'ugc', name: 'UGC Style', description: 'User-generated content style images' },
  { id: 'thumbnail', name: 'Thumbnails', description: 'Eye-catching video thumbnails' },
];

export const StudioImageGeneration = ({ onNext, projectId: propProjectId }: StudioImageGenerationProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageEngine, setImageEngine] = useState('nano-banana');
  const [imageCount, setImageCount] = useState('3');
  const [resolution, setResolution] = useState('1024x1024');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['product', 'lifestyle', 'thumbnail']);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [productInfo, setProductInfo] = useState({ name: '', description: '' });
  const [customPrompt, setCustomPrompt] = useState('');
  const [projectId, setProjectId] = useState<string | null>(propProjectId || null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | undefined>();
  const generatingCountRef = useRef({ completed: 0, failed: 0, total: 0 });
  
  // n8n Backend Mode settings
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [useN8nBackend, setUseN8nBackend] = useState(false);

  useEffect(() => {
    loadProductInfo();
  }, []);

  // Reload images when projectId changes
  useEffect(() => {
    if (propProjectId) {
      setProjectId(propProjectId);
      // Reload images for the new project
      loadExistingImages(propProjectId);
    }
  }, [propProjectId]);

  const loadExistingImages = async (pid: string) => {
    try {
      const { data: existingImages, error: imgError } = await supabase
        .from('generated_images')
        .select('*')
        .eq('project_id', pid)
        .order('created_at', { ascending: false });

      if (imgError) {
        console.error('Error loading existing images:', imgError);
        return;
      }

      if (existingImages && existingImages.length > 0) {
        setImages(existingImages.map(img => ({
          id: img.id,
          url: img.image_url || '',
          type: img.image_type,
          prompt: img.prompt || '',
          status: img.status === 'completed' ? 'completed' : img.status === 'failed' ? 'failed' : 'generating',
        })));
      }
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const loadProductInfo = async () => {
    setIsLoadingProject(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences, use_n8n_backend')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        // Load n8n Backend Mode settings
        setUseN8nBackend(settings.use_n8n_backend || false);
        
        const prefs = settings.preferences as Record<string, any>;
        if (prefs) {
          setProductInfo({
            name: prefs.studio_product_name || '',
            description: prefs.studio_description || ''
          });
          
          // Load webhook URL from per-stage webhooks
          const stageWebhooks = prefs.stage_webhooks || {};
          const imageGenWebhook = stageWebhooks.image_generation;
          if (imageGenWebhook?.webhook_url) {
            setN8nWebhookUrl(imageGenWebhook.webhook_url);
          }
        }
      }

      // Load project if not provided via props
      if (!propProjectId) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (projects && projects.length > 0) {
          setProjectId(projects[0].id);
        }
      }

      // Load existing generated images for this project
      const currentProjectId = projectId || propProjectId;
      if (currentProjectId) {
        const { data: existingImages, error: imgError } = await supabase
          .from('generated_images')
          .select('*')
          .eq('project_id', currentProjectId)
          .order('created_at', { ascending: false });

        if (imgError) {
          console.error('Error loading existing images:', imgError);
        } else if (existingImages && existingImages.length > 0) {
          setImages(existingImages.map(img => ({
            id: img.id,
            url: img.image_url || '',
            type: img.image_type,
            prompt: img.prompt || '',
            status: img.status === 'completed' ? 'completed' : img.status === 'failed' ? 'failed' : 'generating',
          })));
        }
      }
    } catch (error) {
      console.error('Error loading product info:', error);
    } finally {
      setIsLoadingProject(false);
    }
  };

  const toggleType = (id: string) => {
    setSelectedTypes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const generateImages = async () => {
    if (selectedTypes.length === 0) {
      toast({
        title: "Select Image Types",
        description: "Please select at least one image type to generate",
        variant: "destructive",
      });
      return;
    }

    if (!productInfo.name) {
      toast({
        title: "Product Name Required",
        description: "Please enter product info in Step 1 first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationStartTime(Date.now());
    generatingCountRef.current = { completed: 0, failed: 0, total: 0 };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const newImages: GeneratedImage[] = [];
      const totalImages = parseInt(imageCount);
      const imagesPerType = Math.max(1, Math.ceil(totalImages / selectedTypes.length));

      for (const type of selectedTypes) {
        for (let i = 0; i < imagesPerType && newImages.length < totalImages; i++) {
          const typeInfo = imageTypes.find(t => t.id === type);
          const basePrompt = customPrompt 
            ? `${customPrompt}. Style: ${typeInfo?.description}` 
            : `${typeInfo?.description} for ${productInfo.name}. ${productInfo.description}`;

          const tempId = `img-${Date.now()}-${i}-${type}`;
          
          // Add placeholder while generating
          newImages.push({
            id: tempId,
            url: '',
            type,
            prompt: basePrompt,
            status: 'generating',
          });
        }
      }

      // Update total for progress tracking
      generatingCountRef.current.total = newImages.length;

      // Show generating state
      setImages(prev => [...newImages, ...prev]);

      // Generate images one by one
      for (let idx = 0; idx < newImages.length; idx++) {
        const img = newImages[idx];
        try {
          let imageUrl = '';
          
          // Use n8n webhook if Backend Mode is enabled
          if (useN8nBackend && n8nWebhookUrl) {
            console.log('Calling Image Generation webhook:', n8nWebhookUrl);
            const webhookResponse = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'generate_image',
                prompt: img.prompt,
                imageType: img.type,
                resolution,
                engine: imageEngine,
                productName: productInfo.name,
                productDescription: productInfo.description,
                projectId: projectId,
                userId: session.user.id,
                timestamp: new Date().toISOString(),
              }),
            });

            if (!webhookResponse.ok) {
              throw new Error(`Webhook error: ${webhookResponse.status}`);
            }

            const webhookData = await webhookResponse.json();
            imageUrl = webhookData?.imageUrl || webhookData?.url || webhookData?.images?.[0]?.url || '';
          } else {
            // Use Supabase function
            const response = await supabase.functions.invoke('ai-image-generator', {
              body: {
                prompt: img.prompt,
                imageType: img.type,
                resolution,
                engine: imageEngine,
                productName: productInfo.name,
                productDescription: productInfo.description,
                projectId: projectId,
              }
            });

            imageUrl = response.data?.imageUrl || response.data?.images?.[0]?.url || response.data?.url || '';

            if (response.error) {
              throw new Error(response.error.message || 'Failed to generate');
            }
          }

          if (!imageUrl) {
            generatingCountRef.current.failed++;
            setImages(prev => prev.map(p => 
              p.id === img.id 
                ? { ...p, status: 'failed' as const, error: 'No image URL returned' }
                : p
            ));
          } else {
            generatingCountRef.current.completed++;
            setImages(prev => prev.map(p => 
              p.id === img.id 
                ? { ...p, url: imageUrl, status: 'completed' as const }
                : p
            ));
          }
        } catch (genError: any) {
          console.error(`Error generating image ${idx}:`, genError);
          generatingCountRef.current.failed++;
          setImages(prev => prev.map(p => 
            p.id === img.id 
              ? { ...p, status: 'failed' as const, error: genError.message }
              : p
          ));
        }
      }

      const successCount = generatingCountRef.current.completed;
      toast({
        title: "Image Generation Complete",
        description: `Generated ${successCount} of ${newImages.length} images`,
      });
    } catch (error: any) {
      console.error('Error in image generation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate images",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationStartTime(undefined);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const regenerateImage = async (id: string) => {
    const image = images.find(img => img.id === id);
    if (!image) return;

    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, status: 'generating' as const } : img
    ));

    try {
      const response = await supabase.functions.invoke('ai-image-generator', {
        body: {
          prompt: image.prompt,
          imageType: image.type,
          resolution,
          engine: imageEngine,
          productName: productInfo.name,
          productDescription: productInfo.description,
          projectId: projectId,
        }
      });

      const imageUrl = response.data?.imageUrl || response.data?.images?.[0]?.url || '';

      setImages(prev => prev.map(img => 
        img.id === id 
          ? { ...img, url: imageUrl || img.url, status: imageUrl ? 'completed' as const : 'failed' as const } 
          : img
      ));

      if (imageUrl) {
        toast({ title: "Image regenerated successfully" });
      }
    } catch (error) {
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, status: 'failed' as const } : img
      ));
      toast({
        title: "Error",
        description: "Failed to regenerate image",
        variant: "destructive",
      });
    }
  };

  const downloadImage = async (url: string, type: string) => {
    try {
      // For base64 images, create a download link directly
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      window.open(url, '_blank');
    }
  };

  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Image Generation</h2>
          <p className="text-muted-foreground text-sm mt-1">Generate product images, mockups, and thumbnails</p>
        </div>
        <div className="flex items-center gap-2">
          {useN8nBackend && n8nWebhookUrl && (
            <div className="flex items-center gap-1 text-xs text-green-500">
              <Webhook className="w-3 h-3" />
              <span>Webhook</span>
            </div>
          )}
          <Badge variant="outline" className="text-primary border-primary">Step 3</Badge>
        </div>
      </div>

      {/* Product Info Display */}
      {productInfo.name && (
        <Card className="p-4 bg-primary/5 border-primary/30">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">{productInfo.name}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{productInfo.description || 'No description'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Generation Settings */}
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4">Generation Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Image Engine</Label>
            <Select value={imageEngine} onValueChange={setImageEngine}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nano-banana">NanoBanana (Gemini)</SelectItem>
                <SelectItem value="flux">Flux</SelectItem>
                <SelectItem value="chatgpt">ChatGPT Images</SelectItem>
                <SelectItem value="leonardo">Leonardo AI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Number of Images (1-10)</Label>
            <Select value={imageCount} onValueChange={setImageCount}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <SelectItem key={num} value={num.toString()}>{num} image{num > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Resolution</Label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="512x512">512x512</SelectItem>
                <SelectItem value="1024x1024">1024x1024</SelectItem>
                <SelectItem value="1024x1792">1024x1792 (Portrait)</SelectItem>
                <SelectItem value="1792x1024">1792x1024 (Landscape)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={generateImages} disabled={isGenerating} className="w-full gap-2">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {images.length > 0 ? 'Generate More' : 'Generate'}
            </Button>
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="mt-4 space-y-2">
          <Label>Custom Prompt (optional)</Label>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Add specific instructions for image generation, e.g., 'Show product being used by a woman in a modern kitchen with natural lighting'"
            className="min-h-[80px] bg-background"
          />
        </div>
      </Card>

      {/* Image Types */}
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4">Image Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {imageTypes.map((type) => (
            <div 
              key={type.id}
              onClick={() => toggleType(type.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedTypes.includes(type.id) 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={selectedTypes.includes(type.id)} />
                <div>
                  <p className="font-medium text-foreground text-sm">{type.name}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Progress Tracker */}
      {(isGenerating || images.some(i => i.status === 'generating')) && (
        <ImageGenerationProgress
          totalImages={images.filter(i => i.status === 'generating').length + images.filter(i => i.status === 'completed' || i.status === 'failed').length}
          completedImages={images.filter(i => i.status === 'completed').length}
          failedImages={images.filter(i => i.status === 'failed').length}
          isGenerating={isGenerating}
          startTime={generationStartTime}
        />
      )}

      {/* Generated Images */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Generated Images</h3>
          <Badge variant="secondary">{images.filter(i => i.status === 'completed').length} / {images.length} images</Badge>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No images generated yet</p>
            <p className="text-sm">Select image types and click "Generate"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group rounded-lg overflow-hidden border border-border">
                <div className="aspect-square bg-muted">
                  {image.status === 'generating' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Generating...</span>
                    </div>
                  ) : image.status === 'failed' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                      <span className="text-xs text-destructive text-center">{image.error || 'Generation failed'}</span>
                      <Button variant="outline" size="sm" onClick={() => regenerateImage(image.id)}>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  ) : image.url ? (
                    <img 
                      src={image.url} 
                      alt={image.type}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23333" width="100" height="100"/><text fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">Error</text></svg>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {image.status === 'completed' && image.url && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => regenerateImage(image.id)}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => downloadImage(image.url, image.type)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => removeImage(image.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="p-2 bg-muted/50">
                  <Badge variant="secondary" className="text-xs capitalize">{image.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Continue */}
      <div className="flex justify-end">
        <Button onClick={onNext} className="gap-2">
          Continue to Landing Page
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
