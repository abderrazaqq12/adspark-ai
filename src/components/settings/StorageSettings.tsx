import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  HardDrive, RefreshCw, Trash2, Loader2, 
  CheckCircle, AlertTriangle, CloudOff, Cloud,
  Info
} from 'lucide-react';
import { useStorageStats } from '@/hooks/useStorageStats';
import { useStorageCleanup } from '@/hooks/useStorageCleanup';
import { StorageCategoryCard } from './StorageCategoryCard';
import { CleanupConfirmationDialog } from './CleanupConfirmationDialog';
import { StorageCategory } from '@/types/storage';
import { format } from 'date-fns';

export function StorageSettings() {
  const { stats, googleDriveStatus, refetch } = useStorageStats();
  const { executeCleanup, isProcessing, progress, lastResult } = useStorageCleanup();
  
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleToggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const selectedStats = stats.categories.filter(c => selectedCategories.has(c.category));
  const totalSelectedBytes = selectedStats.reduce((sum, c) => sum + c.sizeBytes, 0);

  const handleCleanup = async () => {
    const categories = Array.from(selectedCategories) as Exclude<StorageCategory, 'system'>[];
    await executeCleanup(categories);
    setShowConfirmDialog(false);
    setSelectedCategories(new Set());
    refetch();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <HardDrive className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Storage & Cleanup</h2>
            <p className="text-sm text-muted-foreground">
              Manage disk usage and safely free up space
            </p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm"
          onClick={refetch}
          disabled={stats.isLoading}
        >
          {stats.isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Storage Overview</CardTitle>
              <CardDescription>
                Last updated: {format(new Date(stats.lastUpdated), 'MMM d, yyyy HH:mm')}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold font-mono">{stats.totalUsedFormatted}</p>
              <p className="text-sm text-muted-foreground">Total Used</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {googleDriveStatus.isLinked ? (
                <Badge variant="outline" className="text-green-600 border-green-600/30">
                  <Cloud className="h-3 w-3 mr-1" />
                  Google Drive Linked
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-600/30">
                  <CloudOff className="h-3 w-3 mr-1" />
                  No Backup Configured
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Safe Cleanup Mode</AlertTitle>
        <AlertDescription>
          System files (code, dependencies, FFmpeg) are protected and cannot be deleted. 
          Only user-generated content can be cleaned up.
        </AlertDescription>
      </Alert>

      {/* Category Cards */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Storage Categories
        </h3>
        
        {stats.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stats.error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Storage Stats</AlertTitle>
            <AlertDescription>{stats.error}</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {stats.categories.map((category) => (
              <StorageCategoryCard
                key={category.category}
                stats={category}
                isSelected={selectedCategories.has(category.category)}
                onToggle={handleToggleCategory}
                disabled={isProcessing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      {selectedCategories.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {selectedCategories.size} {selectedCategories.size === 1 ? 'category' : 'categories'} selected
                </p>
                <p className="text-sm text-muted-foreground">
                  Estimated space to free: <span className="font-mono font-medium">{formatBytes(totalSelectedBytes)}</span>
                </p>
              </div>
              <Button 
                variant="destructive"
                onClick={() => setShowConfirmDialog(true)}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clean Up Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Cleanup Result */}
      {lastResult && (
        <Card className={lastResult.success ? 'border-green-500/30' : 'border-amber-500/30'}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {lastResult.success ? 'Cleanup Completed' : 'Cleanup Completed with Warnings'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {lastResult.filesDeleted} files deleted • {lastResult.bytesFreedFormatted} freed
                </p>
                {lastResult.errors.length > 0 && (
                  <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                    {lastResult.errors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {format(new Date(lastResult.timestamp), 'HH:mm:ss')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <CleanupConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        selectedCategories={selectedStats}
        googleDriveStatus={googleDriveStatus}
        onConfirm={handleCleanup}
        isProcessing={isProcessing}
        progress={progress}
      />
    </div>
  );
}
