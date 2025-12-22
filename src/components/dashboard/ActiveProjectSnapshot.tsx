/**
 * Active Project Snapshot - SECTION 2
 * Shows current project context with basic info
 * READ-ONLY - No actions
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FolderOpen, 
  ExternalLink,
  Clock,
  Hash,
  AlertTriangle
} from 'lucide-react';
import { useGlobalProject } from '@/contexts/GlobalProjectContext';
import { formatDistanceToNow } from 'date-fns';

export function ActiveProjectSnapshot() {
  const { activeProject, hasActiveProject, isLoading } = useGlobalProject();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-6 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-32 bg-muted/60 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!hasActiveProject || !activeProject) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No active project selected</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Select a project from the top bar to see details here
          </p>
        </CardContent>
      </Card>
    );
  }

  const shortId = activeProject.id.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Active Project
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {activeProject.status || 'draft'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Name */}
        <div>
          <p className="text-xl font-semibold text-foreground">{activeProject.name}</p>
          {activeProject.product_name && activeProject.product_name !== activeProject.name && (
            <p className="text-sm text-muted-foreground mt-0.5">{activeProject.product_name}</p>
          )}
        </div>

        {/* Project Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Project ID */}
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Hash className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wide">Project ID</span>
            </div>
            <p className="text-xs font-mono text-foreground">{shortId}...</p>
          </div>

          {/* Last Activity */}
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wide">Last Activity</span>
            </div>
            <p className="text-xs text-foreground">
              {activeProject.updated_at 
                ? formatDistanceToNow(new Date(activeProject.updated_at), { addSuffix: true })
                : 'Unknown'
              }
            </p>
          </div>
        </div>

        {/* Google Drive Link */}
        {activeProject.google_drive_folder_link ? (
          <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img 
                  src="https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png" 
                  alt="Google Drive" 
                  className="w-4 h-4"
                />
                <span className="text-xs text-blue-600 dark:text-blue-400">Google Drive Folder</span>
              </div>
              <a 
                href={activeProject.google_drive_folder_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Outputs will NOT be saved
                </p>
                <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                  Google Drive is not linked. Generated files cannot be stored permanently.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Market/Language Info */}
        {(activeProject.language || activeProject.market) && (
          <div className="flex items-center gap-2">
            {activeProject.language && (
              <Badge variant="secondary" className="text-[10px]">
                {activeProject.language.toUpperCase()}
              </Badge>
            )}
            {activeProject.market && (
              <Badge variant="outline" className="text-[10px]">
                {activeProject.market}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}