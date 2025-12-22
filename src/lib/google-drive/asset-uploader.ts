/**
 * Google Drive Asset Uploader
 * Automatically uploads generated assets to the project's Google Drive folder
 */

import { supabase } from '@/integrations/supabase/client';

export type AssetType = 'video' | 'image' | 'audio' | 'script' | 'voiceover' | 'thumbnail' | 'export' | 'scene';

interface UploadOptions {
  projectId: string;
  assetType: AssetType;
  fileName: string;
  fileUrl?: string;
  fileBase64?: string;
  mimeType: string;
  metadata?: Record<string, any>;
}

interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  viewLink?: string;
  downloadLink?: string;
  folderId?: string;
  subfolder?: string;
  skipped?: boolean;
  message?: string;
  error?: string;
}

/**
 * Upload an asset to the project's Google Drive folder
 */
export async function uploadAssetToDrive(options: UploadOptions): Promise<UploadResult> {
  try {
    console.log(`[DriveUploader] Uploading ${options.assetType}: ${options.fileName} to project ${options.projectId}`);
    
    const { data, error } = await supabase.functions.invoke('upload-to-google-drive', {
      body: {
        projectId: options.projectId,
        assetType: options.assetType,
        fileName: options.fileName,
        fileUrl: options.fileUrl,
        fileBase64: options.fileBase64,
        mimeType: options.mimeType,
        metadata: options.metadata,
      }
    });

    if (error) {
      console.error('[DriveUploader] Function error:', error);
      return { success: false, error: error.message };
    }

    if (data.skipped) {
      console.log('[DriveUploader] Upload skipped:', data.message);
      return { success: false, skipped: true, message: data.message };
    }

    if (!data.success) {
      console.error('[DriveUploader] Upload failed:', data.error);
      return { success: false, error: data.error };
    }

    console.log(`[DriveUploader] Upload successful: ${data.file_id}`);
    return {
      success: true,
      fileId: data.file_id,
      fileName: data.file_name,
      viewLink: data.view_link,
      downloadLink: data.download_link,
      folderId: data.folder_id,
      subfolder: data.subfolder,
    };
  } catch (err) {
    console.error('[DriveUploader] Exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Upload multiple assets to Google Drive in the background
 * Returns a promise that resolves when all uploads complete
 */
export async function uploadAssetsToDriveBackground(assets: UploadOptions[]): Promise<UploadResult[]> {
  const results = await Promise.all(
    assets.map(asset => 
      uploadAssetToDrive(asset).catch(err => {
        console.error(`[DriveUploader] Background upload failed for ${asset.fileName}:`, err);
        return { success: false, error: String(err), skipped: false } as UploadResult;
      })
    )
  );
  
  const successful = results.filter(r => r.success).length;
  const skipped = results.filter(r => r.skipped === true).length;
  const failed = results.filter(r => !r.success && r.skipped !== true).length;
  console.log(`[DriveUploader] Background upload complete: ${successful} success, ${skipped} skipped, ${failed} failed`);
  
  return results;
}

/**
 * Helper to generate a timestamped filename
 */
export function generateAssetFileName(baseName: string, assetType: AssetType, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  return `${sanitized}_${assetType}_${timestamp}.${extension}`;
}

/**
 * Get the MIME type from a file URL or extension
 */
export function getMimeTypeFromUrl(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    json: 'application/json',
    pdf: 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
