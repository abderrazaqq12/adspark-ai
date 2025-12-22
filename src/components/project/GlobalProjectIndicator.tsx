import { useState } from 'react';
import { useGlobalProject } from '@/contexts/GlobalProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FolderOpen, 
  Plus, 
  Loader2, 
  ChevronDown,
  FolderSync,
  ExternalLink,
  Check
} from 'lucide-react';

interface GlobalProjectIndicatorProps {
  className?: string;
}

/**
 * GlobalProjectIndicator - Displays active project in TopBar
 * 
 * Shows the current project name with a dropdown to switch or create projects.
 * Always visible in the TopBar for global project awareness.
 */
export function GlobalProjectIndicator({ className = '' }: GlobalProjectIndicatorProps) {
  const {
    activeProject,
    projects,
    isLoading,
    isCreating,
    selectProject,
    createProject,
    hasActiveProject,
  } = useGlobalProject();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    const project = await createProject(newProjectName.trim());
    if (project) {
      setNewProjectName('');
      setIsDialogOpen(false);
    }
  };

  const handleSelectProject = (projectId: string) => {
    selectProject(projectId);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-2 px-3 max-w-[200px]"
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            {hasActiveProject ? (
              <>
                <span className="truncate">{activeProject?.name}</span>
                {activeProject?.google_drive_folder_id && (
                  <FolderSync className="h-3 w-3 shrink-0 text-green-500" />
                )}
              </>
            ) : (
              <span className="text-muted-foreground">No project</span>
            )}
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 z-50 bg-popover">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Projects</span>
            {hasActiveProject && (
              <Badge variant="secondary" className="text-[10px] h-5">
                Active
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Project List */}
          <div className="max-h-[240px] overflow-y-auto">
            {projects.map((project) => (
              <DropdownMenuItem 
                key={project.id}
                onClick={() => handleSelectProject(project.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{project.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {project.google_drive_folder_id && (
                    <FolderSync className="h-3 w-3 text-green-500" />
                  )}
                  {activeProject?.id === project.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>

          {projects.length === 0 && (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              No projects yet
            </div>
          )}

          <DropdownMenuSeparator />
          
          {/* Create New */}
          <DropdownMenuItem 
            onClick={() => setIsDialogOpen(true)}
            className="text-primary cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create new project
          </DropdownMenuItem>

          {/* Open in Drive */}
          {activeProject?.google_drive_folder_link && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a 
                  href={activeProject.google_drive_folder_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Google Drive
                </a>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name for your new project. A Google Drive folder will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., Summer Campaign 2025"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject} 
              disabled={isCreating || !newProjectName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
