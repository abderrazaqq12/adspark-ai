/**
 * Drive Sync Status Indicator
 * Shows upload progress for assets being synced to Google Drive
 */

import { useGlobalProject } from '@/contexts/GlobalProjectContext';
import { Badge } from '@/components/ui/badge';
import { 
  Cloud, 
  CloudOff, 
  Loader2, 
  CheckCircle2,
  XCircle 
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DriveSyncIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function DriveSyncIndicator({ className, showLabel = true }: DriveSyncIndicatorProps) {
  const { activeProject, activeUploads, isUploading, uploadCount } = useGlobalProject();

  // No project selected
  if (!activeProject) {
    return null;
  }

  // No Drive folder configured
  if (!activeProject.google_drive_folder_id) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "border-muted text-muted-foreground gap-1.5 cursor-default",
                className
              )}
            >
              <CloudOff className="w-3.5 h-3.5" />
              {showLabel && <span>No Drive</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>No Google Drive folder linked to this project</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Uploading in progress
  if (isUploading) {
    const uploadingCount = activeUploads.filter(u => u.status === 'uploading').length;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "border-primary/30 text-primary bg-primary/5 gap-1.5 cursor-default animate-pulse",
                className
              )}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {showLabel && (
                <span>
                  Syncing {uploadingCount > 1 ? `(${uploadingCount})` : ''}
                </span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">Uploading to Google Drive...</p>
              {activeUploads.filter(u => u.status === 'uploading').slice(0, 3).map(upload => (
                <p key={upload.id} className="text-xs text-muted-foreground">
                  {upload.assetType}: {upload.fileName}
                </p>
              ))}
              {uploadingCount > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{uploadingCount - 3} more...
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Check for recent failures
  const recentFailures = activeUploads.filter(u => u.status === 'failed');
  if (recentFailures.length > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "border-destructive/30 text-destructive bg-destructive/5 gap-1.5 cursor-default",
                className
              )}
            >
              <XCircle className="w-3.5 h-3.5" />
              {showLabel && <span>Sync Failed</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{recentFailures.length} upload(s) failed</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Check for recent completions (within last 5 seconds)
  const recentCompletions = activeUploads.filter(
    u => u.status === 'completed' && Date.now() - u.startedAt < 5000
  );
  
  if (recentCompletions.length > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "border-green-500/30 text-green-600 bg-green-500/5 gap-1.5 cursor-default",
                className
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {showLabel && <span>Synced</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Assets synced to Google Drive</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default: Drive connected, idle
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "border-primary/20 text-primary/70 gap-1.5 cursor-default",
              className
            )}
          >
            <Cloud className="w-3.5 h-3.5" />
            {showLabel && <span>Drive</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Connected to Google Drive</p>
          <p className="text-xs text-muted-foreground">
            Assets auto-sync when generated
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}