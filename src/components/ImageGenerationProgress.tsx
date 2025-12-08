import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, ImageIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGenerationProgressProps {
  totalImages: number;
  completedImages: number;
  failedImages: number;
  isGenerating: boolean;
  startTime?: number;
}

export const ImageGenerationProgress = ({
  totalImages,
  completedImages,
  failedImages,
  isGenerating,
  startTime,
}: ImageGenerationProgressProps) => {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('Calculating...');
  const [elapsedTime, setElapsedTime] = useState<string>('0s');

  const progressPercentage = totalImages > 0 
    ? Math.round(((completedImages + failedImages) / totalImages) * 100) 
    : 0;

  useEffect(() => {
    if (!isGenerating || !startTime) {
      setEstimatedTimeRemaining('--');
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const elapsedSeconds = Math.floor(elapsed / 1000);
      
      // Format elapsed time
      if (elapsedSeconds < 60) {
        setElapsedTime(`${elapsedSeconds}s`);
      } else {
        const mins = Math.floor(elapsedSeconds / 60);
        const secs = elapsedSeconds % 60;
        setElapsedTime(`${mins}m ${secs}s`);
      }

      // Calculate estimated time remaining
      const processed = completedImages + failedImages;
      if (processed > 0) {
        const avgTimePerImage = elapsed / processed;
        const remaining = totalImages - processed;
        const remainingMs = avgTimePerImage * remaining;
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        if (remainingSeconds < 60) {
          setEstimatedTimeRemaining(`~${remainingSeconds}s`);
        } else {
          const mins = Math.floor(remainingSeconds / 60);
          const secs = remainingSeconds % 60;
          setEstimatedTimeRemaining(`~${mins}m ${secs}s`);
        }
      } else {
        // Estimate based on average of 5-10 seconds per image
        const estimatedSeconds = (totalImages - processed) * 8;
        if (estimatedSeconds < 60) {
          setEstimatedTimeRemaining(`~${estimatedSeconds}s`);
        } else {
          const mins = Math.floor(estimatedSeconds / 60);
          setEstimatedTimeRemaining(`~${mins}m`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating, startTime, completedImages, failedImages, totalImages]);

  if (!isGenerating && totalImages === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : progressPercentage === 100 ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm text-foreground">
            {isGenerating ? 'Generating Images...' : progressPercentage === 100 ? 'Generation Complete' : 'Generation Paused'}
          </span>
        </div>
        <span className="text-sm font-mono text-muted-foreground">
          {completedImages + failedImages}/{totalImages}
        </span>
      </div>

      <Progress value={progressPercentage} className="h-2" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            {completedImages} completed
          </span>
          {failedImages > 0 && (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              {failedImages} failed
            </span>
          )}
        </div>
        {isGenerating && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {elapsedTime}
            </span>
            <span className="text-primary">{estimatedTimeRemaining} remaining</span>
          </div>
        )}
      </div>
    </div>
  );
};
