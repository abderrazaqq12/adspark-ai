import { useState, useEffect } from 'react';
import { Upload, Link2, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudioProductInputProps {
  onNext: () => void;
}

export const StudioProductInput = ({ onNext }: StudioProductInputProps) => {
  const [productUrl, setProductUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [mediaLinks, setMediaLinks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load from user preferences
      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings?.preferences) {
        const prefs = settings.preferences as Record<string, string>;
        setProductUrl(prefs.studio_product_url || '');
        setProductName(prefs.studio_product_name || '');
        setDescription(prefs.studio_description || '');
        setMediaLinks(prefs.studio_media_links || '');
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!productName && !productUrl && !description) {
      toast({
        title: "Input Required",
        description: "Please provide product name, URL, or description",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current preferences
      const { data: currentSettings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPrefs = (currentSettings?.preferences as Record<string, unknown>) || {};

      // Save to user preferences for this session
      const { error } = await supabase
        .from('user_settings')
        .update({
          preferences: {
            ...currentPrefs,
            studio_product_url: productUrl,
            studio_product_name: productName,
            studio_description: description,
            studio_media_links: mediaLinks
          }
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Product Saved",
        description: "Your product details have been saved. Proceeding to next layer.",
      });

      onNext();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save product details",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Product Input</h2>
          <p className="text-muted-foreground text-sm mt-1">Add product details to start the automation workflow</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Layer 1</Badge>
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="space-y-5">
          {/* Product Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Product Name *
            </label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name"
              className="bg-background border-border"
            />
          </div>

          {/* Product URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Product URL
            </label>
            <Input
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://example.com/product"
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Enter the product page URL for automatic scraping
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Product Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product, its features, and target audience..."
              className="bg-background border-border min-h-[120px]"
            />
          </div>

          {/* Media Links */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Media Links (Optional)
            </label>
            <Textarea
              value={mediaLinks}
              onChange={(e) => setMediaLinks(e.target.value)}
              placeholder="Enter image/video URLs, one per line..."
              className="bg-background border-border min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Add direct links to product images or videos
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} className="gap-2" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
