/**
 * RenderFlow Step 3: Review
 * Read-only summary - no edits allowed
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCheck, ArrowLeft, Play, AlertCircle, FileVideo } from 'lucide-react';

interface ReviewStepProps {
  sourceUrls: string[];
  variations: number;
  isSubmitting: boolean;
  submitError: string | null;
  onStartRendering: () => void;
  onBack: () => void;
}

export function ReviewStep({ 
  sourceUrls, 
  variations, 
  isSubmitting, 
  submitError,
  onStartRendering, 
  onBack 
}: ReviewStepProps) {
  const totalJobs = sourceUrls.length * variations;

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileCheck className="w-5 h-5" />
          Step 3: Review
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Configuration Summary */}
        <div className="space-y-4 p-4 bg-muted/50 rounded border border-border">
          {/* Source Videos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <FileVideo className="w-4 h-4" />
                Source Videos:
              </span>
              <span className="font-mono text-sm">{sourceUrls.length}</span>
            </div>
            <div className="max-h-[100px] overflow-y-auto space-y-1 pl-5">
              {sourceUrls.map((url, i) => (
                <p key={i} className="font-mono text-xs truncate text-muted-foreground">
                  {url}
                </p>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Variations per video:</span>
              <span className="font-mono">{variations}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-foreground">Total jobs:</span>
              <span className="font-mono text-primary">{totalJobs}</span>
            </div>
          </div>
        </div>

        {/* No-edit notice */}
        <p className="text-xs text-muted-foreground text-center">
          No edits allowed. Go back to modify configuration.
        </p>

        {/* Error Display - Verbatim from backend */}
        {submitError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={onStartRendering} className="flex-1" disabled={isSubmitting}>
            <Play className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Submitting...' : `Start Rendering (${totalJobs} jobs)`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
