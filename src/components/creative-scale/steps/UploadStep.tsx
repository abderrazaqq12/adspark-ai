/**
 * Step 1: Upload Assets
 * STRICT: Only upload functionality, no analysis/strategy/framework info
 */

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileVideo, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { LIMITS } from '@/lib/creative-scale/validation';

interface UploadedVideo {
  id: string;
  file: File;
  url: string;
  storageUrl?: string;
  duration?: number;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  uploadProgress?: number;
  error?: string;
}

interface UploadStepProps {
  uploadedVideos: UploadedVideo[];
  onUpload: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onContinue: () => void;
  isUploading: boolean;
}

export function UploadStep({ 
  uploadedVideos, 
  onUpload, 
  onRemove, 
  onContinue,
  isUploading 
}: UploadStepProps) {
  const readyCount = uploadedVideos.filter(v => v.status === 'ready').length;
  const canContinue = readyCount > 0 && !isUploading;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Upload Video Assets</h2>
        <p className="text-muted-foreground mt-1">
          Add 1-{LIMITS.MAX_VIDEOS} video ads to analyze. Maximum {LIMITS.MAX_DURATION_SEC} seconds each.
        </p>
      </div>

      {/* Upload Zone */}
      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/25 rounded-xl cursor-pointer hover:bg-muted/30 hover:border-primary/50 transition-all group">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <span className="text-sm font-medium">
          Drop videos here or click to browse
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          MP4, MOV, WebM • Max {LIMITS.MAX_FILE_SIZE_MB}MB per file
        </span>
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          multiple
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
          disabled={isUploading}
        />
      </label>

      {/* Video List */}
      <div className="flex-1 mt-6">
        {uploadedVideos.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">
                {uploadedVideos.length} video{uploadedVideos.length !== 1 ? 's' : ''} added
              </span>
              <span className="text-xs text-muted-foreground">
                {readyCount} ready
              </span>
            </div>
            
            <ScrollArea className="h-[calc(100vh-480px)] min-h-[200px]">
              <div className="space-y-2">
                {uploadedVideos.map((video) => (
                  <div
                    key={video.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      video.status === 'error' 
                        ? 'border-destructive/50 bg-destructive/5' 
                        : video.status === 'ready'
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-border bg-muted/30'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                      <video src={video.url} className="w-full h-full object-cover" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{video.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {video.status === 'uploading' 
                          ? `Uploading... ${video.uploadProgress ?? 0}%`
                          : video.status === 'error'
                            ? video.error || 'Upload failed'
                            : video.duration 
                              ? `${video.duration.toFixed(1)} seconds`
                              : 'Processing...'}
                      </p>
                      
                      {/* Upload Progress Bar */}
                      {video.status === 'uploading' && video.uploadProgress !== undefined && (
                        <div className="w-full h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-200" 
                            style={{ width: `${video.uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="shrink-0">
                      {video.status === 'ready' && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {video.status === 'uploading' && (
                        <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                      )}
                      {video.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(video.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileVideo className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No videos uploaded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload videos to begin analysis
            </p>
          </div>
        )}
      </div>

      {/* Continue CTA */}
      <div className="pt-6 border-t border-border mt-auto">
        <Button 
          className="w-full h-12 text-base"
          onClick={onContinue}
          disabled={!canContinue}
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              Continue to Analysis
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
        {!canContinue && !isUploading && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Upload at least one video to continue
          </p>
        )}
      </div>
    </div>
  );
}
