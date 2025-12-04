-- Add pricing_tier column to user_settings (replaces use_free_tier_only)
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS pricing_tier text DEFAULT 'normal';

-- Add cost_tier column to ai_engines
ALTER TABLE public.ai_engines 
ADD COLUMN IF NOT EXISTS cost_tier text DEFAULT 'normal';

-- Update existing engines with cost tiers based on their pricing model
UPDATE public.ai_engines SET cost_tier = 'free' WHERE supports_free_tier = true;
UPDATE public.ai_engines SET cost_tier = 'cheap' WHERE name IN ('Hailuo AI', 'Wan Video', 'SkyReels', 'Crayo AI', 'Nim Video', 'JSON2Video', 'Hugging Face');
UPDATE public.ai_engines SET cost_tier = 'expensive' WHERE name IN ('Runway Gen-3', 'OpenAI Sora', 'Google Veo', 'HeyGen', 'Synthesia', 'Luma Dream Machine');
UPDATE public.ai_engines SET cost_tier = 'normal' WHERE cost_tier IS NULL;

-- Create engine_usage_analytics table
CREATE TABLE IF NOT EXISTS public.engine_usage_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  engine_id uuid REFERENCES public.ai_engines(id),
  engine_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  success boolean DEFAULT true,
  duration_ms integer,
  cost_estimate numeric(10,4),
  error_message text
);

-- Enable RLS
ALTER TABLE public.engine_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for engine_usage_analytics
CREATE POLICY "Users can view own analytics" ON public.engine_usage_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON public.engine_usage_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);