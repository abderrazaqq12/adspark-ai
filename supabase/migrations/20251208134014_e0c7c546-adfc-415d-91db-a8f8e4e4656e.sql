
-- AI Learnings table for the AI Brain memory system
CREATE TABLE public.ai_learnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  learning_type TEXT NOT NULL, -- 'engine_preference', 'prompt_evolution', 'quality_pattern', 'cost_optimization'
  context JSONB NOT NULL DEFAULT '{}', -- product_type, market, language, audience
  insight JSONB NOT NULL DEFAULT '{}', -- learned patterns
  confidence_score NUMERIC DEFAULT 0.5,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cost transactions for real-time cost tracking
CREATE TABLE public.cost_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  pipeline_stage TEXT NOT NULL, -- 'product_content', 'image_gen', 'landing_page', 'voiceover', 'scene_builder', 'video_gen', 'assembly'
  engine_name TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- 'text_generation', 'image_generation', 'video_generation', 'audio_generation'
  tokens_used INTEGER,
  duration_sec NUMERIC,
  cost_usd NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pipeline jobs for better async job tracking
CREATE TABLE public.pipeline_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL, -- 0-8
  stage_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  progress INTEGER DEFAULT 0, -- 0-100
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  n8n_execution_id TEXT, -- Track n8n workflow execution
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Video variations for the variety engine
CREATE TABLE public.video_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  variation_number INTEGER NOT NULL,
  variation_config JSONB NOT NULL DEFAULT '{}', -- hook_style, pacing, engine, music, transitions
  scenes_config JSONB DEFAULT '[]', -- Array of scene variations
  status TEXT DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  video_url TEXT,
  thumbnail_url TEXT,
  duration_sec NUMERIC,
  quality_score NUMERIC,
  cost_usd NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.ai_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_variations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_learnings
CREATE POLICY "Users can view own learnings" ON public.ai_learnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own learnings" ON public.ai_learnings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own learnings" ON public.ai_learnings FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for cost_transactions
CREATE POLICY "Users can view own cost transactions" ON public.cost_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cost transactions" ON public.cost_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for pipeline_jobs
CREATE POLICY "Users can view own pipeline jobs" ON public.pipeline_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pipeline jobs" ON public.pipeline_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pipeline jobs" ON public.pipeline_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pipeline jobs" ON public.pipeline_jobs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for video_variations
CREATE POLICY "Users can view own video variations" ON public.video_variations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own video variations" ON public.video_variations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own video variations" ON public.video_variations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own video variations" ON public.video_variations FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for pipeline_jobs and cost_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cost_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_variations;

-- Triggers for updated_at
CREATE TRIGGER update_ai_learnings_updated_at BEFORE UPDATE ON public.ai_learnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pipeline_jobs_updated_at BEFORE UPDATE ON public.pipeline_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_video_variations_updated_at BEFORE UPDATE ON public.video_variations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
