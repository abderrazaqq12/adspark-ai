-- ==========================================
-- MASTER SCHEMA FOR CREATIVE REPLICATOR V2
-- ==========================================

-- 1. Profiles (Extends Auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  credits INTEGER DEFAULT 100,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. AI Engines Registry
CREATE TABLE public.ai_engines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('avatar', 'text_to_video', 'image_to_video', 'template_based', 'voice')),
  supports_free_tier BOOLEAN DEFAULT false,
  pricing_model TEXT CHECK (pricing_model IN ('free', 'free_tier', 'pay_per_use', 'subscription')),
  max_duration_sec INTEGER DEFAULT 60,
  supported_ratios TEXT[] DEFAULT ARRAY['16:9', '9:16', '1:1'],
  api_base_url TEXT,
  api_key_env TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'coming_soon')),
  description TEXT,
  priority_score INTEGER DEFAULT 50,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_name TEXT,
  language TEXT DEFAULT 'en',
  output_count INTEGER DEFAULT 10,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Scripts
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  raw_text TEXT NOT NULL,
  hooks TEXT[],
  tone TEXT,
  style TEXT,
  status TEXT DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Scenes
CREATE TABLE public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  index INTEGER NOT NULL,
  text TEXT NOT NULL,
  scene_type TEXT CHECK (scene_type IN ('hook', 'problem', 'agitation', 'solution', 'social_proof', 'cta', 'broll', 'avatar', 'product', 'testimonial', 'transition', 'usp', 'benefits', 'before_after', 'content')), 
  visual_prompt TEXT,
  engine_id UUID REFERENCES public.ai_engines(id),
  engine_name TEXT,
  duration_sec INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  video_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Pipeline Jobs (WITH JSONB FIX)
CREATE TABLE public.pipeline_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL DEFAULT 0,
  stage_name TEXT NOT NULL DEFAULT 'queued',
  status TEXT NOT NULL DEFAULT 'pending',
  progress JSONB DEFAULT '{}', -- FIXED: Using JSONB instead of INTEGER
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  n8n_execution_id TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Video Variations
CREATE TABLE public.video_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  variation_number INTEGER NOT NULL,
  variation_config JSONB NOT NULL DEFAULT '{}',
  scenes_config JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  video_url TEXT,
  thumbnail_url TEXT,
  duration_sec NUMERIC,
  quality_score NUMERIC,
  cost_usd NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Other Tables (Settings, Uploads, Queue, Outputs, Learnings, Cost)
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  default_language TEXT DEFAULT 'en',
  default_voice TEXT,
  use_free_tier_only BOOLEAN DEFAULT false,
  api_keys JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT CHECK (file_type IN ('image', 'video', 'audio', 'document')),
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE,
  engine_id UUID REFERENCES public.ai_engines(id),
  priority INTEGER DEFAULT 50,
  status TEXT DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.video_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  final_video_url TEXT,
  format TEXT DEFAULT 'mp4',
  duration_sec INTEGER,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ai_learnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  learning_type TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',
  insight JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0.5,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  language TEXT DEFAULT 'en',
  category TEXT DEFAULT 'script',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.cost_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  pipeline_stage TEXT NOT NULL,
  engine_name TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  cost_usd NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_transactions ENABLE ROW LEVEL SECURITY;

-- Standard User Policies
CREATE POLICY "View Own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Update Own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert Own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects
CREATE POLICY "View Own Projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert Own Projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update Own Projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete Own Projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Pipeline Jobs
CREATE POLICY "View Own Jobs" ON public.pipeline_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert Own Jobs" ON public.pipeline_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update Own Jobs" ON public.pipeline_jobs FOR UPDATE USING (auth.uid() = user_id);

-- Video Variations
CREATE POLICY "View Own Variations" ON public.video_variations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert Own Variations" ON public.video_variations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update Own Variations" ON public.video_variations FOR UPDATE USING (auth.uid() = user_id);

-- AI Engines (Public Read)
CREATE POLICY "Public Active Engines" ON public.ai_engines FOR SELECT USING (status = 'active');

-- ==========================================
-- REALTIME PUBLICATION
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_variations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenes;

-- ==========================================
-- INDEXES & TRIGGERS
-- ==========================================
CREATE INDEX idx_pipeline_jobs_progress ON public.pipeline_jobs USING gin (progress);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- SEED DATA (Engines)
-- ==========================================
INSERT INTO public.ai_engines (name, type, description, pricing_model, supports_free_tier, max_duration_sec, supported_ratios, api_base_url, api_key_env, priority_score, status, config) VALUES
('ffmpeg.wasm', 'template_based', 'Client-side Browser FFmpeg', 'free', true, 60, ARRAY['16:9', '9:16', '1:1'], NULL, NULL, 100, 'active', '{"specialty": "trim_merge", "location": "browser"}'),
('Runway Gen-3', 'text_to_video', 'High-quality cinematic video', 'pay_per_use', false, 16, ARRAY['16:9', '9:16', '1:1'], 'https://api.runwayml.com', 'RUNWAY_API_KEY', 95, 'active', '{"specialty": "cinematic"}'),
('Pika Labs', 'text_to_video', 'Creative video generation', 'free_tier', true, 4, ARRAY['16:9', '9:16', '1:1'], 'https://api.pika.art', 'PIKA_API_KEY', 85, 'active', '{"specialty": "animated"}'),
('Fal AI', 'image_to_video', 'Fast image-to-video', 'pay_per_use', false, 5, ARRAY['16:9', '9:16', '1:1'], 'https://api.fal.ai', 'FAL_API_KEY', 80, 'active', '{"specialty": "fast_effect"}');
