import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderOpen,
  Video,
  Image as ImageIcon,
  FileText,
  Mic,
  FileCode,
  Search,
  Grid3X3,
  List,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  product_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Asset {
  id: string;
  type: 'video' | 'image' | 'script' | 'voiceover' | 'landing_page';
  url?: string;
  name: string;
  status?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface ProjectGalleryProps {
  onSelectProject?: (projectId: string) => void;
  compact?: boolean;
}

export const ProjectGallery = ({ onSelectProject, compact = false }: ProjectGalleryProps) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const isSelfHosted = import.meta.env.VITE_DEPLOYMENT_MODE === 'self-hosted' || import.meta.env.VITE_DEPLOYMENT_MODE === 'vps';
    if (user || isSelfHosted) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error(error);
      // In self-hosted, don't toast error on empty/missing table
      const isSelfHosted = import.meta.env.VITE_DEPLOYMENT_MODE === 'self-hosted';
      if (!isSelfHosted) toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectAssets = async (projectId: string) => {
    setLoadingAssets(true);
    try {
      // Fetch all asset types in parallel
      const [imagesRes, videosRes, scriptsRes, landingPagesRes] = await Promise.all([
        supabase.from('generated_images').select('*').eq('project_id', projectId),
        supabase.from('video_outputs').select('*').eq('project_id', projectId),
        supabase.from('scripts').select('*').eq('project_id', projectId),
        supabase.from('landing_pages').select('*').eq('project_id', projectId),
      ]);

      const allAssets: Asset[] = [];

      // Map images
      if (imagesRes.data) {
        imagesRes.data.forEach(img => {
          allAssets.push({
            id: img.id,
            type: 'image',
            url: img.image_url || undefined,
            name: img.image_type || 'Image',
            status: img.status || 'completed',
            created_at: img.created_at || new Date().toISOString(),
            metadata: { prompt: img.prompt },
          });
        });
      }

      // Map videos
      if (videosRes.data) {
        videosRes.data.forEach(vid => {
          allAssets.push({
            id: vid.id,
            type: 'video',
            url: vid.final_video_url || undefined,
            name: `Video ${vid.duration_sec ? `(${vid.duration_sec}s)` : ''}`,
            status: vid.status || 'completed',
            created_at: vid.created_at || new Date().toISOString(),
          });
        });
      }

      // Map scripts
      if (scriptsRes.data) {
        scriptsRes.data.forEach(script => {
          allAssets.push({
            id: script.id,
            type: 'script',
            name: script.raw_text?.substring(0, 50) + '...' || 'Script',
            status: script.status || 'completed',
            created_at: script.created_at || new Date().toISOString(),
            metadata: { language: script.language, tone: script.tone },
          });
        });
      }

      // Map landing pages
      if (landingPagesRes.data) {
        landingPagesRes.data.forEach(page => {
          allAssets.push({
            id: page.id,
            type: 'landing_page',
            name: page.title,
            status: page.status || 'draft',
            created_at: page.created_at || new Date().toISOString(),
            metadata: { language: page.language },
          });
        });
      }

      // Sort by created_at descending
      allAssets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setAssets(allAssets);
    } catch (error: any) {
      toast.error('Failed to load project assets');
      console.error(error);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    fetchProjectAssets(project.id);
    onSelectProject?.(project.id);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setAssets([]);
  };

  const getAssetIcon = (type: Asset['type']) => {
    switch (type) {
      case 'video': return Video;
      case 'image': return ImageIcon;
      case 'script': return FileText;
      case 'voiceover': return Mic;
      case 'landing_page': return FileCode;
      default: return FileText;
    }
  };

  const getAssetColor = (type: Asset['type']) => {
    switch (type) {
      case 'video': return 'text-blue-500';
      case 'image': return 'text-green-500';
      case 'script': return 'text-amber-500';
      case 'voiceover': return 'text-purple-500';
      case 'landing_page': return 'text-pink-500';
      default: return 'text-muted-foreground';
    }
  };

  const filteredAssets = assets.filter(asset => {
    if (activeTab !== 'all' && asset.type !== activeTab) return false;
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const assetCounts = {
    all: assets.length,
    video: assets.filter(a => a.type === 'video').length,
    image: assets.filter(a => a.type === 'image').length,
    script: assets.filter(a => a.type === 'script').length,
    voiceover: assets.filter(a => a.type === 'voiceover').length,
    landing_page: assets.filter(a => a.type === 'landing_page').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Project Detail View
  if (selectedProject) {
    return (
      <div className={cn("space-y-4", compact && "space-y-3")}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBackToProjects}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{selectedProject.name}</h3>
            <p className="text-xs text-muted-foreground">{selectedProject.product_name || 'No product'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchProjectAssets(selectedProject.id)}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Asset Stats */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Videos', count: assetCounts.video, icon: Video, color: 'text-blue-500' },
            { label: 'Images', count: assetCounts.image, icon: ImageIcon, color: 'text-green-500' },
            { label: 'Scripts', count: assetCounts.script, icon: FileText, color: 'text-amber-500' },
            { label: 'Audio', count: assetCounts.voiceover, icon: Mic, color: 'text-purple-500' },
            { label: 'Pages', count: assetCounts.landing_page, icon: FileCode, color: 'text-pink-500' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-2 bg-muted/50 rounded-lg">
              <stat.icon className={cn("w-4 h-4 mx-auto", stat.color)} />
              <p className="text-lg font-bold text-foreground">{stat.count}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs & Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Asset Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="all" className="text-xs">All ({assetCounts.all})</TabsTrigger>
            <TabsTrigger value="image" className="text-xs gap-1">
              <ImageIcon className="w-3 h-3" /> Images
            </TabsTrigger>
            <TabsTrigger value="video" className="text-xs gap-1">
              <Video className="w-3 h-3" /> Videos
            </TabsTrigger>
            <TabsTrigger value="script" className="text-xs gap-1">
              <FileText className="w-3 h-3" /> Scripts
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Assets Grid/List */}
        {loadingAssets ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No assets found</p>
          </div>
        ) : (
          <ScrollArea className={compact ? "h-[300px]" : "h-[400px]"}>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-3 gap-2">
                {filteredAssets.map((asset) => {
                  const Icon = getAssetIcon(asset.type);
                  return (
                    <Card key={asset.id} className="overflow-hidden group hover:border-primary/50 transition-all">
                      <div className="aspect-square bg-muted flex items-center justify-center relative">
                        {asset.type === 'image' && asset.url ? (
                          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                        ) : asset.type === 'video' && asset.url ? (
                          <video src={asset.url} className="w-full h-full object-cover" />
                        ) : (
                          <Icon className={cn("w-8 h-8", getAssetColor(asset.type))} />
                        )}
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {asset.url && (
                            <>
                              <Button variant="secondary" size="icon" className="h-7 w-7">
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button variant="secondary" size="icon" className="h-7 w-7">
                                <Download className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs text-foreground truncate">{asset.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(asset.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAssets.map((asset) => {
                  const Icon = getAssetIcon(asset.type);
                  return (
                    <div key={asset.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={cn("p-2 rounded-lg bg-muted", getAssetColor(asset.type))}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(asset.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {asset.url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    );
  }

  // Projects List View
  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Project Gallery</h3>
        <Button variant="outline" size="sm" onClick={fetchProjects}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Projects Grid */}
      <ScrollArea className={compact ? "h-[350px]" : "h-[450px]"}>
        {filteredProjects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No projects found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => handleSelectProject(project)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FolderOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.product_name || 'No product'} • {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={project.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {project.status}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
