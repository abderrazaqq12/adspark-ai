// Product Data Input for Scene Builder
// Optional fields that auto-populate from product input if available

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, ChevronDown, ChevronUp, Sparkles, Link2 } from 'lucide-react';
import { ProductData } from '@/lib/smart-scene-builder/types';

interface ProductDataInputProps {
  productData?: Partial<ProductData>;
  onProductDataChange: (data: ProductData) => void;
  isFromProductInput?: boolean;
}

const PRODUCT_CATEGORIES = [
  { id: 'electronics', label: 'Electronics & Gadgets' },
  { id: 'beauty', label: 'Beauty & Skincare' },
  { id: 'fashion', label: 'Fashion & Apparel' },
  { id: 'fitness', label: 'Fitness & Health' },
  { id: 'home', label: 'Home & Garden' },
  { id: 'food', label: 'Food & Beverage' },
  { id: 'software', label: 'Software & SaaS' },
  { id: 'services', label: 'Services' },
  { id: 'education', label: 'Education & Courses' },
  { id: 'other', label: 'Other' },
];

export function ProductDataInput({ productData, onProductDataChange, isFromProductInput = false }: ProductDataInputProps) {
  const [isExpanded, setIsExpanded] = useState(!isFromProductInput);
  const [localData, setLocalData] = useState<ProductData>({
    name: productData?.name || '',
    description: productData?.description || '',
    imageUrl: productData?.imageUrl || '',
    category: productData?.category || '',
    benefits: productData?.benefits || [],
    targetAudience: productData?.targetAudience || '',
  });
  const [benefitsText, setBenefitsText] = useState(localData.benefits?.join('\n') || '');

  // Update local state when external productData changes
  useEffect(() => {
    if (productData) {
      setLocalData(prev => ({
        ...prev,
        name: productData.name || prev.name,
        description: productData.description || prev.description,
        imageUrl: productData.imageUrl || prev.imageUrl,
        category: productData.category || prev.category,
        benefits: productData.benefits || prev.benefits,
        targetAudience: productData.targetAudience || prev.targetAudience,
      }));
      if (productData.benefits?.length) {
        setBenefitsText(productData.benefits.join('\n'));
      }
    }
  }, [productData]);

  // Notify parent of changes
  useEffect(() => {
    onProductDataChange(localData);
  }, [localData, onProductDataChange]);

  const handleBenefitsChange = (text: string) => {
    setBenefitsText(text);
    const benefits = text.split('\n').filter(b => b.trim());
    setLocalData(prev => ({ ...prev, benefits }));
  };

  const hasData = localData.name || localData.description || localData.category;

  return (
    <Card className="border-border">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Product Context</span>
              {isFromProductInput && (
                <Badge variant="secondary" className="text-xs">
                  <Link2 className="w-3 h-3 mr-1" />
                  Auto-filled
                </Badge>
              )}
              {hasData && !isFromProductInput && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                  Configured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {hasData ? 'Edit' : 'Add'} product info for better AI recommendations
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {/* AI Context Banner */}
            <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Product data helps AI recommend better templates, scene structures, and visual styles for your videos.
              </p>
            </div>

            {/* Product Name & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="product-name" className="text-xs">Product Name</Label>
                <Input
                  id="product-name"
                  value={localData.name}
                  onChange={e => setLocalData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Smart Water Bottle"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-category" className="text-xs">Category</Label>
                <Select
                  value={localData.category}
                  onValueChange={value => setLocalData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="product-category" className="h-9">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="product-description" className="text-xs">Description</Label>
              <Textarea
                id="product-description"
                value={localData.description}
                onChange={e => setLocalData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your product and its main selling points..."
                className="min-h-[60px] resize-none"
              />
            </div>

            {/* Benefits & Target Audience */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="product-benefits" className="text-xs">Key Benefits (one per line)</Label>
                <Textarea
                  id="product-benefits"
                  value={benefitsText}
                  onChange={e => handleBenefitsChange(e.target.value)}
                  placeholder="Save time&#10;Easy to use&#10;Affordable"
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="target-audience" className="text-xs">Target Audience</Label>
                <Textarea
                  id="target-audience"
                  value={localData.targetAudience}
                  onChange={e => setLocalData(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="e.g., Health-conscious millennials who want to stay hydrated..."
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <Label htmlFor="product-image" className="text-xs">Product Image URL (optional)</Label>
              <Input
                id="product-image"
                value={localData.imageUrl}
                onChange={e => setLocalData(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="h-9"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
