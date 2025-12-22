import { useState } from 'react';
import { useGlobalProject } from '@/contexts/GlobalProjectContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FolderOpen, 
  Plus, 
  Loader2, 
  ExternalLink,
  FolderSync
} from 'lucide-react';

interface ProjectSelectorProps {
  className?: string;
  showDriveLink?: boolean;
  variant?: 'default' | 'compact';
}

export function ProjectSelector({ 
  className = '', 
  showDriveLink = true,
  variant = 'default' 
}: ProjectSelectorProps) {
  const { 
    activeProject, 
    projects, 
    isLoading, 
    isCreating,
    selectProject, 
    createProject,
    hasActiveProject 
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

  const handleSelectChange = (value: string) => {
    if (value === 'create-new') {
      setIsDialogOpen(true);
    } else {
      selectProject(value);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading projects...</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <Select 
          value={activeProject?.id || ''} 
          onValueChange={handleSelectChange}
        >
          <SelectTrigger className="h-8 w-[180px] text-sm">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[140px]">{project.name}</span>
                  {project.google_drive_folder_id && (
                    <FolderSync className="h-3 w-3 text-green-500" />
                  )}
                </div>
              </SelectItem>
            ))}
            <SelectItem value="create-new" className="text-primary">
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3" />
                Create new project
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

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
                placeholder="Project name"
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
              <Button onClick={handleCreateProject} disabled={isCreating || !newProjectName.trim()}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Project Selector Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <span className="font-medium">Active Project</span>
        </div>
        {!hasActiveProject && (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            Required
          </Badge>
        )}
      </div>

      {/* Selector */}
      <div className="flex items-center gap-2">
        <Select 
          value={activeProject?.id || ''} 
          onValueChange={handleSelectChange}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select or create a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.length > 0 && (
              <>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{project.name}</span>
                      {project.google_drive_folder_id && (
                        <Badge variant="secondary" className="text-xs h-5">
                          <FolderSync className="h-3 w-3 mr-1" />
                          Synced
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
            <SelectItem value="create-new" className="text-primary font-medium">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create new project
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Project Info */}
      {activeProject && showDriveLink && (
        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            {activeProject.google_drive_folder_id ? (
              <>
                <FolderSync className="h-4 w-4 text-green-500" />
                <span>Drive folder synced</span>
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4" />
                <span>No Drive folder linked</span>
              </>
            )}
          </div>
          {activeProject.google_drive_folder_link && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              asChild
            >
              <a 
                href={activeProject.google_drive_folder_link} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Open in Drive
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name for your new project. A Google Drive folder will be created automatically to store all generated assets.
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

      {/* Warning when no project selected */}
      {!hasActiveProject && projects.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Create your first project to start generating content. All assets will be organized in your project's Google Drive folder.
        </p>
      )}
    </div>
  );
}
