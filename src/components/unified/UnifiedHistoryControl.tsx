/**
 * UnifiedHistoryControl - System-wide history management component
 * 
 * MASTER COMPONENT for all tools:
 * - Studio
 * - Creative Replicator
 * - Creative AI Editor
 * - AI Tools
 * 
 * Placement: Bottom-left of sidebar, below pipeline progress
 * All tools MUST use this component with identical placement.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RotateCcw, Trash2, Loader2, HardDrive, FileVideo, Image, FolderOpen } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { config } from '@/config';

export type ToolType = 'studio' | 'creative-replicator' | 'creative-ai-editor' | 'ai-tools';

interface CleanupOptions {
  deleteVideos: boolean;
  deleteImages: boolean;
  deleteOutputs: boolean;
  deleteOrphaned: boolean;
}

interface UnifiedHistoryControlProps {
  /** Tool identifier for scoped cleanup */
  tool: ToolType;
  /** Optional project ID for project-scoped cleanup */
  projectId?: string;
  /** Callback after history is cleared (for UI reset) */
  onHistoryCleared?: () => void;
  /** Show extended file cleanup options */
  showFileCleanup?: boolean;
  /** Variant for different placements */
  variant?: 'sidebar' | 'compact';
}

const getApiBaseUrl = (): string => {
  const vpsUrl = config.backend.restApiUrl;
  if (vpsUrl) return vpsUrl;
  if (config.deploymentTarget === 'local') {
    return 'http://localhost:3000/api';
  }
  return '/api';
};

export function UnifiedHistoryControl({ 
  tool, 
  projectId, 
  onHistoryCleared,
  showFileCleanup = true,
  variant = 'sidebar'
}: UnifiedHistoryControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [cleanupOptions, setCleanupOptions] = useState<CleanupOptions>({
    deleteVideos: false,
    deleteImages: false,
    deleteOutputs: false,
    deleteOrphaned: false
  });

  const apiBaseUrl = getApiBaseUrl();

  const toolDisplayNames: Record<ToolType, string> = {
    'studio': 'Studio',
    'creative-replicator': 'Creative Replicator',
    'creative-ai-editor': 'Creative AI Editor',
    'ai-tools': 'AI Tools'
  };

  const handleClearHistory = useCallback(async () => {
    setIsClearing(true);

    try {
      // 1. Clear history via backend
      const historyRes = await fetch(`${apiBaseUrl}/history`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          tool,
          scope: projectId ? 'project' : 'tool'
        })
      });

      if (!historyRes.ok) {
        throw new Error('Failed to clear history');
      }

      const historyData = await historyRes.json();
      console.log('[UnifiedHistoryControl] History cleared:', historyData);

      // 2. Clear files if requested
      const fileTypesToDelete = [];
      if (cleanupOptions.deleteVideos) fileTypesToDelete.push('video');
      if (cleanupOptions.deleteImages) fileTypesToDelete.push('image');
      if (cleanupOptions.deleteOutputs) fileTypesToDelete.push('output');

      if (fileTypesToDelete.length > 0 || cleanupOptions.deleteOrphaned) {
        const filesRes = await fetch(`${apiBaseUrl}/files`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            fileTypes: fileTypesToDelete.length > 0 ? fileTypesToDelete : undefined,
            scope: cleanupOptions.deleteOrphaned ? 'orphaned' : undefined
          })
        });

        if (filesRes.ok) {
          const filesData = await filesRes.json();
          console.log('[UnifiedHistoryControl] Files deleted:', filesData);
        }
      }

      // 3. Clear pipeline state
      await fetch(`${apiBaseUrl}/pipeline`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      });

      // 4. Notify parent for UI reset
      onHistoryCleared?.();

      toast.success('History cleared successfully', {
        description: `Cleared ${historyData.deleted?.jobs || 0} jobs and ${historyData.deleted?.tempFiles || 0} temp files`
      });

      setIsOpen(false);
      setCleanupOptions({
        deleteVideos: false,
        deleteImages: false,
        deleteOutputs: false,
        deleteOrphaned: false
      });

    } catch (error) {
      console.error('[UnifiedHistoryControl] Clear failed:', error);
      toast.error('Failed to clear history', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsClearing(false);
    }
  }, [apiBaseUrl, projectId, tool, cleanupOptions, onHistoryCleared]);

  if (variant === 'compact') {
    return (
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <ClearHistoryDialogContent
          tool={tool}
          toolName={toolDisplayNames[tool]}
          showFileCleanup={showFileCleanup}
          cleanupOptions={cleanupOptions}
          setCleanupOptions={setCleanupOptions}
          isClearing={isClearing}
          onConfirm={handleClearHistory}
        />
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear History
        </Button>
      </AlertDialogTrigger>
      <ClearHistoryDialogContent
        tool={tool}
        toolName={toolDisplayNames[tool]}
        showFileCleanup={showFileCleanup}
        cleanupOptions={cleanupOptions}
        setCleanupOptions={setCleanupOptions}
        isClearing={isClearing}
        onConfirm={handleClearHistory}
      />
    </AlertDialog>
  );
}

interface ClearHistoryDialogContentProps {
  tool: ToolType;
  toolName: string;
  showFileCleanup: boolean;
  cleanupOptions: CleanupOptions;
  setCleanupOptions: (options: CleanupOptions) => void;
  isClearing: boolean;
  onConfirm: () => void;
}

function ClearHistoryDialogContent({
  tool,
  toolName,
  showFileCleanup,
  cleanupOptions,
  setCleanupOptions,
  isClearing,
  onConfirm
}: ClearHistoryDialogContentProps) {
  return (
    <AlertDialogContent className="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-destructive" />
          Clear {toolName} Session?
        </AlertDialogTitle>
        <AlertDialogDescription className="space-y-3">
          <p>This will reset the entire pipeline and clear:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Execution history and logs</li>
            <li>Pipeline state and queued jobs</li>
            <li>Analysis results and plans</li>
            <li>Generated results (in-progress)</li>
          </ul>
          <p className="font-medium text-foreground">
            This will NOT affect your account, other projects, or saved exports.
          </p>
        </AlertDialogDescription>
      </AlertDialogHeader>

      {showFileCleanup && (
        <div className="space-y-3 py-3 border-t border-border">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Also delete files (optional):
          </p>
          <div className="space-y-2 pl-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={cleanupOptions.deleteVideos}
                onCheckedChange={(checked) => 
                  setCleanupOptions({ ...cleanupOptions, deleteVideos: !!checked })
                }
              />
              <FileVideo className="w-4 h-4 text-muted-foreground" />
              Uploaded videos
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={cleanupOptions.deleteImages}
                onCheckedChange={(checked) => 
                  setCleanupOptions({ ...cleanupOptions, deleteImages: !!checked })
                }
              />
              <Image className="w-4 h-4 text-muted-foreground" />
              Uploaded images
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={cleanupOptions.deleteOutputs}
                onCheckedChange={(checked) => 
                  setCleanupOptions({ ...cleanupOptions, deleteOutputs: !!checked })
                }
              />
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              Generated outputs
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={cleanupOptions.deleteOrphaned}
                onCheckedChange={(checked) => 
                  setCleanupOptions({ ...cleanupOptions, deleteOrphaned: !!checked })
                }
              />
              <Trash2 className="w-4 h-4 text-muted-foreground" />
              Orphaned temp files
            </label>
          </div>
        </div>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
        <AlertDialogAction 
          onClick={onConfirm}
          disabled={isClearing}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isClearing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Clearing...
            </>
          ) : (
            'Clear Session'
          )}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
