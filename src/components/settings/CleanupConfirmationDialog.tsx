import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CloudOff, Trash2, Loader2 } from 'lucide-react';
import { StorageCategoryStats, GoogleDriveStatus } from '@/types/storage';

interface CleanupConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategories: StorageCategoryStats[];
  googleDriveStatus: GoogleDriveStatus;
  onConfirm: () => void;
  isProcessing: boolean;
  progress: number;
}

export function CleanupConfirmationDialog({
  open,
  onOpenChange,
  selectedCategories,
  googleDriveStatus,
  onConfirm,
  isProcessing,
  progress,
}: CleanupConfirmationDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  const totalBytes = selectedCategories.reduce((sum, c) => sum + c.sizeBytes, 0);
  const totalFiles = selectedCategories.reduce((sum, c) => sum + c.fileCount, 0);
  
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasOutputs = selectedCategories.some(c => c.category === 'generated_outputs');
  const showGoogleDriveWarning = hasOutputs && !googleDriveStatus.isLinked;

  const handleClose = () => {
    if (!isProcessing) {
      setConfirmed(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Confirm Cleanup
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {isProcessing ? (
                <div className="space-y-3 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Cleaning up files...</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-center text-sm text-muted-foreground">
                    {progress}% complete
                  </p>
                </div>
              ) : (
                <>
                  <p>
                    You are about to permanently delete files from the following categories:
                  </p>

                  <div className="space-y-2">
                    {selectedCategories.map((cat) => (
                      <div 
                        key={cat.category}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted"
                      >
                        <span className="font-medium">{cat.label}</span>
                        <Badge variant="secondary">
                          {cat.fileCount} files • {cat.sizeFormatted}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Space to be freed: {formatBytes(totalBytes)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {totalFiles.toLocaleString()} files will be permanently deleted
                    </p>
                  </div>

                  {showGoogleDriveWarning && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <CloudOff className="h-4 w-4" />
                        Google Drive Not Linked
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Generated outputs have NOT been backed up. Deletion is permanent.
                      </p>
                    </div>
                  )}

                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox
                      id="confirm-cleanup"
                      checked={confirmed}
                      onCheckedChange={(checked) => setConfirmed(checked === true)}
                    />
                    <Label 
                      htmlFor="confirm-cleanup" 
                      className="text-sm leading-snug cursor-pointer"
                    >
                      I understand this action is <span className="font-semibold">permanent</span> and cannot be undone.
                    </Label>
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!isProcessing && (
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              disabled={!confirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {totalFiles} Files
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
