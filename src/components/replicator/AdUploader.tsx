import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Clock, Sparkles, ArrowRight, Loader2, FolderOpen, FileVideo, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { UploadedAd, AdAnalysis } from "@/pages/CreativeReplicator";
import { useVideoUpload } from "@/hooks/useVideoUpload";

interface AdUploaderProps {
  uploadedAds: UploadedAd[];
  setUploadedAds: React.Dispatch<React.SetStateAction<UploadedAd[]>>;
  projectName: string;
  setProjectName: React.Dispatch<React.SetStateAction<string>>;
  onContinue: () => void;
}

export const AdUploader = ({ uploadedAds, setUploadedAds, projectName, setProjectName, onContinue }: AdUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadVideo, uploading } = useVideoUpload();

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("video/") && f.size < 200 * 1024 * 1024
    );
    await processFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    if (uploadedAds.length + files.length > 10) {
      toast.error("Maximum 10 ads allowed");
      return;
    }

    for (const file of files) {
      const id = `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 1. Get duration locally first
      const tempUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = tempUrl;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = async () => {
          if (video.duration > 60) {
            toast.error(`${file.name} exceeds 60 seconds limit`);
            URL.revokeObjectURL(tempUrl);
            resolve();
            return;
          }

          // 2. Upload to Supabase Storage immediately
          toast.message(`Uploading ${file.name}...`);
          const uploadResult = await uploadVideo(file, "videos", "input_ads");

          if (!uploadResult) {
            toast.error(`Failed to upload ${file.name}`);
            URL.revokeObjectURL(tempUrl);
            resolve();
            return;
          }

          // 3. Add to state with PUBLIC REMOTE URL
          const newAd: UploadedAd = {
            id,
            file,
            url: uploadResult.url, // Use remote URL
            duration: Math.round(video.duration),
          };

          setUploadedAds((prev) => [...prev, newAd]);

          // 4. Analyze using REMOTE URL
          toast.success(`Uploaded ${file.name}`);
          analyzeAd(newAd);

          // cleanup local blob
          URL.revokeObjectURL(tempUrl);
          resolve();
        };
      });
    }
  };

  const loadDemoVideo = async () => {
    setLoadingDemo(true);
    try {
      // Demo video URL - using a sample video
      const demoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4";

      const id = `demo-${Date.now()}`;

      const demoAd: UploadedAd = {
        id,
        file: new File([], "demo_video.mp4", { type: "video/mp4" }),
        url: demoUrl,
        duration: 15,
        analysis: {
          transcript: "A demo product showcase with hook, benefits, and call to action.",
          scenes: [
            { startTime: 0, endTime: 3, description: "Attention hook", type: "hook" },
            { startTime: 3, endTime: 10, description: "Product showcase", type: "showcase" },
            { startTime: 10, endTime: 15, description: "Call to action", type: "cta" }
          ],
          hook: "curiosity",
          pacing: "dynamic",
          style: "Product Demo",
          transitions: ["zoom", "fade"],
          voiceTone: "confident",
          musicType: "upbeat",
          aspectRatio: "9:16"
        }
      };

      setUploadedAds(prev => [...prev, demoAd]);
      toast.success("Demo video loaded!");
    } catch (err) {
      toast.error("Failed to load demo video");
    } finally {
      setLoadingDemo(false);
    }
  };

  const analyzeAd = async (ad: UploadedAd) => {
    setAnalyzingId(ad.id);

    try {
      // Call the edge function for AI analysis
      const { data, error } = await supabase.functions.invoke('creative-replicator-analyze', {
        body: {
          videoUrl: ad.url, // This is now a Supabase Public URL
          fileName: ad.file.name,
          duration: ad.duration,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success && data?.analysis) {
        setUploadedAds((prev) =>
          prev.map((a) => (a.id === ad.id ? { ...a, analysis: data.analysis } : a))
        );
        toast.success(`Analyzed ${ad.file.name}`);
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (err: unknown) {
      console.error('Analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      toast.error(errorMessage);

      // Fallback to default analysis
      const fallbackAnalysis: AdAnalysis = {
        transcript: "This is a product showcase video demonstrating key features and benefits.",
        scenes: [
          { startTime: 0, endTime: 3, description: "Attention-grabbing hook", type: "hook" },
          { startTime: 3, endTime: Math.floor(ad.duration * 0.5), description: "Product demonstration", type: "showcase" },
          { startTime: Math.floor(ad.duration * 0.5), endTime: Math.floor(ad.duration * 0.8), description: "Benefits highlight", type: "benefits" },
          { startTime: Math.floor(ad.duration * 0.8), endTime: ad.duration, description: "Call to action", type: "cta" }
        ],
        hook: "problem-solution",
        pacing: "fast",
        style: "UGC Review",
        transitions: ["hard-cut", "zoom"],
        voiceTone: "energetic",
        musicType: "upbeat",
        aspectRatio: "9:16"
      };

      setUploadedAds((prev) =>
        prev.map((a) => (a.id === ad.id ? { ...a, analysis: fallbackAnalysis } : a))
      );
    } finally {
      setAnalyzingId(null);
    }
  };

  const removeAd = (id: string) => {
    setUploadedAds((prev) => {
      const ad = prev.find((a) => a.id === id);
      if (ad) URL.revokeObjectURL(ad.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-primary">Upload Video Assets</h2>
        <p className="text-muted-foreground mt-1">
          Add 1-10 video ads to analyze. Maximum 60 seconds each.
        </p>
      </div>

      {/* Upload Zone - Enhanced Design */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${isDragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50 hover:bg-accent/30"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/mov,video/webm"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">Drop videos here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">
              MP4, MOV, WebM • Max 200MB per file
            </p>
          </div>
        </div>
      </div>

      {/* Load Demo Video Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            loadDemoVideo();
          }}
          disabled={loadingDemo}
          className="gap-2"
        >
          {loadingDemo ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Load Demo Video
        </Button>
      </div>

      {/* Empty State */}
      {uploadedAds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <FileVideo className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No videos uploaded yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Upload videos to begin analysis</p>
        </div>
      )}

      {/* Uploaded Ads Grid */}
      {uploadedAds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Uploaded Videos
            </span>
            <Badge variant="outline" className="text-primary border-primary/30">
              {uploadedAds.length}/10 ads
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedAds.map((ad) => (
              <Card key={ad.id} className="overflow-hidden border-border/50 bg-card/50">
                <div className="relative aspect-video bg-black">
                  <video
                    src={ad.url}
                    className="w-full h-full object-contain"
                    controls
                  />
                  <button
                    onClick={() => removeAd(ad.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-destructive flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <div className="absolute bottom-2 left-2 flex gap-2">
                    <Badge className="bg-black/60 text-white">
                      <Clock className="w-3 h-3 mr-1" />
                      {ad.duration}s
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate">{ad.file.name}</p>

                  {analyzingId === ad.id ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing with AI...
                    </div>
                  ) : ad.analysis ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {ad.analysis.style}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ad.analysis.pacing} pacing
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ad.analysis.hook} hook
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {ad.analysis.transcript}
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => analyzeAd(ad)}
                      className="w-full"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Ad
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Continue Button - Full Width like AI Editor */}
      <Button
        onClick={onContinue}
        disabled={uploadedAds.length === 0}
        className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90"
      >
        Continue to Analysis
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      {uploadedAds.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Upload at least one video to continue
        </p>
      )}
    </div>
  );
};
