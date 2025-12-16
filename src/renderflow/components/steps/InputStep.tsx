/**
 * RenderFlow Step 1: Input
 * Source URL or file upload - NO client-side assumptions
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RenderFlowApi } from '../../api';
import { AlertCircle, Upload, Link } from 'lucide-react';

interface InputStepProps {
  onContinue: (sourceUrl: string) => void;
}

export function InputStep({ onContinue }: InputStepProps) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleContinue = async () => {
    setUploadError(null);

    // URL path - proceed directly
    if (sourceUrl.trim()) {
      onContinue(sourceUrl.trim());
      return;
    }

    // File path - upload required
    if (!file) {
      setUploadError('Provide a source URL or select a file');
      return;
    }

    setUploading(true);
    try {
      const res = await RenderFlowApi.uploadAsset(file);
      onContinue(res.url);
    } catch (e: any) {
      // Show backend error verbatim - no smoothing
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Step 1: Input Source
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* URL Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Link className="w-4 h-4" />
            Option A: Source Video URL
          </Label>
          <Input
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
              setUploadError(null);
            }}
            placeholder="https://example.com/video.mp4"
            className="font-mono text-sm"
            disabled={uploading}
          />
        </div>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs uppercase text-muted-foreground tracking-wide">
              Or Upload File
            </span>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Option B: Upload Video File
          </Label>
          <Input
            type="file"
            accept="video/*"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setUploadError(null);
            }}
            disabled={uploading}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Max 500MB. MP4, WebM, MOV supported.
          </p>
        </div>

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
          disabled={uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? 'Uploading to backend...' : 'Continue to Configure'}
        </Button>
      </CardContent>
    </Card>
  );
}
