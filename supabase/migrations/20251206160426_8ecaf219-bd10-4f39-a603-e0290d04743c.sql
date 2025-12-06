-- Create autopilot_jobs table for tracking one-click video generation
CREATE TABLE public.autopilot_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_image_url TEXT,
  language TEXT DEFAULT 'en',
  pricing_tier TEXT DEFAULT 'free',
  scripts_count INTEGER DEFAULT 10,
  variations_per_scene INTEGER DEFAULT 10,
  status TEXT DEFAULT 'pending',
  progress JSONB DEFAULT '{
    "scripts_generated": 0,
    "voiceovers_generated": 0,
    "scenes_broken_down": 0,
    "videos_generated": 0,
    "videos_assembled": 0
  }'::jsonb,
  total_videos INTEGER DEFAULT 0,
  completed_videos INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.autopilot_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own autopilot jobs"
ON public.autopilot_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own autopilot jobs"
ON public.autopilot_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own autopilot jobs"
ON public.autopilot_jobs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own autopilot jobs"
ON public.autopilot_jobs FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.autopilot_jobs;