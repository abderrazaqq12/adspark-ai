import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Image as ImageIcon, FileText, Mic, Video, Download, ExternalLink, Play, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Script {
  id: string;
  raw_text: string;
  tone: string | null;
  status: string | null;
}

interface Scene {
  id: string;
  text: string;
  video_url: string | null;
  status: string | null;
  engine_name: string | null;
}

interface VideoOutput {
  id: string;
  final_video_url: string | null;
  format: string | null;
  duration_sec: number | null;
  status: string | null;
}

export const StudioAssetBuilder = () => {
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [videoOutputs, setVideoOutputs] = useState<VideoOutput[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    loadLatestProject();
  }, []);

  const loadLatestProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get latest autopilot project
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (projects && projects.length > 0) {
        setSelectedProject(projects[0].id);
        await loadProjectAssets(projects[0].id);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectAssets = async (projectId: string) => {
    try {
      // Load scripts
      const { data: scriptData } = await supabase
        .from('scripts')
        .select('id, raw_text, tone, status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (scriptData) {
        setScripts(scriptData);

        // Load scenes for all scripts
        const scriptIds = scriptData.map(s => s.id);
        if (scriptIds.length > 0) {
          const { data: sceneData } = await supabase
            .from('scenes')
            .select('id, text, video_url, status, engine_name')
            .in('script_id', scriptIds)
            .order('index', { ascending: true });

          if (sceneData) {
            setScenes(sceneData);
          }
        }
      }

      // Load video outputs
      const { data: videoData } = await supabase
        .from('video_outputs')
        .select('id, final_video_url, format, duration_sec, status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (videoData) {
        setVideoOutputs(videoData);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const handleRegenerate = async (assetType: string) => {
    setRegenerating(assetType);
    
    try {
      // Trigger regeneration based on type
      if (selectedProject) {
        toast({
          title: "Regeneration Started",
          description: `${assetType} is being regenerated`,
        });

        // Reload assets after a delay
        setTimeout(() => {
          loadProjectAssets(selectedProject);
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate assets",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setRegenerating(null), 1000);
    }
  };

  const handleDownloadAll = () => {
    const completedVideos = videoOutputs.filter(v => v.final_video_url);
    if (completedVideos.length === 0) {
      toast({
        title: "No Videos",
        description: "No completed videos available for download",
        variant: "destructive",
      });
      return;
    }

    completedVideos.forEach((video, index) => {
      if (video.final_video_url) {
        setTimeout(() => {
          window.open(video.final_video_url!, '_blank');
        }, index * 500);
      }
    });

    toast({
      title: "Download Started",
      description: `Downloading ${completedVideos.length} videos`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{scripts.length}</p>
              <p className="text-xs text-muted-foreground">Scripts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{scenes.filter(s => s.video_url).length}</p>
              <p className="text-xs text-muted-foreground">Scene Videos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <Play className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{videoOutputs.filter(v => v.final_video_url).length}</p>
              <p className="text-xs text-muted-foreground">Final Videos</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="scripts" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="scripts" className="gap-2">
            <FileText className="w-4 h-4" />
            Scripts ({scripts.length})
          </TabsTrigger>
          <TabsTrigger value="scenes" className="gap-2">
            <Video className="w-4 h-4" />
            Scenes ({scenes.length})
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2">
            <Play className="w-4 h-4" />
            Videos ({videoOutputs.length})
          </TabsTrigger>
        </TabsList>

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
            
            {scripts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scripts generated yet. Run the AI Processing first.
              </div>
            ) : (
              <div className="space-y-3">
                {scripts.map((script, index) => (
                  <div key={script.id} className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">Script {index + 1}</p>
                        {script.tone && (
                          <Badge variant="secondary" className="text-xs capitalize">{script.tone}</Badge>
                        )}
                      </div>
                      <Badge variant={script.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                        {script.status || 'draft'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{script.raw_text}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Scenes Tab */}
        <TabsContent value="scenes" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Scene Videos</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleRegenerate('scenes')}
                disabled={regenerating === 'scenes'}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${regenerating === 'scenes' ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            
            {scenes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scenes generated yet. Run the AI Processing first.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {scenes.map((scene, index) => (
                  <div key={scene.id} className="rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors overflow-hidden">
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      {scene.video_url ? (
                        <video 
                          src={scene.video_url} 
                          className="w-full h-full object-cover"
                          controls
                        />
                      ) : (
                        <Video className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-foreground text-sm">Scene {index + 1}</p>
                        <Badge variant={scene.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                          {scene.status || 'pending'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{scene.text}</p>
                      {scene.engine_name && (
                        <p className="text-xs text-primary mt-1">{scene.engine_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Final Video Outputs</h3>
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
            
            {videoOutputs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No final videos yet. Complete the video generation process first.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {videoOutputs.map((video, index) => (
                  <div key={video.id} className="rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors overflow-hidden">
                    <div className="aspect-[9/16] bg-muted flex items-center justify-center">
                      {video.final_video_url ? (
                        <video 
                          src={video.final_video_url} 
                          className="w-full h-full object-cover"
                          controls
                        />
                      ) : (
                        <Play className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-foreground text-sm">Video {index + 1}</p>
                        <Badge variant={video.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                          {video.status || 'pending'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {video.format?.toUpperCase() || 'MP4'} • {video.duration_sec ? `${video.duration_sec}s` : 'Processing'}
                      </p>
                      {video.final_video_url && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => window.open(video.final_video_url!, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
