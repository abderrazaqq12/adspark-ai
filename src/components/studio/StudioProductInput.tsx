import { useState } from 'react';
import { Upload, Link2, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface StudioProductInputProps {
  onNext: () => void;
}

export const StudioProductInput = ({ onNext }: StudioProductInputProps) => {
  const [productUrl, setProductUrl] = useState('');
  const [description, setDescription] = useState('');
  const [mediaLinks, setMediaLinks] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!productUrl && !description) {
      toast({
        title: "Input Required",
        description: "Please provide either a product URL or description",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Product Submitted",
      description: "Your product has been saved. Proceeding to next layer.",
    });

    onNext();
  };

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
            <Button onClick={handleSubmit} className="gap-2">
              Save & Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
