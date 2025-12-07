import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Image as ImageIcon, FileText, Mic, Video, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const StudioAssetBuilder = () => {
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const handleRegenerate = (assetType: string) => {
    setRegenerating(assetType);
    setTimeout(() => {
      setRegenerating(null);
      toast({
        title: "Regeneration Started",
        description: `${assetType} is being regenerated via webhook`,
      });
    }, 1000);
  };

  const handleDownloadAll = () => {
    toast({
      title: "Download Started",
      description: "All assets are being prepared for download",
    });
  };

  // Placeholder data
  const images = [1, 2, 3, 4, 5, 6];
  const scripts = [
    { id: 1, title: "Hook Variant A", preview: "Stop scrolling! This changes everything..." },
    { id: 2, title: "Hook Variant B", preview: "You won't believe what happened when..." },
    { id: 3, title: "Hook Variant C", preview: "The secret nobody talks about..." },
  ];
  const voiceovers = [
    { id: 1, title: "Sarah - Professional", duration: "0:32" },
    { id: 2, title: "Mike - Casual", duration: "0:28" },
    { id: 3, title: "Emma - Energetic", duration: "0:30" },
  ];
  const videos = [
    { id: 1, title: "TikTok Version", ratio: "9:16", duration: "0:30" },
    { id: 2, title: "Instagram Reels", ratio: "9:16", duration: "0:30" },
    { id: 3, title: "YouTube Shorts", ratio: "9:16", duration: "0:30" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Asset Preview & Builder</h2>
          <p className="text-muted-foreground text-sm mt-1">Preview and manage your generated marketing assets</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-primary border-primary">Layer 12</Badge>
          <Button variant="outline" onClick={handleDownloadAll} className="gap-2">
            <Download className="w-4 h-4" />
            Download All
          </Button>
        </div>
      </div>

      <Tabs defaultValue="images" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="images" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <FileText className="w-4 h-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="voiceovers" className="gap-2">
            <Mic className="w-4 h-4" />
            Voiceovers
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2">
            <Video className="w-4 h-4" />
            Videos
          </TabsTrigger>
        </TabsList>

        {/* Images Tab */}
        <TabsContent value="images" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Product Images</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleRegenerate('images')}
                disabled={regenerating === 'images'}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${regenerating === 'images' ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {images.map((i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted flex items-center justify-center border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Video Scripts</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleRegenerate('scripts')}
                disabled={regenerating === 'scripts'}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${regenerating === 'scripts' ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <div className="space-y-3">
              {scripts.map((script) => (
                <div key={script.id} className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{script.title}</p>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{script.preview}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Voiceovers Tab */}
        <TabsContent value="voiceovers" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI Voiceovers</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleRegenerate('voiceovers')}
                disabled={regenerating === 'voiceovers'}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${regenerating === 'voiceovers' ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <div className="space-y-3">
              {voiceovers.map((vo) => (
                <div key={vo.id} className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Mic className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{vo.title}</p>
                        <p className="text-xs text-muted-foreground">Duration: {vo.duration}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Play
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Generated Videos</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleRegenerate('videos')}
                disabled={regenerating === 'videos'}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${regenerating === 'videos' ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {videos.map((video) => (
                <div key={video.id} className="rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors overflow-hidden">
                  <div className="aspect-[9/16] bg-muted flex items-center justify-center">
                    <Video className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-foreground text-sm">{video.title}</p>
                    <p className="text-xs text-muted-foreground">{video.ratio} • {video.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
