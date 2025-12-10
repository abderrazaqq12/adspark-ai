import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, RefreshCw, Save, Play, Clock, Filter, Grid, List, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { GeneratedVideo } from "@/pages/CreativeReplicator";

interface ResultsGalleryProps {
  videos: GeneratedVideo[];
  onRegenerate: () => void;
}

export const ResultsGallery = ({ videos, onRegenerate }: ResultsGalleryProps) => {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterRatio, setFilterRatio] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedVideos((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedVideos(videos.map((v) => v.id));
  };

  const deselectAll = () => {
    setSelectedVideos([]);
  };

  const filteredVideos = filterRatio
    ? videos.filter((v) => v.ratio === filterRatio)
    : videos;

  const uniqueRatios = [...new Set(videos.map((v) => v.ratio))];

  const handleDownloadSelected = () => {
    toast.success(`Downloading ${selectedVideos.length} videos...`);
  };

  const handleSaveToProjects = () => {
    toast.success(`Saved ${selectedVideos.length} videos to projects`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Generation Complete
          </h2>
          <p className="text-muted-foreground text-sm">
            {videos.length} video variations generated successfully
          </p>
        </div>
        <Button onClick={onRegenerate} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate More
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={selectedVideos.length === videos.length ? deselectAll : selectAll}
          >
            {selectedVideos.length === videos.length ? "Deselect All" : "Select All"}
          </Button>
          {selectedVideos.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedVideos.length} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Ratio Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              <Button
                variant={filterRatio === null ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterRatio(null)}
              >
                All
              </Button>
              {uniqueRatios.map((ratio) => (
                <Button
                  key={ratio}
                  variant={filterRatio === ratio ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilterRatio(ratio)}
                >
                  {ratio}
                </Button>
              ))}
            </div>
          </div>

          {/* View Mode */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedVideos.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-medium">
              {selectedVideos.length} videos selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDownloadSelected}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button size="sm" onClick={handleSaveToProjects}>
                <Save className="w-4 h-4 mr-2" />
                Save to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Grid/List */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            : "space-y-3"
        }
      >
        {filteredVideos.map((video) => (
          <Card
            key={video.id}
            className={`overflow-hidden transition-all cursor-pointer ${
              selectedVideos.includes(video.id)
                ? "ring-2 ring-primary border-primary"
                : "border-border/50 hover:border-border"
            }`}
            onClick={() => toggleSelect(video.id)}
          >
            {viewMode === "grid" ? (
              <>
                <div className="relative aspect-[9/16] bg-gradient-to-br from-muted to-muted/50">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedVideos.includes(video.id)}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggleSelect(video.id)}
                    />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                    <Badge className="bg-black/60 text-white">
                      <Clock className="w-3 h-3 mr-1" />
                      {video.duration}s
                    </Badge>
                    <Badge variant="outline" className="bg-black/60 text-white border-0">
                      {video.ratio}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {video.hookStyle}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {video.pacing}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Engine: {video.engine}
                  </p>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox
                  checked={selectedVideos.includes(video.id)}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => toggleSelect(video.id)}
                />
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center shrink-0">
                  <Play className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{video.id}</span>
                    <Badge variant="outline">{video.ratio}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {video.hookStyle}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {video.pacing}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {video.engine}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground">{video.duration}s</span>
                  <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{videos.length}</p>
              <p className="text-sm text-muted-foreground">Total Videos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueRatios.length}</p>
              <p className="text-sm text-muted-foreground">Aspect Ratios</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Math.round(videos.reduce((acc, v) => acc + v.duration, 0) / 60)}m
              </p>
              <p className="text-sm text-muted-foreground">Total Duration</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">Ready</p>
              <p className="text-sm text-muted-foreground">Status</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
