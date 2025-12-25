import { useState } from "react";
import { getUser, getAuthHeaders } from "@/utils/auth";
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
      // VPS-ONLY: Use centralized auth
      const user = getUser();
      if (!user) {
        toast.error("Please sign in to upload videos");
        return null;
      }

      // VPS Mode: Upload to backend
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 20, 90));
      }, 300);

      const formData = new FormData();
      formData.append('file', file);

      const headers = getAuthHeaders();

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers,
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
        path: data.filename
      };
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
      // VPS-ONLY: Delete via backend API
      const headers = getAuthHeaders();
      const res = await fetch(`/api/files/${encodeURIComponent(path)}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) throw new Error('Delete failed');
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
