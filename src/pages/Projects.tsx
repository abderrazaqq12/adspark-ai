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
  Grid3X3,
  List,
  ArrowLeft,
  Eye,
  ExternalLink,
  Cloud,
  CloudOff,
  Palette,
  Wand2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Project {
  id: string;
  name: string;
  product_name: string | null;
  language: string;
  status: string;
  output_count: number;
  created_at: string;
  updated_at: string;
  google_drive_folder_id: string | null;
  google_drive_folder_link: string | null;
}

interface AssetCounts {
  videos: number;
  images: number;
  scripts: number;
  voiceovers: number;
  landingPages: number;
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
  project_id: string | null;
}

interface VideoOutput {
  id: string;
  final_video_url: string | null;
  status: string | null;
  duration_sec: number | null;
  created_at: string;
  project_id: string | null;
}

interface LandingPage {
  id: string;
  title: string;
  status: string | null;
  language: string | null;
  created_at: string;
  project_id: string | null;
}

interface AudioTrack {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
  script_id: string | null;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [videos, setVideos] = useState<VideoOutput[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [voiceovers, setVoiceovers] = useState<AudioTrack[]>([]);
  const [projectAssetCounts, setProjectAssetCounts] = useState<Record<string, AssetCounts>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      const projectId = searchParams.get('project');
      if (projectId) {
        fetchProjectDetails(projectId);
      } else {
        fetchProjects();
      }
    }
  }, [user, searchParams]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      setSelectedProject(null);

      // Fetch asset counts for each project
      if (data && data.length > 0) {
        const projectIds = data.map(p => p.id);
        const [videoCounts, imageCounts, scriptCounts, landingPageCounts] = await Promise.all([
          supabase.from("video_outputs").select("project_id").in("project_id", projectIds),
          supabase.from("generated_images").select("project_id").in("project_id", projectIds),
          supabase.from("scripts").select("project_id").in("project_id", projectIds),
          supabase.from("landing_pages").select("project_id").in("project_id", projectIds),
        ]);

        const counts: Record<string, AssetCounts> = {};
        projectIds.forEach(id => {
          counts[id] = {
            videos: videoCounts.data?.filter(v => v.project_id === id).length || 0,
            images: imageCounts.data?.filter(i => i.project_id === id).length || 0,
            scripts: scriptCounts.data?.filter(s => s.project_id === id).length || 0,
            voiceovers: 0,
            landingPages: landingPageCounts.data?.filter(l => l.project_id === id).length || 0,
          };
        });
        setProjectAssetCounts(counts);
      }
    } catch (error: any) {
      toast.error("Failed to load projects");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    setLoading(true);
    try {
      // Fetch project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setSelectedProject(project);

      // Fetch all assets for this project in parallel
      const [scriptsRes, imagesRes, videosRes, landingPagesRes, voiceoversRes] = await Promise.all([
        supabase.from("scripts").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
        supabase.from("generated_images").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
        supabase.from("video_outputs").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
        supabase.from("landing_pages").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
        supabase.from("audio_tracks").select("*").order("created_at", { ascending: false }),
      ]);

      if (scriptsRes.data) setScripts(scriptsRes.data);
      if (imagesRes.data) setImages(imagesRes.data);
      if (videosRes.data) setVideos(videosRes.data);
      if (landingPagesRes.data) setLandingPages(landingPagesRes.data);
      if (voiceoversRes.data) setVoiceovers(voiceoversRes.data);
    } catch (error: any) {
      toast.error("Failed to load project details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      // Delete all related records first to avoid foreign key constraint errors
      const deletionPromises = [
        supabase.from("autopilot_jobs").delete().eq("project_id", projectId),
        supabase.from("pipeline_jobs").delete().eq("project_id", projectId),
        supabase.from("video_variations").delete().eq("project_id", projectId),
        supabase.from("video_outputs").delete().eq("project_id", projectId),
        supabase.from("generated_images").delete().eq("project_id", projectId),
        supabase.from("landing_pages").delete().eq("project_id", projectId),
        supabase.from("marketing_content").delete().eq("project_id", projectId),
        supabase.from("uploads").delete().eq("project_id", projectId),
        supabase.from("ai_costs").delete().eq("project_id", projectId),
        supabase.from("ai_failures").delete().eq("project_id", projectId),
        supabase.from("analytics_events").delete().eq("project_id", projectId),
        supabase.from("cost_transactions").delete().eq("project_id", projectId),
        supabase.from("operator_jobs").delete().eq("project_id", projectId),
      ];

      // Delete scripts and their related data (scenes, audio_tracks)
      const { data: scripts } = await supabase
        .from("scripts")
        .select("id")
        .eq("project_id", projectId);

      if (scripts && scripts.length > 0) {
        const scriptIds = scripts.map(s => s.id);
        
        // Delete scenes for these scripts
        for (const scriptId of scriptIds) {
          await supabase.from("scenes").delete().eq("script_id", scriptId);
          await supabase.from("audio_tracks").delete().eq("script_id", scriptId);
        }
        
        // Delete scripts
        await supabase.from("scripts").delete().eq("project_id", projectId);
      }

      // Wait for all other deletions
      await Promise.all(deletionPromises);

      // Now delete the project
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
      setProjects(projects.filter(p => p.id !== projectId));
      toast.success("Project deleted");
    } catch (error: any) {
      console.error("Delete project error:", error);
      toast.error("Failed to delete project: " + (error.message || "Unknown error"));
    }
  };

  const openProject = (project: Project) => {
    navigate(`/projects?project=${project.id}`);
  };

  const backToProjects = () => {
    navigate('/projects');
    setSelectedProject(null);
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

  // Project Detail View
  if (selectedProject) {
    return (
      <div className="container mx-auto p-8 space-y-6 animate-in fade-in duration-500">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={backToProjects}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{selectedProject.name}</h1>
            <p className="text-muted-foreground">{selectedProject.product_name || 'No product name'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(selectedProject.status)}>{selectedProject.status}</Badge>
            {selectedProject.google_drive_folder_id ? (
              <Button 
                variant="outline" 
                size="sm"
                className="border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => {
                  if (selectedProject.google_drive_folder_link) {
                    window.open(selectedProject.google_drive_folder_link, '_blank');
                  }
                }}
              >
                <Cloud className="w-4 h-4 mr-2" />
                Open Drive Folder
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            ) : (
              <Badge variant="outline" className="border-muted text-muted-foreground">
                <CloudOff className="w-3 h-3 mr-1" />
                No Drive Folder
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Access Tools */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/studio?project=${selectedProject.id}`)}
            className="border-border hover:bg-primary/10 hover:text-primary"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Open in Studio
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/creative-replicator?project=${selectedProject.id}`)}
            className="border-border hover:bg-primary/10 hover:text-primary"
          >
            <Palette className="w-4 h-4 mr-2" />
            Creative Replicator
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/scene-builder?project=${selectedProject.id}`)}
            className="border-border hover:bg-primary/10 hover:text-primary"
          >
            <Edit className="w-4 h-4 mr-2" />
            Scene Builder
          </Button>
        </div>

        {/* Asset Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Videos", count: videos.length, icon: Video, color: "text-blue-500" },
            { label: "Images", count: images.length, icon: Image, color: "text-green-500" },
            { label: "Scripts", count: scripts.length, icon: FileText, color: "text-amber-500" },
            { label: "Voiceovers", count: voiceovers.length, icon: Mic, color: "text-purple-500" },
            { label: "Landing Pages", count: landingPages.length, icon: FileCode, color: "text-pink-500" },
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

        {/* Asset Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="gap-2">All Assets</TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="w-4 h-4" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <Image className="w-4 h-4" />
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
            <TabsTrigger value="landing-pages" className="gap-2">
              <FileCode className="w-4 h-4" />
              Landing Pages
            </TabsTrigger>
          </TabsList>

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                          <video src={video.final_video_url} className="w-full h-full object-cover" controls />
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Scripts Tab */}
          <TabsContent value="scripts" className="mt-6">
            <div className="space-y-3">
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
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-3">{script.raw_text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{script.language || 'en'}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(script.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Voiceovers Tab */}
          <TabsContent value="voiceovers" className="mt-6">
            <div className="space-y-3">
              {voiceovers.length === 0 ? (
                <Card className="bg-gradient-card border-border">
                  <CardContent className="py-12 text-center">
                    <Mic className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No voiceovers generated yet</p>
                  </CardContent>
                </Card>
              ) : (
                voiceovers.map((vo) => (
                  <Card key={vo.id} className="bg-gradient-card border-border hover:border-primary/50 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Mic className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{vo.name}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(vo.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {vo.file_url && (
                          <audio src={vo.file_url} controls className="h-8" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Landing Pages Tab */}
          <TabsContent value="landing-pages" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <div className="flex items-start gap-3">
                        <FileCode className="w-5 h-5 text-pink-500" />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{page.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(page.status || 'draft')}>{page.status}</Badge>
                            <Badge variant="outline">{page.language || 'en'}</Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* All Assets Tab */}
          <TabsContent value="all" className="mt-6 space-y-8">
            {videos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-500" />
                  Videos ({videos.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {videos.slice(0, 3).map((video) => (
                    <Card key={video.id} className="bg-gradient-card border-border">
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {images.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-green-500" />
                  Images ({images.length})
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {images.slice(0, 6).map((image) => (
                    <Card key={image.id} className="bg-gradient-card border-border overflow-hidden">
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        {image.image_url ? (
                          <img src={image.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-6 h-6 text-muted-foreground/50" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {scripts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  Scripts ({scripts.length})
                </h3>
                <div className="space-y-2">
                  {scripts.slice(0, 3).map((script) => (
                    <Card key={script.id} className="bg-gradient-card border-border">
                      <CardContent className="p-3">
                        <p className="text-sm text-foreground line-clamp-2">{script.raw_text}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Projects List View
  return (
    <div className="container mx-auto p-8 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">My Projects</h1>
          <p className="text-muted-foreground">
            All your video ad projects with their assets
          </p>
        </div>
        <Button 
          onClick={() => navigate("/studio")}
          className="bg-gradient-primary text-primary-foreground shadow-glow"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
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

      {/* Projects Grid */}
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
                    onClick={() => navigate("/studio")}
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
              className="bg-gradient-card border-border shadow-card hover:border-primary/50 transition-all group cursor-pointer"
              onClick={() => openProject(project)}
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
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/scene-builder?project=${project.id}`); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Scenes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Videos
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status and Drive Link */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                  <Badge variant="outline" className="border-border">
                    {project.language.toUpperCase()}
                  </Badge>
                  {project.google_drive_folder_id ? (
                    <Badge 
                      variant="outline" 
                      className="border-primary/30 text-primary bg-primary/5 cursor-pointer hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (project.google_drive_folder_link) {
                          window.open(project.google_drive_folder_link, '_blank');
                        }
                      }}
                    >
                      <Cloud className="w-3 h-3 mr-1" />
                      Drive Synced
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-muted text-muted-foreground">
                      <CloudOff className="w-3 h-3 mr-1" />
                      No Drive
                    </Badge>
                  )}
                </div>

                {/* Asset Counts Grid */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="flex flex-col items-center p-2 bg-muted/30 rounded-lg">
                    <Video className="w-3.5 h-3.5 text-blue-500 mb-1" />
                    <span className="font-medium text-foreground">{projectAssetCounts[project.id]?.videos || 0}</span>
                    <span className="text-muted-foreground">Videos</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted/30 rounded-lg">
                    <Image className="w-3.5 h-3.5 text-green-500 mb-1" />
                    <span className="font-medium text-foreground">{projectAssetCounts[project.id]?.images || 0}</span>
                    <span className="text-muted-foreground">Images</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted/30 rounded-lg">
                    <FileText className="w-3.5 h-3.5 text-amber-500 mb-1" />
                    <span className="font-medium text-foreground">{projectAssetCounts[project.id]?.scripts || 0}</span>
                    <span className="text-muted-foreground">Scripts</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted/30 rounded-lg">
                    <FileCode className="w-3.5 h-3.5 text-pink-500 mb-1" />
                    <span className="font-medium text-foreground">{projectAssetCounts[project.id]?.landingPages || 0}</span>
                    <span className="text-muted-foreground">Pages</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-border hover:bg-primary/10 hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); openProject(project); }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Assets
                  </Button>
                  {project.google_drive_folder_link && (
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="border-border hover:bg-primary/10 hover:text-primary"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        window.open(project.google_drive_folder_link!, '_blank');
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This will permanently remove all associated videos, images, scripts, and other assets. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (projectToDelete) {
                  deleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }
              }}
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}