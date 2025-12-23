// Storage Categories - ARCHITECTURAL CONTRACT
export type StorageCategory = 
  | 'generated_outputs'  // Videos, Images, Audio, Subtitles, Scripts
  | 'temporary'          // tmp renders, failed jobs, partial exports
  | 'logs'               // execution logs, error logs, pipeline traces
  | 'system';            // READ-ONLY: app code, deps, ffmpeg, configs

export interface StorageCategoryStats {
  category: StorageCategory;
  label: string;
  description: string;
  sizeBytes: number;
  sizeFormatted: string;
  fileCount: number;
  lastModified: string | null;
  isDeletable: boolean;
  subcategories?: {
    name: string;
    sizeBytes: number;
    fileCount: number;
  }[];
}

export interface CleanupRequest {
  categories: Exclude<StorageCategory, 'system'>[];
  dryRun?: boolean;
}

export interface CleanupResult {
  success: boolean;
  filesDeleted: number;
  bytesFreed: number;
  bytesFreedFormatted: string;
  errors: string[];
  timestamp: string;
}

export interface GoogleDriveStatus {
  isLinked: boolean;
  lastBackup: string | null;
  pendingUploads: number;
}
