import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Settings2, Image as ImageIcon, Video, DollarSign } from "lucide-react";

export interface ImageOutputSettings {
  quality: 'draft' | 'standard' | 'high';
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:3';
  resolution: 'auto' | '512' | '1024' | '2048';
  numOutputs: number;
}

export interface VideoOutputSettings {
  aspectRatio: '1:1' | '9:16' | '16:9';
  duration: number;
  fps: 'auto' | '24' | '30' | '60';
  qualityTier: 'budget' | 'balanced' | 'premium';
}

interface OutputControlsPanelProps {
  type: 'image' | 'video' | 'tool';
  imageSettings?: ImageOutputSettings;
  videoSettings?: VideoOutputSettings;
  onImageSettingsChange?: (settings: ImageOutputSettings) => void;
  onVideoSettingsChange?: (settings: VideoOutputSettings) => void;
  estimatedCost?: number;
}

export function OutputControlsPanel({
  type,
  imageSettings,
  videoSettings,
  onImageSettingsChange,
  onVideoSettingsChange,
  estimatedCost,
}: OutputControlsPanelProps) {
  const qualityTierCosts: Record<string, number> = {
    draft: 0.01,
    standard: 0.03,
    high: 0.08,
    budget: 0.05,
    balanced: 0.12,
    premium: 0.25,
  };

  const getQualityTierColor = (tier: string) => {
    switch (tier) {
      case 'draft':
      case 'budget':
        return 'text-green-500';
      case 'standard':
      case 'balanced':
        return 'text-yellow-500';
      case 'high':
      case 'premium':
        return 'text-orange-500';
      default:
        return 'text-muted-foreground';
    }
  };

  if (type === 'tool') {
    return null; // Tools don't have output settings
  }

  return (
    <Card className="bg-muted/30 border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            Output Settings
          </span>
          {type === 'image' ? (
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Video className="w-4 h-4 text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {type === 'image' && imageSettings && onImageSettingsChange && (
          <>
            {/* Quality */}
            <div className="space-y-1.5">
              <Label className="text-xs">Quality</Label>
              <Select 
                value={imageSettings.quality}
                onValueChange={(v) => onImageSettingsChange({ ...imageSettings, quality: v as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <span className="flex items-center gap-2">
                      Draft <Badge variant="outline" className="text-xs text-green-500">~$0.01</Badge>
                    </span>
                  </SelectItem>
                  <SelectItem value="standard">
                    <span className="flex items-center gap-2">
                      Standard <Badge variant="outline" className="text-xs text-yellow-500">~$0.03</Badge>
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      High <Badge variant="outline" className="text-xs text-orange-500">~$0.08</Badge>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <Label className="text-xs">Aspect Ratio</Label>
              <Select 
                value={imageSettings.aspectRatio}
                onValueChange={(v) => onImageSettingsChange({ ...imageSettings, aspectRatio: v as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 Square</SelectItem>
                  <SelectItem value="9:16">9:16 Portrait</SelectItem>
                  <SelectItem value="16:9">16:9 Landscape</SelectItem>
                  <SelectItem value="4:3">4:3 Classic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resolution */}
            <div className="space-y-1.5">
              <Label className="text-xs">Resolution</Label>
              <Select 
                value={imageSettings.resolution}
                onValueChange={(v) => onImageSettingsChange({ ...imageSettings, resolution: v as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="512">512px</SelectItem>
                  <SelectItem value="1024">1024px</SelectItem>
                  <SelectItem value="2048">2048px</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Number of Outputs */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Outputs</Label>
                <span className="text-xs text-muted-foreground">{imageSettings.numOutputs}</span>
              </div>
              <Slider
                value={[imageSettings.numOutputs]}
                min={1}
                max={4}
                step={1}
                onValueChange={([v]) => onImageSettingsChange({ ...imageSettings, numOutputs: v })}
              />
            </div>
          </>
        )}

        {type === 'video' && videoSettings && onVideoSettingsChange && (
          <>
            {/* Quality Tier */}
            <div className="space-y-1.5">
              <Label className="text-xs">Quality Tier</Label>
              <Select 
                value={videoSettings.qualityTier}
                onValueChange={(v) => onVideoSettingsChange({ ...videoSettings, qualityTier: v as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">
                    <span className="flex items-center gap-2">
                      Budget <Badge variant="outline" className="text-xs text-green-500">Cheapest</Badge>
                    </span>
                  </SelectItem>
                  <SelectItem value="balanced">
                    <span className="flex items-center gap-2">
                      Balanced <Badge variant="outline" className="text-xs text-yellow-500">Recommended</Badge>
                    </span>
                  </SelectItem>
                  <SelectItem value="premium">
                    <span className="flex items-center gap-2">
                      Premium <Badge variant="outline" className="text-xs text-orange-500">Best Quality</Badge>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <Label className="text-xs">Aspect Ratio</Label>
              <Select 
                value={videoSettings.aspectRatio}
                onValueChange={(v) => onVideoSettingsChange({ ...videoSettings, aspectRatio: v as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 Square</SelectItem>
                  <SelectItem value="9:16">9:16 Vertical</SelectItem>
                  <SelectItem value="16:9">16:9 Horizontal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Duration</Label>
                <span className="text-xs text-muted-foreground">{videoSettings.duration}s</span>
              </div>
              <Slider
                value={[videoSettings.duration]}
                min={1}
                max={30}
                step={1}
                onValueChange={([v]) => onVideoSettingsChange({ ...videoSettings, duration: v })}
              />
            </div>

            {/* FPS */}
            <div className="space-y-1.5">
              <Label className="text-xs">FPS</Label>
              <Select 
                value={videoSettings.fps}
                onValueChange={(v) => onVideoSettingsChange({ ...videoSettings, fps: v as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="24">24 fps (Cinematic)</SelectItem>
                  <SelectItem value="30">30 fps (Standard)</SelectItem>
                  <SelectItem value="60">60 fps (Smooth)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Estimated Cost */}
        {estimatedCost !== undefined && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              Estimated Cost
            </span>
            <span className={`text-sm font-semibold ${getQualityTierColor(
              type === 'image' ? imageSettings?.quality || '' : videoSettings?.qualityTier || ''
            )}`}>
              ~${estimatedCost.toFixed(2)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
