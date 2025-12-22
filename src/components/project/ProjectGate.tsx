import { ReactNode, useState } from 'react';
import { useGlobalProject } from '@/contexts/GlobalProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen, Plus, Loader2, AlertCircle, FolderSync } from 'lucide-react';

interface ProjectGateProps {
  children: ReactNode;
  /** Pages that don't require a project (dashboard, settings, etc.) */
  bypass?: boolean;
}

/**
 * ProjectGate - Blocks tool access until a project is selected
 * 
 * Wraps content and shows a project selection screen when no project is active.
 * All tools must have an active project context to function.
 */
export function ProjectGate({ children, bypass = false }: ProjectGateProps) {
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

  // Bypass mode - allow access without project
  if (bypass) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Project selected - render children
  if (hasActiveProject) {
    return <>{children}</>;
  }

  // No project selected - show gate UI
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

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Select a Project
            </h2>
            <p className="text-muted-foreground mt-1">
              All tools require an active project context. Select or create a project to continue.
            </p>
          </div>
        </div>

        {/* Alert */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-600 dark:text-yellow-400">Project Required</p>
            <p className="text-muted-foreground mt-1">
              All generated content, files, and logs will be organized within your project.
            </p>
          </div>
        </div>

        {/* Project Selection */}
        {projects.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Select existing project
            </label>
            <Select onValueChange={handleSelectProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{project.name}</span>
                      {project.google_drive_folder_id && (
                        <FolderSync className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Divider */}
        {projects.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* Create New Project */}
        <Button 
          onClick={() => setIsDialogOpen(true)} 
          className="w-full"
          variant={projects.length > 0 ? "outline" : "default"}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Project
        </Button>

        {/* Create Project Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Enter a name for your new project. A Google Drive folder will be created automatically to organize all your assets.
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
    </div>
  );
}
