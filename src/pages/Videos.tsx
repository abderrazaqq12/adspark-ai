import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Video, 
  Download, 
  Search, 
  Filter, 
  Play, 
  Trash2, 
  MoreVertical,
  CheckSquare,
  Square,
  Loader2,
  FolderOpen,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface VideoOutput {
  id: string;
  project_id: string | null;
  script_id: string | null;
  final_video_url: string | null;
  format: string | null;
  duration_sec: number | null;
  has_subtitles: boolean | null;
  has_watermark: boolean | null;
  status: string | null;
  created_at: string | null;
  metadata: any;
  project?: {
    name: string;
    product_name: string | null;
  };
}

export default function Videos() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [previewVideo, setPreviewVideo] = useState<VideoOutput | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("video_outputs")
        .select(`
          *,
          project:projects(name, product_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedVideos.size === filteredVideos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(filteredVideos.map(v => v.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedVideos(newSelected);
  };

  const downloadVideo = async (video: VideoOutput) => {
    if (!video.final_video_url) {
      toast.error("Video URL not available");
      return;
    }

    try {
      const response = await fetch(video.final_video_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${video.id}.${video.format || "mp4"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download video");
    }
  };

  const bulkDownload = async () => {
    if (selectedVideos.size === 0) {
      toast.error("No videos selected");
      return;
    }

    setDownloading(true);
    const selectedList = videos.filter(v => selectedVideos.has(v.id) && v.final_video_url);
    
    for (const video of selectedList) {
      await downloadVideo(video);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setDownloading(false);
    toast.success(`Downloaded ${selectedList.length} videos`);
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = 
      video.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.project?.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || video.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case "processing":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Processing</Badge>;
      case "failed":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Video Library</h1>
          <p className="text-muted-foreground">
            {videos.length} videos generated • {selectedVideos.size} selected
          </p>
        </div>
        <div className="flex gap-2">
          {selectedVideos.size > 0 && (
            <Button
              onClick={bulkDownload}
              disabled={downloading}
              className="bg-gradient-primary text-primary-foreground"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download Selected ({selectedVideos.size})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by project name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={toggleSelectAll}>
              {selectedVideos.size === filteredVideos.length ? (
                <CheckSquare className="w-4 h-4 mr-2" />
              ) : (
                <Square className="w-4 h-4 mr-2" />
              )}
              Select All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <Card className="bg-gradient-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No videos found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Start creating videos to see them here"}
            </p>
            <Button onClick={() => navigate("/create")} className="bg-gradient-primary text-primary-foreground">
              Create Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVideos.map((video) => (
            <Card 
              key={video.id} 
              className={`bg-gradient-card border-border shadow-card transition-all ${
                selectedVideos.has(video.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardContent className="p-0">
                {/* Video Thumbnail */}
                <div 
                  className="relative aspect-video bg-muted rounded-t-lg overflow-hidden cursor-pointer group"
                  onClick={() => video.final_video_url && setPreviewVideo(video)}
                >
                  {video.final_video_url ? (
                    <>
                      <video 
                        src={video.final_video_url} 
                        className="w-full h-full object-cover"
                        muted
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedVideos.has(video.id)}
                      onCheckedChange={() => toggleSelect(video.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-background/80"
                    />
                  </div>
                  
                  {/* Duration Badge */}
                  {video.duration_sec && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {formatDuration(video.duration_sec)}
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {video.project?.name || "Untitled Project"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {video.project?.product_name || "No product"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {video.final_video_url && (
                          <>
                            <DropdownMenuItem onClick={() => setPreviewVideo(video)}>
                              <Play className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadVideo(video)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(video.final_video_url!, "_blank")}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open in New Tab
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem 
                          onClick={() => video.project_id && navigate(`/scene-builder?project=${video.project_id}`)}
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          View Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between">
                    {getStatusBadge(video.status)}
                    <div className="flex gap-1">
                      {video.has_subtitles && (
                        <Badge variant="outline" className="text-xs">CC</Badge>
                      )}
                      <Badge variant="outline" className="text-xs uppercase">
                        {video.format || "mp4"}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {video.created_at && new Date(video.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewVideo?.project?.name || "Video Preview"}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {previewVideo?.final_video_url && (
              <video 
                src={previewVideo.final_video_url} 
                controls 
                autoPlay
                className="w-full h-full"
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewVideo(null)}>
              Close
            </Button>
            {previewVideo && (
              <Button onClick={() => downloadVideo(previewVideo)} className="bg-gradient-primary text-primary-foreground">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
