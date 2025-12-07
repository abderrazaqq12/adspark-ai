import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Loader2, 
  Video, 
  Sparkles,
  CheckCircle2,
  FolderOpen,
  Share2,
  Clock,
  Film,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ExportFormat {
  id: string;
  name: string;
  aspectRatio: string;
  resolution: string;
  platform: string;
}

const exportFormats: ExportFormat[] = [
  { id: 'tiktok', name: 'TikTok', aspectRatio: '9:16', resolution: '1080x1920', platform: 'TikTok' },
  { id: 'reels', name: 'Instagram Reels', aspectRatio: '9:16', resolution: '1080x1920', platform: 'Instagram' },
  { id: 'stories', name: 'Instagram Stories', aspectRatio: '9:16', resolution: '1080x1920', platform: 'Instagram' },
  { id: 'youtube-shorts', name: 'YouTube Shorts', aspectRatio: '9:16', resolution: '1080x1920', platform: 'YouTube' },
  { id: 'snapchat', name: 'Snapchat Ads', aspectRatio: '9:16', resolution: '1080x1920', platform: 'Snapchat' },
  { id: 'feed-square', name: 'Feed (Square)', aspectRatio: '1:1', resolution: '1080x1080', platform: 'Multi' },
  { id: 'youtube', name: 'YouTube', aspectRatio: '16:9', resolution: '1920x1080', platform: 'YouTube' },
  { id: 'facebook', name: 'Facebook Ads', aspectRatio: '16:9', resolution: '1920x1080', platform: 'Facebook' },
];

interface ExportedVideo {
  id: string;
  format: string;
  url: string;
  duration: number;
  size: string;
}

export const StudioExport = () => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['tiktok', 'reels']);
  const [variationsCount, setVariationsCount] = useState('10');
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [includeMusic, setIncludeMusic] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [exportedVideos, setExportedVideos] = useState<ExportedVideo[]>([]);

  const toggleFormat = (id: string) => {
    setSelectedFormats(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const startExport = async () => {
    if (selectedFormats.length === 0) {
      toast({
        title: "Select Formats",
        description: "Please select at least one export format",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportedVideos([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const totalVideos = selectedFormats.length * parseInt(variationsCount);
      
      // Simulate export progress
      for (let i = 0; i < totalVideos; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setExportProgress(((i + 1) / totalVideos) * 100);

        const format = exportFormats.find(f => f.id === selectedFormats[i % selectedFormats.length]);
        if (format) {
          setExportedVideos(prev => [...prev, {
            id: `video-${Date.now()}-${i}`,
            format: format.name,
            url: '#',
            duration: 15 + Math.floor(Math.random() * 15),
            size: `${(Math.random() * 10 + 5).toFixed(1)} MB`,
          }]);
        }
      }

      toast({
        title: "Export Complete",
        description: `${totalVideos} videos exported successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export videos",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadAll = () => {
    toast({
      title: "Download Started",
      description: `Downloading ${exportedVideos.length} videos...`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Export & Download</h2>
          <p className="text-muted-foreground text-sm mt-1">Export your videos in multiple formats and variations</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">Step 7</Badge>
      </div>

      {/* Export Settings */}
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4">Export Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Variations</Label>
            <Select value={variationsCount} onValueChange={setVariationsCount}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 variations</SelectItem>
                <SelectItem value="10">10 variations</SelectItem>
                <SelectItem value="25">25 variations</SelectItem>
                <SelectItem value="50">50 variations</SelectItem>
                <SelectItem value="100">100 variations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Options</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={includeSubtitles} onCheckedChange={(c) => setIncludeSubtitles(c as boolean)} id="subs" />
                <label htmlFor="subs" className="text-sm">Subtitles</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={includeMusic} onCheckedChange={(c) => setIncludeMusic(c as boolean)} id="music" />
                <label htmlFor="music" className="text-sm">Background Music</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={includeWatermark} onCheckedChange={(c) => setIncludeWatermark(c as boolean)} id="watermark" />
                <label htmlFor="watermark" className="text-sm">Watermark</label>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <Button onClick={startExport} disabled={isExporting || selectedFormats.length === 0} className="gap-2 flex-1">
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isExporting ? 'Exporting...' : `Export ${selectedFormats.length * parseInt(variationsCount)} Videos`}
            </Button>
            {exportedVideos.length > 0 && (
              <Button variant="outline" onClick={downloadAll} className="gap-2">
                <Download className="w-4 h-4" />
                Download All
              </Button>
            )}
          </div>
        </div>

        {isExporting && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Exporting...</span>
              <span className="font-medium">{Math.round(exportProgress)}%</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
          </div>
        )}
      </Card>

      {/* Export Formats */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Export Formats</h3>
          <Badge variant="secondary">{selectedFormats.length} selected</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {exportFormats.map((format) => (
            <div 
              key={format.id}
              onClick={() => toggleFormat(format.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedFormats.includes(format.id) 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={selectedFormats.includes(format.id)} />
                <div>
                  <p className="font-medium text-foreground text-sm">{format.name}</p>
                  <p className="text-xs text-muted-foreground">{format.aspectRatio} • {format.resolution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Exported Videos */}
      {exportedVideos.length > 0 && (
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Exported Videos</h3>
            <Badge className="bg-green-500/20 text-green-500">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {exportedVideos.length} videos ready
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {exportedVideos.slice(0, 20).map((video) => (
              <div key={video.id} className="rounded-lg border border-border overflow-hidden group">
                <div className="aspect-[9/16] bg-muted flex items-center justify-center">
                  <Video className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="p-2 bg-muted/50">
                  <p className="text-xs font-medium truncate">{video.format}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {video.duration}s
                    </span>
                    <span>{video.size}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {exportedVideos.length > 20 && (
            <div className="text-center mt-4">
              <Button variant="outline" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                View All {exportedVideos.length} Videos
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Summary */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">🎉 Pipeline Complete!</h3>
            <p className="text-muted-foreground text-sm">
              Your video ads are ready. Export them to start your campaigns.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Open in Library
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};