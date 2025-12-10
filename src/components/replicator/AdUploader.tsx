import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Clock, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { UploadedAd, AdAnalysis } from "@/pages/CreativeReplicator";

interface AdUploaderProps {
  uploadedAds: UploadedAd[];
  setUploadedAds: React.Dispatch<React.SetStateAction<UploadedAd[]>>;
  onContinue: () => void;
}

export const AdUploader = ({ uploadedAds, setUploadedAds, onContinue }: AdUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("video/") && f.size < 100 * 1024 * 1024
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
      const url = URL.createObjectURL(file);
      
      // Get video duration
      const video = document.createElement("video");
      video.src = url;
      
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          if (video.duration > 60) {
            toast.error(`${file.name} exceeds 60 seconds limit`);
            URL.revokeObjectURL(url);
          } else {
            const newAd: UploadedAd = {
              id,
              file,
              url,
              duration: Math.round(video.duration),
            };
            setUploadedAds((prev) => [...prev, newAd]);
            // Auto-analyze after upload
            analyzeAd(newAd);
          }
          resolve();
        };
      });
    }
  };

  const analyzeAd = async (ad: UploadedAd) => {
    setAnalyzingId(ad.id);
    
    try {
      // Call the edge function for AI analysis
      const { data, error } = await supabase.functions.invoke('creative-replicator-analyze', {
        body: {
          videoUrl: ad.url,
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 1: Upload Ads</h2>
          <p className="text-muted-foreground text-sm">
            Upload 1-10 existing ads (MP4, MOV, WebM) - max 60 seconds each
          </p>
        </div>
        <Badge variant="outline">{uploadedAds.length}/10 ads</Badge>
      </div>

      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Drop your ads here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">MP4</Badge>
            <Badge variant="secondary">MOV</Badge>
            <Badge variant="secondary">WebM</Badge>
          </div>
        </div>
      </div>

      {/* Uploaded Ads Grid */}
      {uploadedAds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploadedAds.map((ad) => (
            <Card key={ad.id} className="overflow-hidden border-border/50">
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
      )}

      {/* Continue Button */}
      {uploadedAds.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={onContinue} className="bg-primary">
            Continue to Settings
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};
