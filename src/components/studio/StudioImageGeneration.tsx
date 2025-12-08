import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudioImageGenerationProps {
  onNext: () => void;
}

interface GeneratedImage {
  id: string;
  url: string;
  type: string;
  prompt: string;
  status: 'generating' | 'completed' | 'failed';
}

const imageTypes = [
  { id: 'product', name: 'Product Shots', description: 'Clean product images on white background' },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Product in real-life context' },
  { id: 'before-after', name: 'Before/After', description: 'Transformation comparison images' },
  { id: 'mockup', name: 'Mockups', description: 'Product packaging and display mockups' },
  { id: 'ugc', name: 'UGC Style', description: 'User-generated content style images' },
  { id: 'thumbnail', name: 'Thumbnails', description: 'Eye-catching video thumbnails' },
];

export const StudioImageGeneration = ({ onNext }: StudioImageGenerationProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageEngine, setImageEngine] = useState('nano-banana');
  const [imageCount, setImageCount] = useState('3');
  const [resolution, setResolution] = useState('1024x1024');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['product', 'lifestyle', 'thumbnail']);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [productInfo, setProductInfo] = useState({ name: '', description: '' });
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    loadProductInfo();
  }, []);

  const loadProductInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings?.preferences) {
        const prefs = settings.preferences as Record<string, string>;
        setProductInfo({
          name: prefs.studio_product_name || '',
          description: prefs.studio_description || ''
        });
      }
    } catch (error) {
      console.error('Error loading product info:', error);
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

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Generate images for each selected type
      const newImages: GeneratedImage[] = [];
      const count = Math.ceil(parseInt(imageCount) / selectedTypes.length);

      const totalImages = parseInt(imageCount);
      const imagesPerType = Math.max(1, Math.ceil(totalImages / selectedTypes.length));

      for (const type of selectedTypes) {
        for (let i = 0; i < imagesPerType && newImages.length < totalImages; i++) {
          const typeInfo = imageTypes.find(t => t.id === type);
          const basePrompt = customPrompt 
            ? `${customPrompt}. Style: ${typeInfo?.description}` 
            : `${typeInfo?.description} for ${productInfo.name}. ${productInfo.description}`;
          
          // Call AI image generation
          const response = await supabase.functions.invoke('ai-image-generator', {
            body: {
              prompt: basePrompt,
              imageType: type,
              resolution,
              engine: imageEngine,
              productName: productInfo.name,
              productDescription: productInfo.description,
            }
          });

          const imageUrl = response.data?.imageUrl || response.data?.images?.[0]?.url || response.data?.url;

          newImages.push({
            id: `img-${Date.now()}-${i}-${type}`,
            url: imageUrl || '',
            type,
            prompt: basePrompt,
            status: response.error || !imageUrl ? 'failed' : 'completed',
          });
        }
      }

      setImages(newImages);
      toast({
        title: "Images Generated",
        description: `${newImages.length} images created successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate images",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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
        }
      });

      setImages(prev => prev.map(img => 
        img.id === id 
          ? { ...img, url: response.data?.imageUrl || img.url, status: 'completed' as const } 
          : img
      ));
    } catch (error) {
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, status: 'failed' as const } : img
      ));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Image Generation</h2>
          <p className="text-muted-foreground text-sm mt-1">Generate product images, mockups, and thumbnails</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Step 3</Badge>
      </div>

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
              Generate
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

      {/* Generated Images */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Generated Images</h3>
          <Badge variant="secondary">{images.length} images</Badge>
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
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <img 
                      src={image.url} 
                      alt={image.type}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
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
                    onClick={() => window.open(image.url, '_blank')}
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