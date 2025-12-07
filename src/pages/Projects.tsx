import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FolderOpen, 
  Plus, 
  Search, 
  Video, 
  Clock, 
  MoreVertical,
  Trash2,
  Edit,
  Download,
  Play,
  Image,
  FileText,
  Mic,
  FileCode,
  ExternalLink,
  Grid3X3,
  List
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  product_name: string | null;
  language: string;
  status: string;
  output_count: number;
  created_at: string;
  updated_at: string;
}

interface Script {
  id: string;
  raw_text: string;
  language: string | null;
  created_at: string;
  project_id: string | null;
}

interface GeneratedImage {
  id: string;
  image_url: string | null;
  image_type: string;
  prompt: string | null;
  created_at: string;
}

interface VideoOutput {
  id: string;
  final_video_url: string | null;
  status: string | null;
  duration_sec: number | null;
  created_at: string;
}

interface LandingPage {
  id: string;
  title: string;
  status: string | null;
  language: string | null;
  created_at: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [videos, setVideos] = useState<VideoOutput[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("projects");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchAllAssets();
    }
  }, [user]);

  const fetchAllAssets = async () => {
    setLoading(true);
    try {
      // Fetch all asset types in parallel
      const [projectsRes, scriptsRes, imagesRes, videosRes, landingPagesRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("scripts").select("*").order("created_at", { ascending: false }),
        supabase.from("generated_images").select("*").order("created_at", { ascending: false }),
        supabase.from("video_outputs").select("*").order("created_at", { ascending: false }),
        supabase.from("landing_pages").select("*").order("created_at", { ascending: false }),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (scriptsRes.data) setScripts(scriptsRes.data);
      if (imagesRes.data) setImages(imagesRes.data);
      if (videosRes.data) setVideos(videosRes.data);
      if (landingPagesRes.data) setLandingPages(landingPagesRes.data);
    } catch (error: any) {
      toast.error("Failed to load assets");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
      setProjects(projects.filter(p => p.id !== projectId));
      toast.success("Project deleted");
    } catch (error: any) {
      toast.error("Failed to delete project");
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-primary/20 text-primary";
      case "processing": return "bg-yellow-500/20 text-yellow-500";
      case "draft": return "bg-muted text-muted-foreground";
      case "failed": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const assetCounts = {
    projects: projects.length,
    videos: videos.length,
    images: images.length,
    scripts: scripts.length,
    voiceovers: 0, // Would need audio_tracks table
    landingPages: landingPages.length,
  };

  return (
    <div className="container mx-auto p-8 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">My Library</h1>
          <p className="text-muted-foreground">
            All your projects, videos, images, scripts, and content
          </p>
        </div>
        <Button 
          onClick={() => navigate("/create")}
          className="bg-gradient-primary text-primary-foreground shadow-glow"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Projects", count: assetCounts.projects, icon: FolderOpen, color: "text-primary" },
          { label: "Videos", count: assetCounts.videos, icon: Video, color: "text-blue-500" },
          { label: "Images", count: assetCounts.images, icon: Image, color: "text-green-500" },
          { label: "Scripts", count: assetCounts.scripts, icon: FileText, color: "text-amber-500" },
          { label: "Voiceovers", count: assetCounts.voiceovers, icon: Mic, color: "text-purple-500" },
          { label: "Landing Pages", count: assetCounts.landingPages, icon: FileCode, color: "text-pink-500" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-gradient-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.count}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search all assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-border"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="projects" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Projects ({assetCounts.projects})
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2">
            <Video className="w-4 h-4" />
            Videos ({assetCounts.videos})
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-2">
            <Image className="w-4 h-4" />
            Images ({assetCounts.images})
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <FileText className="w-4 h-4" />
            Scripts ({assetCounts.scripts})
          </TabsTrigger>
          <TabsTrigger value="landing-pages" className="gap-2">
            <FileCode className="w-4 h-4" />
            Landing Pages ({assetCounts.landingPages})
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-6">
          {loading ? (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-gradient-card border-border shadow-card animate-pulse">
                  <CardHeader className="space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  {projects.length === 0 ? (
                    <>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
                      <p className="mb-4">Create your first video ad project to get started!</p>
                      <Button 
                        onClick={() => navigate("/create")}
                        className="bg-gradient-primary text-primary-foreground"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Project
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
                      <p>Try adjusting your search query</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="bg-gradient-card border-border shadow-card hover:border-primary/50 transition-all group"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-foreground text-lg line-clamp-1">
                          {project.name}
                        </CardTitle>
                        {project.product_name && (
                          <CardDescription className="text-muted-foreground line-clamp-1">
                            {project.product_name}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/scene-builder?project=${project.id}`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Scenes
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Export Videos
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteProject(project.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      <Badge variant="outline" className="border-border">
                        {project.language.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Video className="w-4 h-4" />
                        <span>{project.output_count} videos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full border-border hover:bg-primary/10 hover:text-primary"
                      onClick={() => navigate(`/scene-builder?project=${project.id}`)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Open Project
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-6">
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" : "space-y-3"}>
            {videos.length === 0 ? (
              <Card className="col-span-full bg-gradient-card border-border">
                <CardContent className="py-12 text-center">
                  <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No videos generated yet</p>
                </CardContent>
              </Card>
            ) : (
              videos.map((video) => (
                <Card key={video.id} className="bg-gradient-card border-border group hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {video.final_video_url ? (
                        <video src={video.final_video_url} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="w-8 h-8 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(video.status || 'draft')}>{video.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {video.duration_sec ? `${video.duration_sec}s` : 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images" className="mt-6">
          <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" : "space-y-3"}>
            {images.length === 0 ? (
              <Card className="col-span-full bg-gradient-card border-border">
                <CardContent className="py-12 text-center">
                  <Image className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No images generated yet</p>
                </CardContent>
              </Card>
            ) : (
              images.map((image) => (
                <Card key={image.id} className="bg-gradient-card border-border group hover:border-primary/50 transition-all overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {image.image_url ? (
                      <img src={image.image_url} alt={image.image_type} className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-8 h-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <CardContent className="p-2">
                    <Badge variant="outline" className="text-xs">{image.image_type}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts" className="mt-6">
          <div className="space-y-4">
            {scripts.length === 0 ? (
              <Card className="bg-gradient-card border-border">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No scripts created yet</p>
                </CardContent>
              </Card>
            ) : (
              scripts.map((script) => (
                <Card key={script.id} className="bg-gradient-card border-border hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-foreground line-clamp-3">{script.raw_text}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{script.language || 'en'}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(script.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Landing Pages Tab */}
        <TabsContent value="landing-pages" className="mt-6">
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {landingPages.length === 0 ? (
              <Card className="col-span-full bg-gradient-card border-border">
                <CardContent className="py-12 text-center">
                  <FileCode className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No landing pages created yet</p>
                </CardContent>
              </Card>
            ) : (
              landingPages.map((page) => (
                <Card key={page.id} className="bg-gradient-card border-border hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-foreground">{page.title}</h3>
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(page.status || 'draft')}>{page.status}</Badge>
                      <Badge variant="outline">{page.language || 'en'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}