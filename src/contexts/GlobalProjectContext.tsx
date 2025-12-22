import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// GLOBAL PROJECT CONTEXT SYSTEM
// Unified project management across all tools
// ============================================

export interface Project {
  id: string;
  name: string;
  product_name: string | null;
  google_drive_folder_id: string | null;
  google_drive_folder_link: string | null;
  language: string | null;
  market: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface GlobalProjectContextType {
  // Current active project
  activeProject: Project | null;
  
  // All user projects
  projects: Project[];
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  
  // Actions
  selectProject: (projectId: string) => Promise<void>;
  createProject: (name: string, autoCreateDriveFolder?: boolean) => Promise<Project | null>;
  refreshProjects: () => Promise<void>;
  clearActiveProject: () => void;
  
  // Drive integration
  createDriveFolderForProject: (projectId: string, folderName: string) => Promise<string | null>;
  
  // Validation
  hasActiveProject: boolean;
  isProjectReady: boolean;
}

const STORAGE_KEY = 'flowscale_active_project_id';

const GlobalProjectContext = createContext<GlobalProjectContextType | undefined>(undefined);

export function GlobalProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Load projects and restore active project on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        await loadProjects(user.id);
      } catch (error) {
        console.error('[GlobalProjectContext] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadProjects(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setActiveProject(null);
        setProjects([]);
        localStorage.removeItem(STORAGE_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, product_name, google_drive_folder_id, google_drive_folder_link, language, market, status, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projectList = (data || []) as Project[];
      setProjects(projectList);

      // Restore active project from localStorage
      const savedProjectId = localStorage.getItem(STORAGE_KEY);
      if (savedProjectId) {
        const savedProject = projectList.find(p => p.id === savedProjectId);
        if (savedProject) {
          setActiveProject(savedProject);
          return;
        }
      }

      // If no saved project, select the most recent one
      if (projectList.length > 0) {
        setActiveProject(projectList[0]);
        localStorage.setItem(STORAGE_KEY, projectList[0].id);
      }
    } catch (error) {
      console.error('[GlobalProjectContext] Load projects error:', error);
    }
  };

  const refreshProjects = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await loadProjects(user.id);
    }
  }, []);

  const selectProject = useCallback(async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setActiveProject(project);
      localStorage.setItem(STORAGE_KEY, projectId);
      console.log('[GlobalProjectContext] Project selected:', project.name);
    } else {
      // Fetch from database if not in local list
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, product_name, google_drive_folder_id, google_drive_folder_link, language, market, status, created_at, updated_at')
        .eq('id', projectId)
        .maybeSingle();

      if (!error && data) {
        setActiveProject(data as Project);
        localStorage.setItem(STORAGE_KEY, projectId);
        // Refresh projects list
        await refreshProjects();
      }
    }
  }, [projects, refreshProjects]);

  const createDriveFolderForProject = useCallback(async (projectId: string, folderName: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('create-google-drive-folder', {
        body: { folderName }
      });

      if (error) throw error;

      if (data?.folder_id) {
        // Update project with folder info
        await supabase
          .from('projects')
          .update({
            google_drive_folder_id: data.folder_id,
            google_drive_folder_link: data.folder_link
          })
          .eq('id', projectId);

        // Update local state
        setProjects(prev => prev.map(p => 
          p.id === projectId 
            ? { ...p, google_drive_folder_id: data.folder_id, google_drive_folder_link: data.folder_link }
            : p
        ));

        if (activeProject?.id === projectId) {
          setActiveProject(prev => prev ? {
            ...prev,
            google_drive_folder_id: data.folder_id,
            google_drive_folder_link: data.folder_link
          } : null);
        }

        return data.folder_id;
      }

      return null;
    } catch (error: any) {
      console.error('[GlobalProjectContext] Create Drive folder error:', error);
      // Don't show error toast - Drive integration is optional
      return null;
    }
  }, [activeProject]);

  const createProject = useCallback(async (name: string, autoCreateDriveFolder = true): Promise<Project | null> => {
    if (!name.trim()) {
      toast.error('Project name is required');
      return null;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create a project');
        return null;
      }

      // Create project in database
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: name.trim(),
          product_name: name.trim(),
          status: 'draft'
        })
        .select('id, name, product_name, google_drive_folder_id, google_drive_folder_link, language, market, status, created_at, updated_at')
        .single();

      if (error) throw error;

      const newProject = project as Project;

      // Try to create Google Drive folder (non-blocking)
      if (autoCreateDriveFolder) {
        const folderId = await createDriveFolderForProject(newProject.id, `FlowScale - ${name.trim()}`);
        if (folderId) {
          newProject.google_drive_folder_id = folderId;
          console.log('[GlobalProjectContext] Drive folder created:', folderId);
        }
      }

      // Update local state
      setProjects(prev => [newProject, ...prev]);
      setActiveProject(newProject);
      localStorage.setItem(STORAGE_KEY, newProject.id);

      toast.success(`Project "${name}" created!`);
      return newProject;
    } catch (error: any) {
      console.error('[GlobalProjectContext] Create project error:', error);
      toast.error(error.message || 'Failed to create project');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [createDriveFolderForProject]);

  const clearActiveProject = useCallback(() => {
    setActiveProject(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: GlobalProjectContextType = {
    activeProject,
    projects,
    isLoading,
    isCreating,
    selectProject,
    createProject,
    refreshProjects,
    clearActiveProject,
    createDriveFolderForProject,
    hasActiveProject: activeProject !== null,
    isProjectReady: activeProject !== null && !isLoading,
  };

  return (
    <GlobalProjectContext.Provider value={value}>
      {children}
    </GlobalProjectContext.Provider>
  );
}

export function useGlobalProject() {
  const context = useContext(GlobalProjectContext);
  if (context === undefined) {
    throw new Error('useGlobalProject must be used within a GlobalProjectProvider');
  }
  return context;
}
