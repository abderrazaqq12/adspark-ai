-- 1. Disable constraints temporarily to allow type change
ALTER TABLE public.pipeline_jobs ALTER COLUMN progress DROP DEFAULT;

-- 2. Convert column from INTEGER to JSONB
-- Note: 'USING' clause handles conversion of existing integer values to a JSON number (e.g., 50 -> '50')
ALTER TABLE public.pipeline_jobs 
  ALTER COLUMN progress TYPE JSONB 
  USING jsonb_build_object('percent', progress);

-- 3. Set new default and constraints
ALTER TABLE public.pipeline_jobs 
  ALTER COLUMN progress SET DEFAULT '{}'::jsonb;

-- 4. Add GIN Index for fast JSON querying
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_progress 
  ON public.pipeline_jobs USING gin (progress);

-- 5. Force Schema Cache Reload for PostgREST
NOTIFY pgrst, 'reload schema';
