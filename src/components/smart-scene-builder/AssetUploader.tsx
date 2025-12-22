// Asset Uploader - Upload product images, videos, B-roll (Step 1: Visual Context)

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Film,
  X,
  Plus,
  Loader2,
  Link,
  Sparkles,
  Info,
} from 'lucide-react';
import { VisualAsset } from '@/lib/smart-scene-builder/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssetUploaderProps {
  assets: VisualAsset[];
  onAddAsset: (asset: VisualAsset) => void;
  onRemoveAsset: (assetId: string) => void;
  onGenerateScenes: () => void;
}

export function AssetUploader({
  assets,
  onAddAsset,
  onRemoveAsset,
  onGenerateScenes,
}: AssetUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isImage) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }
      
      try {
        // Upload to Supabase storage
        const filename = `${Date.now()}-${file.name}`;
        const bucket = isVideo ? 'videos' : 'custom-scenes';
        
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filename, file);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filename);
        
        const asset: VisualAsset = {
          id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: isVideo ? 'video' : 'image',
          url: publicUrl,
          filename: file.name,
        };
        
        onAddAsset(asset);
        toast.success(`Uploaded: ${file.name}`);
      } catch (err: any) {
        toast.error(`Failed to upload ${file.name}`);
        console.error(err);
      }
    }
    
    setIsUploading(false);
  }, [onAddAsset]);

  const handleUrlAdd = useCallback(() => {
    if (!urlInput.trim()) return;
    
    const isVideo = urlInput.match(/\.(mp4|webm|mov)(\?|$)/i);
    
    const asset: VisualAsset = {
      id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: isVideo ? 'video' : 'image',
      url: urlInput.trim(),
      filename: urlInput.split('/').pop() || 'External asset',
    };
    
    onAddAsset(asset);
    setUrlInput('');
    setShowUrlInput(false);
    toast.success('Asset added from URL');
  }, [urlInput, onAddAsset]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Visual Assets</h4>
          <Badge variant="secondary" className="text-xs">
            {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
          </Badge>
        </div>
        
        {assets.length > 0 && (
          <Button
            size="sm"
            onClick={onGenerateScenes}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate Scenes from Assets
          </Button>
        )}
      </div>
      
      {/* Helper text */}
      <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-muted/50">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <strong>Optional, but improves scene quality and relevance.</strong> Upload product images, 
          existing videos, or B-roll footage. AI will analyze visuals and use them as anchors for scene construction.
        </p>
      </div>
      
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-4 mb-3">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
              <Video className="w-6 h-6 text-muted-foreground" />
              <Film className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Drag & drop product images, videos, or B-roll
            </p>
            <div className="flex items-center justify-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Browse Files
                  </span>
                </Button>
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUrlInput(!showUrlInput)}
              >
                <Link className="w-4 h-4 mr-2" />
                Add from URL
              </Button>
            </div>
          </>
        )}
      </div>
      
      {/* URL Input */}
      {showUrlInput && (
        <div className="flex gap-2 mt-3">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste image or video URL..."
            onKeyDown={(e) => e.key === 'Enter' && handleUrlAdd()}
          />
          <Button onClick={handleUrlAdd}>Add</Button>
        </div>
      )}
      
      {/* Asset Preview */}
      {assets.length > 0 && (
        <ScrollArea className="mt-4">
          <div className="flex gap-3 pb-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden group border border-border"
              >
                {asset.type === 'video' ? (
                  <video
                    src={asset.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Type badge */}
                <Badge 
                  variant="secondary" 
                  className="absolute bottom-1 left-1 text-xs px-1"
                >
                  {asset.type === 'video' ? (
                    <Video className="w-3 h-3" />
                  ) : (
                    <ImageIcon className="w-3 h-3" />
                  )}
                </Badge>
                
                {/* Remove button */}
                <button
                  onClick={() => onRemoveAsset(asset.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {/* Add more button */}
            <label className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <Plus className="w-6 h-6 text-muted-foreground" />
            </label>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </Card>
  );
}
