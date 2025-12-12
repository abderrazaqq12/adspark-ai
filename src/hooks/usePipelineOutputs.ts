/**
 * Hook for managing 3-stage pipeline outputs with database persistence
 * Stage 1: Marketing Angles
 * Stage 2: Landing Page Text Content
 * Stage 3: Landing Page HTML
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Stage 1: Marketing Angles Output Structure
export interface MarketingAnglesOutput {
  problems: string[];
  desires: string[];
  objections: string[];
  emotional_triggers: string[];
  angles: Array<{
    angle_type: string;
    hook: string;
    promise: string;
    audience_focus: string;
  }>;
  generated_at: string;
  prompt_id?: string;
  prompt_hash?: string;
}

// Stage 2: Landing Page Text Output Structure
export interface LandingPageTextOutput {
  hero: {
    headline: string;
    subheadline: string;
  };
  benefits: string[];
  features: Array<{
    title: string;
    description: string;
  }>;
  usage_steps: string[];
  technical_details: string[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  reviews: Array<{
    name: string;
    rating: number;
    text: string;
  }>;
  generated_at: string;
  prompt_id?: string;
  prompt_hash?: string;
  marketing_angles_id?: string;
}

// Stage 3: Landing Page HTML Output
export interface LandingPageHtmlOutput {
  html: string;
  generated_at: string;
  prompt_id?: string;
  prompt_hash?: string;
  text_content_id?: string;
}

export function usePipelineOutputs() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get current project ID from user settings
  const getCurrentProjectId = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const prefs = settings?.preferences as Record<string, any>;
      return prefs?.current_project_id || null;
    } catch (err) {
      console.error('[PipelineOutputs] Error getting project ID:', err);
      return null;
    }
  }, []);

  // STAGE 1: Save Marketing Angles Output
  const saveMarketingAnglesOutput = useCallback(async (
    projectId: string,
    output: MarketingAnglesOutput
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          marketing_angles_output: output as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;

      console.log('[PipelineOutputs] Stage 1 saved:', { projectId, anglesCount: output.angles?.length });
      return true;
    } catch (err: any) {
      console.error('[PipelineOutputs] Stage 1 save error:', err);
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // STAGE 1: Get Marketing Angles Output
  const getMarketingAnglesOutput = useCallback(async (
    projectId: string
  ): Promise<MarketingAnglesOutput | null> => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('marketing_angles_output')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data?.marketing_angles_output as unknown as MarketingAnglesOutput | null;
    } catch (err) {
      console.error('[PipelineOutputs] Stage 1 get error:', err);
      return null;
    }
  }, []);

  // STAGE 2: Save Landing Page Text Output
  const saveLandingPageTextOutput = useCallback(async (
    projectId: string,
    output: LandingPageTextOutput
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          landing_page_text_output: output as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;

      console.log('[PipelineOutputs] Stage 2 saved:', { projectId });
      return true;
    } catch (err: any) {
      console.error('[PipelineOutputs] Stage 2 save error:', err);
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // STAGE 2: Get Landing Page Text Output
  const getLandingPageTextOutput = useCallback(async (
    projectId: string
  ): Promise<LandingPageTextOutput | null> => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('landing_page_text_output')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data?.landing_page_text_output as unknown as LandingPageTextOutput | null;
    } catch (err) {
      console.error('[PipelineOutputs] Stage 2 get error:', err);
      return null;
    }
  }, []);

  // STAGE 3: Save Landing Page HTML Output
  const saveLandingPageHtmlOutput = useCallback(async (
    projectId: string,
    html: string,
    metadata?: { prompt_id?: string; prompt_hash?: string; text_content_id?: string }
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          landing_page_html_output: html,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;

      console.log('[PipelineOutputs] Stage 3 saved:', { projectId, htmlLength: html.length });
      return true;
    } catch (err: any) {
      console.error('[PipelineOutputs] Stage 3 save error:', err);
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // STAGE 3: Get Landing Page HTML Output
  const getLandingPageHtmlOutput = useCallback(async (
    projectId: string
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('landing_page_html_output')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data?.landing_page_html_output;
    } catch (err) {
      console.error('[PipelineOutputs] Stage 3 get error:', err);
      return null;
    }
  }, []);

  // Get all pipeline outputs for a project
  const getAllPipelineOutputs = useCallback(async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('marketing_angles_output, landing_page_text_output, landing_page_html_output')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      return {
        marketingAngles: data?.marketing_angles_output as unknown as MarketingAnglesOutput | null,
        landingPageText: data?.landing_page_text_output as unknown as LandingPageTextOutput | null,
        landingPageHtml: data?.landing_page_html_output as string | null
      };
    } catch (err) {
      console.error('[PipelineOutputs] Get all error:', err);
      return { marketingAngles: null, landingPageText: null, landingPageHtml: null };
    }
  }, []);

  // Check if Stage 1 is complete
  const hasMarketingAngles = useCallback(async (projectId: string): Promise<boolean> => {
    const output = await getMarketingAnglesOutput(projectId);
    return !!(output && (output.problems?.length > 0 || output.angles?.length > 0));
  }, [getMarketingAnglesOutput]);

  // Check if Stage 2 is complete
  const hasLandingPageText = useCallback(async (projectId: string): Promise<boolean> => {
    const output = await getLandingPageTextOutput(projectId);
    return !!(output && output.hero?.headline);
  }, [getLandingPageTextOutput]);

  return {
    loading,
    getCurrentProjectId,
    // Stage 1
    saveMarketingAnglesOutput,
    getMarketingAnglesOutput,
    hasMarketingAngles,
    // Stage 2
    saveLandingPageTextOutput,
    getLandingPageTextOutput,
    hasLandingPageText,
    // Stage 3
    saveLandingPageHtmlOutput,
    getLandingPageHtmlOutput,
    // All
    getAllPipelineOutputs
  };
}
