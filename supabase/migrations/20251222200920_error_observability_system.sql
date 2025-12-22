-- ==========================================
-- FlowScale Error Observability System
-- ==========================================
-- Deterministic error handling with categorization,
-- retry logic, and state persistence

-- ==========================================
-- 1. Execution Errors Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.execution_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  
  -- Error Classification
  error_code TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'INPUT_ERROR', 'PLAN_ERROR', 'EXECUTION_ERROR', 
    'FFMPEG_ERROR', 'STORAGE_ERROR', 'AUTH_ERROR',
    'NETWORK_ERROR', 'RESOURCE_ERROR'
  )),
  stage TEXT NOT NULL,  -- e.g., 'download', 'encode', 'upload'
  
  -- Error Details
  message TEXT NOT NULL,
  technical_details TEXT,
  stack_trace TEXT,
  ffmpeg_stderr TEXT,  -- Raw FFmpeg output if applicable
  
  -- Recovery
  recovery_action TEXT NOT NULL CHECK (recovery_action IN (
    'RETRY', 'RETRY_WITH_FALLBACK', 'MANUAL_INTERVENTION', 'ABORT'
  )),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 0,
  fallback_used TEXT,  -- Description of fallback action taken
  
  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolution_method TEXT,  -- 'retry_success', 'manual_fix', 'abort'
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_execution_errors_project ON public.execution_errors(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_errors_job ON public.execution_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_execution_errors_category ON public.execution_errors(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_errors_unresolved ON public.execution_errors(project_id, resolved) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_execution_errors_code ON public.execution_errors(error_code, created_at DESC);

-- Enable RLS
ALTER TABLE public.execution_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their project errors"
  ON public.execution_errors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = execution_errors.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert errors"
  ON public.execution_errors FOR INSERT
  WITH CHECK (true);  -- Backend service role can insert

CREATE POLICY "System can update errors"
  ON public.execution_errors FOR UPDATE
  USING (true);  -- Backend service role can update

-- ==========================================
-- 2. Execution State Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.execution_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  
  -- State
  status TEXT NOT NULL CHECK (status IN (
    'queued', 'downloading', 'processing', 'encoding', 
    'uploading', 'completed', 'failed', 'paused'
  )),
  stage TEXT,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  
  -- Checkpoint Data for Resume
  checkpoint_data JSONB DEFAULT '{}',  -- State to resume from
  partial_outputs TEXT[],              -- Temp files created so far
  
  -- Retry Tracking
  retry_count INTEGER DEFAULT 0,
  last_error_id UUID REFERENCES public.execution_errors(id),
  next_retry_at TIMESTAMPTZ,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Configuration
  job_config JSONB NOT NULL,  -- Original job parameters
  
  CONSTRAINT unique_job_id UNIQUE(job_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_execution_state_project ON public.execution_state(project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_state_status ON public.execution_state(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_state_retry ON public.execution_state(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_execution_state_job ON public.execution_state(job_id);

-- Enable RLS
ALTER TABLE public.execution_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their job states"
  ON public.execution_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = execution_state.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage execution state"
  ON public.execution_state FOR ALL
  USING (true);  -- Backend service role has full access

-- ==========================================
-- 3. Helper Functions
-- ==========================================

-- Get error statistics for a project
CREATE OR REPLACE FUNCTION public.get_error_stats(p_project_id UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_errors', COUNT(*),
    'unresolved', COUNT(*) FILTER (WHERE NOT resolved),
    'by_category', (
      SELECT jsonb_object_agg(category, count)
      FROM (
        SELECT category, COUNT(*) as count
        FROM public.execution_errors
        WHERE project_id = p_project_id
        GROUP BY category
      ) cat_counts
    ),
    'retry_rate', 
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE resolution_method = 'retry_success') 
        / NULLIF(COUNT(*), 0), 
        2
      ),
    'most_common_errors', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'error_code', error_code,
          'count', count,
          'category', category
        )
      )
      FROM (
        SELECT error_code, category, COUNT(*) as count
        FROM public.execution_errors
        WHERE project_id = p_project_id
        GROUP BY error_code, category
        ORDER BY count DESC
        LIMIT 5
      ) top_errors
    )
  )
  FROM public.execution_errors
  WHERE project_id = p_project_id;
$$;

-- Mark error as resolved
CREATE OR REPLACE FUNCTION public.resolve_error(
  p_error_id UUID,
  p_resolution_method TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.execution_errors
  SET 
    resolved = TRUE,
    resolution_method = p_resolution_method,
    resolved_at = NOW()
  WHERE id = p_error_id;
  
  RETURN FOUND;
END;
$$;

-- Update execution state
CREATE OR REPLACE FUNCTION public.update_execution_state(
  p_job_id TEXT,
  p_status TEXT,
  p_stage TEXT DEFAULT NULL,
  p_progress INTEGER DEFAULT NULL,
  p_checkpoint_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.execution_state
  SET 
    status = p_status,
    stage = COALESCE(p_stage, stage),
    progress_percent = COALESCE(p_progress, progress_percent),
    checkpoint_data = COALESCE(p_checkpoint_data, checkpoint_data),
    updated_at = NOW(),
    completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE completed_at END
  WHERE job_id = p_job_id;
  
  RETURN FOUND;
END;
$$;

-- Trigger to update execution_state.updated_at
CREATE OR REPLACE FUNCTION public.trigger_execution_state_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_execution_state_change ON public.execution_state;
CREATE TRIGGER on_execution_state_change
  BEFORE UPDATE ON public.execution_state
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_execution_state_updated_at();

-- ==========================================
-- 4. Comments
-- ==========================================

COMMENT ON TABLE public.execution_errors IS 'Categorized error log with recovery actions for all job failures';
COMMENT ON TABLE public.execution_state IS 'Persistent job execution state for resume capability';
COMMENT ON FUNCTION public.get_error_stats IS 'Returns error statistics and trends for a project';
COMMENT ON FUNCTION public.resolve_error IS 'Marks an error as resolved with resolution method';
COMMENT ON FUNCTION public.update_execution_state IS 'Updates job execution state with checkpoint data';
