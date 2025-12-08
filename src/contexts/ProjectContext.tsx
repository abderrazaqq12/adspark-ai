import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductInfo {
  name: string;
  description: string;
  imageUrl: string;
  link: string;
}

export interface ProjectSettings {
  language: string;
  market: string;
  audienceAge: string;
  audienceGender: string;
}

interface ProjectContextType {
  // Project data
  projectId: string | null;
  scriptId: string | null;
  productInfo: ProductInfo;
  settings: ProjectSettings;
  isLoading: boolean;
  isSaving: boolean;
  
  // Actions
  setProjectId: (id: string | null) => void;
  setScriptId: (id: string | null) => void;
  setProductInfo: (info: ProductInfo | ((prev: ProductInfo) => ProductInfo)) => void;
  setSettings: (settings: ProjectSettings | ((prev: ProjectSettings) => ProjectSettings)) => void;
  createProject: () => Promise<string | null>;
  saveProject: () => Promise<boolean>;
  loadProject: (projectId: string) => Promise<void>;
  loadLatestProject: () => Promise<void>;
}

const defaultProductInfo: ProductInfo = {
  name: "",
  description: "",
  imageUrl: "",
  link: "",
};

const defaultSettings: ProjectSettings = {
  language: "en",
  market: "us",
  audienceAge: "25-34",
  audienceGender: "both",
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [productInfo, setProductInfo] = useState<ProductInfo>(defaultProductInfo);
  const [settings, setSettings] = useState<ProjectSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load latest project on mount - use empty deps to avoid infinite loops
  useEffect(() => {
    const init = async () => {
      try {
        await loadLatestProject();
      } catch (error) {
        console.error('Error initializing project context:', error);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLatestProject = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Try to load from user_settings first for product info
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userSettings?.preferences) {
        const prefs = userSettings.preferences as Record<string, any>;
        setProductInfo({
          name: prefs.studio_product_name || "",
          description: prefs.studio_description || "",
          imageUrl: prefs.studio_media_links?.split('\n')[0] || "",
          link: prefs.studio_product_url || "",
        });
        setSettings({
          language: prefs.studio_language || "en",
          market: prefs.studio_target_market || "us",
          audienceAge: prefs.studio_audience_age || "25-34",
          audienceGender: prefs.studio_audience_gender || "both",
        });
      }

      // Load latest project
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, product_name, language, market, settings')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (projects && projects.length > 0) {
        const project = projects[0];
        setProjectId(project.id);
        
        // Override with project-specific info if available
        if (project.product_name) {
          setProductInfo(prev => ({ ...prev, name: project.product_name || prev.name }));
        }
        if (project.settings) {
          const projectSettings = project.settings as Record<string, any>;
          if (projectSettings.product_description) {
            setProductInfo(prev => ({ ...prev, description: projectSettings.product_description }));
          }
          if (projectSettings.product_image_url) {
            setProductInfo(prev => ({ ...prev, imageUrl: projectSettings.product_image_url }));
          }
          if (projectSettings.product_link) {
            setProductInfo(prev => ({ ...prev, link: projectSettings.product_link }));
          }
        }
        if (project.language) {
          setSettings(prev => ({ ...prev, language: project.language }));
        }
        if (project.market) {
          setSettings(prev => ({ ...prev, market: project.market }));
        }

        // Load associated script
        const { data: scripts } = await supabase
          .from('scripts')
          .select('id')
          .eq('project_id', project.id)
          .limit(1);

        if (scripts && scripts.length > 0) {
          setScriptId(scripts[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProject = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!project) throw new Error('Project not found');

      setProjectId(project.id);
      
      if (project.product_name) {
        setProductInfo(prev => ({ ...prev, name: project.product_name || prev.name }));
      }
      
      const projectSettings = project.settings as Record<string, any> | null;
      if (projectSettings) {
        setProductInfo(prev => ({
          ...prev,
          description: projectSettings.product_description || prev.description,
          imageUrl: projectSettings.product_image_url || prev.imageUrl,
          link: projectSettings.product_link || prev.link,
        }));
      }
      
      if (project.language) {
        setSettings(prev => ({ ...prev, language: project.language }));
      }
      if (project.market) {
        setSettings(prev => ({ ...prev, market: project.market }));
      }

      // Load script
      const { data: scripts } = await supabase
        .from('scripts')
        .select('id')
        .eq('project_id', id)
        .limit(1);

      if (scripts && scripts.length > 0) {
        setScriptId(scripts[0].id);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (): Promise<string | null> => {
    if (!productInfo.name.trim()) {
      toast.error('Please enter a product name first');
      return null;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create a project');
        return null;
      }

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: productInfo.name,
          product_name: productInfo.name,
          language: settings.language,
          market: settings.market,
          audience: settings.audienceGender,
          status: 'draft',
          settings: {
            product_description: productInfo.description,
            product_image_url: productInfo.imageUrl,
            product_link: productInfo.link,
            audience_age: settings.audienceAge,
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      setProjectId(project.id);
      toast.success('Project created!');
      return project.id;
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Failed to create project');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [productInfo, settings]);

  const saveProject = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save');
        return false;
      }

      // Save to user_settings for persistence across sessions
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPrefs = (existingSettings?.preferences as Record<string, any>) || {};

      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          preferences: {
            ...currentPrefs,
            studio_product_name: productInfo.name,
            studio_product_url: productInfo.link,
            studio_description: productInfo.description,
            studio_media_links: productInfo.imageUrl,
            studio_target_market: settings.market,
            studio_language: settings.language,
            studio_audience_age: settings.audienceAge,
            studio_audience_gender: settings.audienceGender,
          }
        }, { onConflict: 'user_id' });

      // If we have a project, update it too
      if (projectId) {
        await supabase
          .from('projects')
          .update({
            name: productInfo.name,
            product_name: productInfo.name,
            language: settings.language,
            market: settings.market,
            audience: settings.audienceGender,
            settings: {
              product_description: productInfo.description,
              product_image_url: productInfo.imageUrl,
              product_link: productInfo.link,
              audience_age: settings.audienceAge,
            }
          })
          .eq('id', projectId);
      }

      return true;
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast.error(error.message || 'Failed to save');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, productInfo, settings]);

  const value: ProjectContextType = {
    projectId,
    scriptId,
    productInfo,
    settings,
    isLoading,
    isSaving,
    setProjectId,
    setScriptId,
    setProductInfo,
    setSettings,
    createProject,
    saveProject,
    loadProject,
    loadLatestProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
