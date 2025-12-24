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
      const isSelfHosted = import.meta.env.VITE_DEPLOYMENT_MODE === 'self-hosted';
      const { data: { user } } = await supabase.auth.getUser();

      if (!user && !isSelfHosted) {
        toast.error("Please sign in to upload videos");
        return null;
      }

      if (isSelfHosted) {
        // VPS Mode: specific progress simulation
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 20, 90));
        }, 300);

        const formData = new FormData();
        formData.append('file', file);
        // Note: bucket/folder logic handled by generic /api/upload into 'uploads' dir

        // Ensure we pass the auth token for the VPS Admin API
        const token = localStorage.getItem('token');

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData
        });

        clearInterval(progressInterval);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Upload failed');
        }

        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Upload failed');

        setProgress(100);
        toast.success("Video uploaded successfully");

        return {
          url: data.url,
          path: data.filename // Use filename as "path" identifier for consistency
        };

      } else {
        // Cloud Mode
        const fileExt = file.name.split(".").pop();
        const fileName = `${user!.id}/${folder ? folder + "/" : ""}${Date.now()}.${fileExt}`;

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
      }
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
