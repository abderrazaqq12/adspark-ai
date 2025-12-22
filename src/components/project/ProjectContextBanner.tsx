import { useGlobalProject } from '@/contexts/GlobalProjectContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FolderOpen, 
  AlertTriangle, 
  ExternalLink,
  FolderSync,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';

interface ProjectContextBannerProps {
  toolName?: string;
  className?: string;
}

export function ProjectContextBanner({ 
  toolName = 'this tool',
  className = '' 
}: ProjectContextBannerProps) {
  const { 
    activeProject, 
    projects, 
    hasActiveProject,
    selectProject,
    createProject,
    isCreating
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

  // No project selected - show warning
  if (!hasActiveProject) {
    return (
      <Alert variant="destructive" className={`border-yellow-500 bg-yellow-500/10 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-yellow-700 dark:text-yellow-400">
            Select or create a project to use {toolName}. All generated assets will be saved to your project.
          </span>
          <div className="flex items-center gap-2 ml-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  Select Project
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {projects.map((project) => (
                  <DropdownMenuItem 
                    key={project.id} 
                    onClick={() => selectProject(project.id)}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {project.name}
                  </DropdownMenuItem>
                ))}
                {projects.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create new project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </AlertDescription>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Enter a name for your new project.
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
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Alert>
    );
  }

  // Project selected - show active project banner
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border bg-card ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <span className="font-medium">{activeProject?.name}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {activeProject?.google_drive_folder_id ? (
            <Badge variant="secondary" className="text-xs">
              <FolderSync className="mr-1 h-3 w-3 text-green-500" />
              Drive Synced
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              No Drive folder
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeProject?.google_drive_folder_link && (
          <Button variant="ghost" size="sm" asChild>
            <a 
              href={activeProject.google_drive_folder_link} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Open Drive
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Switch
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {projects.map((project) => (
              <DropdownMenuItem 
                key={project.id} 
                onClick={() => selectProject(project.id)}
                className={project.id === activeProject?.id ? 'bg-muted' : ''}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {project.name}
                {project.id === activeProject?.id && (
                  <Badge variant="secondary" className="ml-2 text-xs">Active</Badge>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create new project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Enter a name for your new project.
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
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
