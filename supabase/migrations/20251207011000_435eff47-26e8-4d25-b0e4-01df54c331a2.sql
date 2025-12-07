-- Add pipeline_status column to projects table for tracking stage status
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pipeline_status JSONB DEFAULT '{"product_info": "pending", "scripts": "pending", "scenes": "pending", "video_generation": "pending", "assembly": "pending", "export": "pending"}'::jsonb;

-- Add use_n8n_backend column to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS use_n8n_backend BOOLEAN DEFAULT false;

-- Add ai_operator_enabled column to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS ai_operator_enabled BOOLEAN DEFAULT false;

-- Add n8n_webhook_url to user_settings preferences if not exists (handled via jsonb)

-- Create operator_jobs table for AI Operator tracking
CREATE TABLE IF NOT EXISTS public.operator_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- 'retry_scene', 'switch_engine', 'quality_check', 'optimize_cost', 'generate_variations'
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.operator_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for operator_jobs
CREATE POLICY "Users can view own operator jobs" ON public.operator_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own operator jobs" ON public.operator_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own operator jobs" ON public.operator_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own operator jobs" ON public.operator_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Add visual_prompt generation support to scenes
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS requires_visual_prompt BOOLEAN DEFAULT true;
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS quality_score NUMERIC DEFAULT NULL;
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add realtime for operator_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.operator_jobs;