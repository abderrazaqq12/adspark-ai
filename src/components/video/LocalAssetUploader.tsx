import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Video, 
  Image as ImageIcon, 
  Mic, 
  Film, 
  X, 
  Play,
  FileVideo,
  FileImage,
  FileAudio
} from 'lucide-react';
import { toast } from 'sonner';

export interface LocalAsset {
  id: string;
  file: File;
  type: 'video' | 'image' | 'voiceover' | 'broll';
  url: string;
  name: string;
  duration?: number;
  sceneIndex?: number; // Which scene this asset is attached to
}

interface LocalAssetUploaderProps {
  assets: LocalAsset[];
  onAssetsChange: (assets: LocalAsset[]) => void;
  scenesCount: number;
  compact?: boolean;
}

const ASSET_CONFIG = {
  video: { 
    icon: Video, 
    label: 'Videos', 
    accept: 'video/*', 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  image: { 
    icon: ImageIcon, 
    label: 'Images', 
    accept: 'image/*', 
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  voiceover: { 
    icon: Mic, 
    label: 'Voiceovers', 
    accept: 'audio/*', 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  broll: { 
    icon: Film, 
    label: 'B-Roll', 
    accept: 'video/*', 
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
};

export function LocalAssetUploader({ 
  assets, 
  onAssetsChange, 
  scenesCount,
  compact = false 
}: LocalAssetUploaderProps) {
  const [activeTab, setActiveTab] = useState<keyof typeof ASSET_CONFIG>('video');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newAssets: LocalAsset[] = [];
    
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      let duration: number | undefined;

      // Get duration for video/audio files
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        duration = await getMediaDuration(url, file.type.startsWith('video/') ? 'video' : 'audio');
      }

      newAssets.push({
        id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        type: activeTab,
        url,
        name: file.name,
        duration,
      });
    }

    onAssetsChange([...assets, ...newAssets]);
    toast.success(`Added ${newAssets.length} ${activeTab}(s)`);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getMediaDuration = (url: string, type: 'video' | 'audio'): Promise<number> => {
    return new Promise((resolve) => {
      const element = document.createElement(type);
      element.src = url;
      element.onloadedmetadata = () => {
        resolve(Math.round(element.duration));
      };
      element.onerror = () => resolve(0);
    });
  };

  const removeAsset = (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (asset) {
      URL.revokeObjectURL(asset.url);
    }
    onAssetsChange(assets.filter(a => a.id !== id));
  };

  const assignToScene = (assetId: string, sceneIndex: number | undefined) => {
    onAssetsChange(assets.map(a => 
      a.id === assetId ? { ...a, sceneIndex } : a
    ));
  };

  const filteredAssets = assets.filter(a => a.type === activeTab);

  if (compact) {
    return (
      <Card className="p-3 bg-card/50 border-border">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Local Assets ({assets.length})
          </Label>
          <div className="flex gap-1">
            {Object.entries(ASSET_CONFIG).map(([type, config]) => {
              const count = assets.filter(a => a.type === type).length;
              return (
                <Button
                  key={type}
                  variant={activeTab === type ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 gap-1"
                  onClick={() => setActiveTab(type as keyof typeof ASSET_CONFIG)}
                >
                  <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                  {count > 0 && <span className="text-xs">{count}</span>}
                </Button>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ASSET_CONFIG[activeTab].accept}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 flex-1"
          >
            <Upload className="w-4 h-4" />
            Upload {ASSET_CONFIG[activeTab].label}
          </Button>
        </div>

        {filteredAssets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {filteredAssets.slice(0, 5).map((asset) => (
              <Badge key={asset.id} variant="secondary" className="gap-1 text-xs">
                {asset.name.slice(0, 15)}...
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-destructive" 
                  onClick={() => removeAsset(asset.id)}
                />
              </Badge>
            ))}
            {filteredAssets.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{filteredAssets.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <Label className="text-base font-medium flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Local Asset Library
        </Label>
        <Badge variant="outline">{assets.length} assets</Badge>
      </div>

      {/* Asset Type Tabs */}
      <div className="flex gap-2 mb-4 p-1 bg-muted/50 rounded-lg">
        {Object.entries(ASSET_CONFIG).map(([type, config]) => {
          const count = assets.filter(a => a.type === type).length;
          const isActive = activeTab === type;
          
          return (
            <Button
              key={type}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 gap-2 ${isActive ? '' : 'hover:bg-muted'}`}
              onClick={() => setActiveTab(type as keyof typeof ASSET_CONFIG)}
            >
              <config.icon className={`w-4 h-4 ${isActive ? '' : config.color}`} />
              {config.label}
              {count > 0 && (
                <Badge variant={isActive ? 'secondary' : 'outline'} className="text-xs">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-lg p-4 mb-4 text-center cursor-pointer transition-colors
          ${ASSET_CONFIG[activeTab].bgColor} border-border hover:border-primary/50`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ASSET_CONFIG[activeTab].accept}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className={`w-8 h-8 mx-auto mb-2 ${ASSET_CONFIG[activeTab].color}`} />
        <p className="text-sm font-medium">Click to upload {ASSET_CONFIG[activeTab].label}</p>
        <p className="text-xs text-muted-foreground mt-1">
          or drag and drop files here
        </p>
      </div>

      {/* Asset List */}
      {filteredAssets.length > 0 && (
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {filteredAssets.map((asset) => {
              const config = ASSET_CONFIG[asset.type];
              const IconComponent = asset.type === 'video' ? FileVideo : 
                                   asset.type === 'image' ? FileImage : 
                                   asset.type === 'voiceover' ? FileAudio : Film;
              
              return (
                <div 
                  key={asset.id} 
                  className={`flex items-center gap-3 p-2 rounded-lg ${config.bgColor} border border-border`}
                >
                  {/* Thumbnail/Icon */}
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {asset.type === 'image' ? (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    ) : asset.type === 'video' || asset.type === 'broll' ? (
                      <video src={asset.url} className="w-full h-full object-cover" />
                    ) : (
                      <IconComponent className={`w-5 h-5 ${config.color}`} />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {asset.duration && <span>{asset.duration}s</span>}
                      {asset.sceneIndex !== undefined && (
                        <Badge variant="outline" className="text-[10px]">
                          Scene {asset.sceneIndex + 1}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {scenesCount > 0 && (
                      <select
                        value={asset.sceneIndex ?? ''}
                        onChange={(e) => assignToScene(asset.id, e.target.value ? parseInt(e.target.value) : undefined)}
                        className="text-xs bg-background border rounded px-1.5 py-1"
                      >
                        <option value="">Unassigned</option>
                        {Array.from({ length: scenesCount }, (_, i) => (
                          <option key={i} value={i}>Scene {i + 1}</option>
                        ))}
                      </select>
                    )}
                    {(asset.type === 'video' || asset.type === 'voiceover') && (
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 hover:text-destructive"
                      onClick={() => removeAsset(asset.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {filteredAssets.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          No {ASSET_CONFIG[activeTab].label.toLowerCase()} uploaded yet
        </p>
      )}
    </Card>
  );
}
