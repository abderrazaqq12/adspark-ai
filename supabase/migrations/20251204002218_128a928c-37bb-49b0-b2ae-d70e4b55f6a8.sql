-- Add callback_data to generation_queue for tracking
ALTER TABLE public.generation_queue 
ADD COLUMN IF NOT EXISTS callback_data jsonb DEFAULT '{}'::jsonb;

-- Add external_job_id to track AI engine job IDs
ALTER TABLE public.generation_queue
ADD COLUMN IF NOT EXISTS external_job_id text;