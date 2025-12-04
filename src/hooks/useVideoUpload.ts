import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadResult {
  url: string;
  path: string;
}

export function useVideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadVideo = async (
    file: File,
    bucket: "videos" | "custom-scenes",
    folder?: string
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to upload videos");
        return null;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${folder ? folder + "/" : ""}${Date.now()}.${fileExt}`;

      // Simulate progress (Supabase doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      toast.success("Video uploaded successfully");
      return { url: publicUrl, path: data.path };
    } catch (error: any) {
      toast.error(error.message || "Failed to upload video");
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteVideo = async (
    bucket: "videos" | "custom-scenes",
    path: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      toast.success("Video deleted");
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to delete video");
      return false;
    }
  };

  return {
    uploadVideo,
    deleteVideo,
    uploading,
    progress,
  };
}
