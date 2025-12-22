/**
 * Hook for automatic asset upload to Google Drive
 * Provides easy integration with generation workflows
 */

import { useCallback } from 'react';
import { useGlobalProject } from '@/contexts/GlobalProjectContext';
import { generateAssetFileName, type AssetType } from '@/lib/google-drive';

interface UseAssetUploadReturn {
  /** Upload a generated video to the project's Drive folder */
  uploadVideo: (url: string, baseName?: string, metadata?: Record<string, any>) => void;
  
  /** Upload a generated image to the project's Drive folder */
  uploadImage: (url: string, baseName?: string, metadata?: Record<string, any>) => void;
  
  /** Upload generated audio to the project's Drive folder */
  uploadAudio: (url: string, baseName?: string, metadata?: Record<string, any>) => void;
  
  /** Upload a script file to the project's Drive folder */
  uploadScript: (content: string, baseName?: string, metadata?: Record<string, any>) => void;
  
  /** Upload a voiceover to the project's Drive folder */
  uploadVoiceover: (url: string, baseName?: string, metadata?: Record<string, any>) => void;
  
  /** Upload a thumbnail to the project's Drive folder */
  uploadThumbnail: (url: string, baseName?: string, metadata?: Record<string, any>) => void;
  
  /** Generic upload for any asset type */
  uploadAsset: (assetType: AssetType, url: string, baseName?: string, metadata?: Record<string, any>) => void;
  
  /** Check if upload is available (project selected with Drive folder) */
  isUploadAvailable: boolean;
  
  /** Active project ID */
  projectId: string | null;
}

/**
 * Hook for automatic asset upload to Google Drive
 * All uploads happen in the background and don't block UI
 */
export function useAssetUpload(): UseAssetUploadReturn {
  const { activeProject, uploadAssetBackground } = useGlobalProject();

  const getExtension = useCallback((url: string): string => {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match?.[1] || 'bin';
  }, []);

  const uploadAsset = useCallback((
    assetType: AssetType,
    url: string,
    baseName?: string,
    metadata?: Record<string, any>
  ) => {
    if (!activeProject) return;

    const extension = getExtension(url);
    const fileName = generateAssetFileName(
      baseName || activeProject.name || 'asset',
      assetType,
      extension
    );

    uploadAssetBackground(assetType, fileName, url, metadata);
  }, [activeProject, uploadAssetBackground, getExtension]);

  const uploadVideo = useCallback((url: string, baseName?: string, metadata?: Record<string, any>) => {
    uploadAsset('video', url, baseName, metadata);
  }, [uploadAsset]);

  const uploadImage = useCallback((url: string, baseName?: string, metadata?: Record<string, any>) => {
    uploadAsset('image', url, baseName, metadata);
  }, [uploadAsset]);

  const uploadAudio = useCallback((url: string, baseName?: string, metadata?: Record<string, any>) => {
    uploadAsset('audio', url, baseName, metadata);
  }, [uploadAsset]);

  const uploadVoiceover = useCallback((url: string, baseName?: string, metadata?: Record<string, any>) => {
    uploadAsset('voiceover', url, baseName, metadata);
  }, [uploadAsset]);

  const uploadThumbnail = useCallback((url: string, baseName?: string, metadata?: Record<string, any>) => {
    uploadAsset('thumbnail', url, baseName, metadata);
  }, [uploadAsset]);

  const uploadScript = useCallback((content: string, baseName?: string, metadata?: Record<string, any>) => {
    // For scripts, we'll encode as base64 and upload directly
    // This is handled differently since it's text content
    if (!activeProject) return;

    const fileName = generateAssetFileName(
      baseName || activeProject.name || 'script',
      'script',
      'txt'
    );

    // Script upload would need base64 encoding - for now just log
    console.log(`[useAssetUpload] Script upload requested: ${fileName} (${content.length} chars)`);
    // TODO: Implement script text upload via base64
  }, [activeProject]);

  return {
    uploadVideo,
    uploadImage,
    uploadAudio,
    uploadScript,
    uploadVoiceover,
    uploadThumbnail,
    uploadAsset,
    isUploadAvailable: !!activeProject?.google_drive_folder_id,
    projectId: activeProject?.id || null,
  };
}
