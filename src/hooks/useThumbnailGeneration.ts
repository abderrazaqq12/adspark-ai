import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useThumbnailGeneration() {
  const [generating, setGenerating] = useState(false);

  const generateThumbnailFromVideo = async (
    videoElement: HTMLVideoElement,
    sceneId: string
  ): Promise<string | null> => {
    setGenerating(true);
    try {
      // Create canvas and capture frame
      const canvas = document.createElement("canvas");
      canvas.width = videoElement.videoWidth || 320;
      canvas.height = videoElement.videoHeight || 180;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // Seek to 1 second or 25% of video for better thumbnail
      const seekTime = Math.min(1, videoElement.duration * 0.25);
      videoElement.currentTime = seekTime;
      
      await new Promise((resolve) => {
        videoElement.onseeked = resolve;
      });

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.8);
      });

      if (!blob) throw new Error("Failed to create thumbnail blob");

      // Upload to storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileName = `thumbnails/${user.id}/${sceneId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      // Update scene with thumbnail
      await supabase
        .from("scenes")
        .update({ thumbnail_url: publicUrl })
        .eq("id", sceneId);

      toast.success("Thumbnail generated");
      return publicUrl;
    } catch (error: any) {
      console.error("Thumbnail generation error:", error);
      // Don't show error toast - thumbnail is optional
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const generateThumbnailFromUrl = async (
    videoUrl: string,
    sceneId: string
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = videoUrl;
      video.muted = true;
      
      video.onloadeddata = async () => {
        const result = await generateThumbnailFromVideo(video, sceneId);
        resolve(result);
      };

      video.onerror = () => {
        console.error("Could not load video for thumbnail");
        resolve(null);
      };
    });
  };

  return {
    generateThumbnailFromVideo,
    generateThumbnailFromUrl,
    generating,
  };
}
