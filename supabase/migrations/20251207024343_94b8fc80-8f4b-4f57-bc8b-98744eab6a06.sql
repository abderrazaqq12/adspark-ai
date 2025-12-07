-- Add new tables for enterprise features

-- AI Failures tracking table
CREATE TABLE public.ai_failures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  project_id uuid REFERENCES public.projects(id),
  scene_id uuid REFERENCES public.scenes(id),
  engine_name text NOT NULL,
  error_code text,
  error_message text,
  retry_count integer DEFAULT 0,
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  fallback_engine text,
  created_at timestamp with time zone DEFAULT now()
);

-- AI Costs tracking table
CREATE TABLE public.ai_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  project_id uuid REFERENCES public.projects(id),
  engine_name text NOT NULL,
  operation_type text NOT NULL, -- 'script', 'scene', 'voiceover', 'image', 'assembly'
  cost_usd numeric(10,6) DEFAULT 0,
  tokens_used integer,
  duration_sec numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- Analytics events table
CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  project_id uuid REFERENCES public.projects(id),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Localization profiles table
CREATE TABLE public.localization_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  language text NOT NULL DEFAULT 'en', -- 'ar', 'en', 'es', 'fr', 'de', 'pt'
  market text NOT NULL DEFAULT 'us', -- 'sa', 'ae', 'kw', 'ma', 'eu', 'us', 'latam'
  audience text NOT NULL DEFAULT 'both', -- 'men', 'women', 'both', 'kids', 'elderly', etc.
  persona text,
  cultural_settings jsonb DEFAULT '{}'::jsonb,
  cta_style text,
  hook_style text,
  voice_profile text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Landing pages table
CREATE TABLE public.landing_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id),
  user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  hero_content jsonb DEFAULT '{}'::jsonb,
  features_content jsonb DEFAULT '[]'::jsonb,
  social_proof jsonb DEFAULT '[]'::jsonb,
  cta_content jsonb DEFAULT '{}'::jsonb,
  faq_content jsonb DEFAULT '[]'::jsonb,
  guarantee_content jsonb DEFAULT '{}'::jsonb,
  html_output text,
  language text DEFAULT 'en',
  market text DEFAULT 'us',
  status text DEFAULT 'draft',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Generated images table
CREATE TABLE public.generated_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id),
  user_id uuid REFERENCES auth.users(id),
  image_type text NOT NULL, -- 'amazon_style', 'before_after', 'lifestyle', 'packaging', 'thumbnail', 'hero'
  prompt text,
  engine_name text DEFAULT 'nano_banana',
  image_url text,
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Marketing content table (hooks, angles, offers)
CREATE TABLE public.marketing_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id),
  user_id uuid REFERENCES auth.users(id),
  content_type text NOT NULL, -- 'hook', 'angle', 'offer', 'description', 'cta'
  content_text text NOT NULL,
  language text DEFAULT 'en',
  market text DEFAULT 'us',
  audience text DEFAULT 'both',
  score numeric(3,1), -- AI quality score 0-10
  is_winning boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Batch jobs table for agency mode
CREATE TABLE public.batch_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  job_name text NOT NULL,
  total_products integer DEFAULT 0,
  total_videos integer DEFAULT 0,
  completed_videos integer DEFAULT 0,
  failed_videos integer DEFAULT 0,
  status text DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'paused'
  settings jsonb DEFAULT '{}'::jsonb,
  products_data jsonb DEFAULT '[]'::jsonb,
  progress jsonb DEFAULT '{}'::jsonb,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.ai_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.localization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_failures
CREATE POLICY "Users can view own failures" ON public.ai_failures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own failures" ON public.ai_failures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own failures" ON public.ai_failures FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ai_costs
CREATE POLICY "Users can view own costs" ON public.ai_costs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own costs" ON public.ai_costs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for analytics_events
CREATE POLICY "Users can view own events" ON public.analytics_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for localization_profiles
CREATE POLICY "Users can view own profiles" ON public.localization_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profiles" ON public.localization_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profiles" ON public.localization_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profiles" ON public.localization_profiles FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for landing_pages
CREATE POLICY "Users can view own pages" ON public.landing_pages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pages" ON public.landing_pages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pages" ON public.landing_pages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pages" ON public.landing_pages FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for generated_images
CREATE POLICY "Users can view own images" ON public.generated_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own images" ON public.generated_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own images" ON public.generated_images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own images" ON public.generated_images FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for marketing_content
CREATE POLICY "Users can view own content" ON public.marketing_content FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content" ON public.marketing_content FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content" ON public.marketing_content FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own content" ON public.marketing_content FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for batch_jobs
CREATE POLICY "Users can view own jobs" ON public.batch_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.batch_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.batch_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON public.batch_jobs FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_ai_failures_project ON public.ai_failures(project_id, created_at);
CREATE INDEX idx_ai_failures_engine ON public.ai_failures(engine_name, resolved);
CREATE INDEX idx_ai_costs_project ON public.ai_costs(project_id, created_at);
CREATE INDEX idx_ai_costs_user_date ON public.ai_costs(user_id, created_at);
CREATE INDEX idx_analytics_project ON public.analytics_events(project_id, event_type);
CREATE INDEX idx_localization_user ON public.localization_profiles(user_id, is_default);
CREATE INDEX idx_landing_pages_project ON public.landing_pages(project_id, status);
CREATE INDEX idx_generated_images_project ON public.generated_images(project_id, image_type);
CREATE INDEX idx_marketing_content_project ON public.marketing_content(project_id, content_type);
CREATE INDEX idx_batch_jobs_user ON public.batch_jobs(user_id, status);

-- Add localization columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS market text DEFAULT 'us';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS audience text DEFAULT 'both';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS localization_profile_id uuid REFERENCES public.localization_profiles(id);

-- Add quality_score to scenes
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS ai_quality_score numeric(3,1);
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS needs_regeneration boolean DEFAULT false;

-- Update trigger for localization_profiles
CREATE TRIGGER update_localization_profiles_updated_at
  BEFORE UPDATE ON public.localization_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for landing_pages
CREATE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();