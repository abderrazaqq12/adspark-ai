/**
 * UGC Product Section Component
 * Product details input with image upload
 */

import React, { useState, useCallback } from 'react';
import { Upload, X, Sparkles, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { UGCProductConfig, UGCProductCategory } from '@/types/ugc';
import { detectCategoryFromFileName } from '@/services/ugc/productAnalysis';

interface ProductSectionProps {
    product: UGCProductConfig;
    onChange: (product: UGCProductConfig) => void;
}

const PRODUCT_CATEGORIES: { value: UGCProductCategory; label: string }[] = [
    { value: 'beauty', label: '💄 Beauty & Skincare' },
    { value: 'tech', label: '📱 Technology' },
    { value: 'fashion', label: '👗 Fashion & Apparel' },
    { value: 'food', label: '🍔 Food & Beverage' },
    { value: 'health', label: '💊 Health & Wellness' },
    { value: 'home', label: '🏠 Home & Living' },
    { value: 'general', label: '📦 General' },
];

export function ProductSection({ product, onChange }: ProductSectionProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleImageUpload = useCallback((files: FileList | null) => {
        if (!files) return;

        const newImages: File[] = [];
        const newPreviews: string[] = [];

        Array.from(files).slice(0, 3 - product.images.length).forEach(file => {
            if (file.type.startsWith('image/')) {
                newImages.push(file);
                newPreviews.push(URL.createObjectURL(file));

                // Auto-detect category from first image
                if (product.images.length === 0 && newImages.length === 1 && !product.category) {
                    const detectedCategory = detectCategoryFromFileName(file.name);
                    onChange({
                        ...product,
                        images: [...product.images, ...newImages],
                        imagePreviews: [...product.imagePreviews, ...newPreviews],
                        category: detectedCategory,
                    });
                    return;
                }
            }
        });

        if (newImages.length > 0) {
            onChange({
                ...product,
                images: [...product.images, ...newImages],
                imagePreviews: [...product.imagePreviews, ...newPreviews],
            });
        }
    }, [product, onChange]);

    const removeImage = (index: number) => {
        const newImages = [...product.images];
        const newPreviews = [...product.imagePreviews];

        // Revoke object URL to prevent memory leaks
        URL.revokeObjectURL(newPreviews[index]);

        newImages.splice(index, 1);
        newPreviews.splice(index, 1);

        onChange({
            ...product,
            images: newImages,
            imagePreviews: newPreviews,
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleImageUpload(e.dataTransfer.files);
    };

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Product Details
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Image Upload */}
                <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Product Images (1-3)</Label>

                    {/* Uploaded Images Grid */}
                    {product.imagePreviews.length > 0 && (
                        <div className="flex gap-2 mb-3">
                            {product.imagePreviews.map((preview, index) => (
                                <div key={index} className="relative group">
                                    <img
                                        src={preview}
                                        alt={`Product ${index + 1}`}
                                        className="w-20 h-20 object-cover rounded-lg border border-border"
                                    />
                                    <button
                                        onClick={() => removeImage(index)}
                                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Drop Zone */}
                    {product.images.length < 3 && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`
                border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
                            onClick={() => document.getElementById('ugc-product-upload')?.click()}
                        >
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Drop images here or <span className="text-primary">browse</span>
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                {3 - product.images.length} more image(s) allowed
                            </p>
                            <input
                                id="ugc-product-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => handleImageUpload(e.target.files)}
                            />
                        </div>
                    )}
                </div>

                {/* Product Name */}
                <div className="space-y-2">
                    <Label htmlFor="product-name" className="text-sm text-muted-foreground">
                        Product Name
                    </Label>
                    <Input
                        id="product-name"
                        placeholder="e.g., Premium Vitamin C Serum"
                        value={product.name}
                        onChange={(e) => onChange({ ...product, name: e.target.value })}
                        className="bg-background/50"
                    />
                </div>

                {/* Product Benefit */}
                <div className="space-y-2">
                    <Label htmlFor="product-benefit" className="text-sm text-muted-foreground">
                        Key Benefit / USP
                    </Label>
                    <Textarea
                        id="product-benefit"
                        placeholder="e.g., Brightens skin in just 7 days with natural ingredients"
                        value={product.benefit}
                        onChange={(e) => onChange({ ...product, benefit: e.target.value })}
                        className="bg-background/50 min-h-[80px] resize-none"
                    />
                </div>

                {/* Category */}
                <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Product Category</Label>
                    <Select
                        value={product.category || 'general'}
                        onValueChange={(value) => onChange({ ...product, category: value as UGCProductCategory })}
                    >
                        <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {PRODUCT_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Auto-detection hint */}
                {product.images.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                        <Sparkles className="w-3 h-3" />
                        <span>AI will analyze your images to enhance script generation</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
