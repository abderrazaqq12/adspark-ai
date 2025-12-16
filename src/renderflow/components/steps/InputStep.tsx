/**
 * RenderFlow Step 1: Input
 * Source URLs or file uploads (1-20 videos) - NO client-side assumptions
 */

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RenderFlowApi } from '../../api';
import { AlertCircle, Upload, Link, X, FileVideo, Loader2 } from 'lucide-react';

interface InputStepProps {
  onContinue: (sourceUrls: string[]) => void;
  initialUrls?: string[];
}

const MAX_FILES = 20;
const MAX_FILE_SIZE_MB = 500;

export function InputStep({ onContinue, initialUrls = [] }: InputStepProps) {
  const [sourceUrls, setSourceUrls] = useState(initialUrls.join('\n'));
  const [files, setFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setUploadError(null);

    // Validate file count
    if (selectedFiles.length > MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} files allowed. You selected ${selectedFiles.length}.`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = selectedFiles.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setUploadError(`Files exceed ${MAX_FILE_SIZE_MB}MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Validate file types
    const invalidFiles = selectedFiles.filter(f => !f.type.startsWith('video/'));
    if (invalidFiles.length > 0) {
      setUploadError(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setFiles(selectedFiles);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleContinue = async () => {
    setUploadError(null);

    // URL path - parse and validate URLs
    const urlList = sourceUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urlList.length > 0) {
      if (urlList.length > MAX_FILES) {
        setUploadError(`Maximum ${MAX_FILES} URLs allowed. You provided ${urlList.length}.`);
        return;
      }
      onContinue(urlList);
      return;
    }

    // File path - upload required
    if (files.length === 0) {
      setUploadError('Provide source URLs (one per line) or select video files');
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const res = await RenderFlowApi.uploadAsset(files[i]);
        uploadedUrls.push(res.url);
      }
      onContinue(uploadedUrls);
    } catch (e: any) {
      // Show backend error verbatim - no smoothing
      setUploadError(e.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const hasInput = sourceUrls.trim().length > 0 || files.length > 0;

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Step 1: Input Source Videos (1-{MAX_FILES})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* URL Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Link className="w-4 h-4" />
            Option A: Source Video URLs (one per line)
          </Label>
          <Textarea
            value={sourceUrls}
            onChange={(e) => {
              setSourceUrls(e.target.value);
              setUploadError(null);
            }}
            placeholder={"https://example.com/video1.mp4\nhttps://example.com/video2.mp4\nhttps://example.com/video3.mp4"}
            className="font-mono text-sm min-h-[120px]"
            disabled={uploading || files.length > 0}
          />
          <p className="text-xs text-muted-foreground">
            Enter 1-{MAX_FILES} video URLs, one per line.
          </p>
        </div>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs uppercase text-muted-foreground tracking-wide">
              Or Upload Files
            </span>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Option B: Upload Video Files (1-{MAX_FILES})
          </Label>
          
          <Input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleFilesSelect}
            disabled={uploading || sourceUrls.trim().length > 0}
            className="cursor-pointer"
          />
          
          <p className="text-xs text-muted-foreground">
            Max {MAX_FILE_SIZE_MB}MB per file. MP4, WebM, MOV supported.
          </p>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-sm font-medium text-foreground">
                Selected: {files.length} file{files.length !== 1 ? 's' : ''}
              </p>
              <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                {files.map((file, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-2 p-2 bg-muted rounded border border-border text-sm"
                  >
                    <FileVideo className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 font-mono text-xs">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeFile(i)}
                      disabled={uploading}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="p-3 bg-muted border border-border rounded text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              Uploading file {uploadProgress.current} of {uploadProgress.total}...
            </span>
          </div>
        )}

        {/* Error Display - Verbatim from backend */}
        {uploadError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={uploading || !hasInput}
          className="w-full"
          size="lg"
        >
          {uploading 
            ? `Uploading ${uploadProgress?.current || 0}/${uploadProgress?.total || files.length}...` 
            : 'Continue to Configure'
          }
        </Button>
      </CardContent>
    </Card>
  );
}
