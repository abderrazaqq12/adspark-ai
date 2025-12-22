-- =============================================
-- LIFECYCLE MANAGEMENT SCHEMA
-- =============================================

-- 1. FILE ASSETS TABLE - Track all files in the system
CREATE TABLE public.file_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.pipeline_jobs(id) ON DELETE SET NULL,
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  
  -- Lifecycle categorization
  file_type TEXT NOT NULL CHECK (file_type IN ('upload', 'temp', 'output', 'final')),
  tool TEXT NOT NULL CHECK (tool IN ('studio', 'replicator', 'ai-editor', 'ai-tools', 'system')),
  
  -- Retention
  retention_hours INTEGER DEFAULT 168, -- 7 days default
  expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_deletion', 'deleted'))
);

-- 2. SYSTEM LOGS TABLE - Structured logging
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.pipeline_jobs(id) ON DELETE CASCADE,
  
  -- Log metadata
  tool TEXT NOT NULL,
  stage TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  details JSONB,
  
  -- Retention
  retention_days INTEGER NOT NULL DEFAULT 7,
  expires_at TIMESTAMPTZ,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CLEANUP HISTORY TABLE - Track all cleanup operations
CREATE TABLE public.cleanup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Cleanup scope
  cleanup_type TEXT NOT NULL CHECK (cleanup_type IN ('project', 'job', 'user', 'auto', 'manual')),
  target_id UUID, -- project_id, job_id, or user_id depending on type
  
  -- Results
  files_deleted INTEGER DEFAULT 0,
  logs_deleted INTEGER DEFAULT 0,
  jobs_updated INTEGER DEFAULT 0,
  bytes_freed BIGINT DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 4. JOB STATE HISTORY TABLE - Track job state transitions
CREATE TABLE public.job_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.pipeline_jobs(id) ON DELETE CASCADE,
  
  -- State transition
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  
  -- Metadata
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('user', 'system', 'recovery', 'timeout')),
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_state_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_assets
CREATE POLICY "Users can view their own file assets"
  ON public.file_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own file assets"
  ON public.file_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own file assets"
  ON public.file_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own file assets"
  ON public.file_assets FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for system_logs
CREATE POLICY "Users can view their own logs"
  ON public.system_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
  ON public.system_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for cleanup_history
CREATE POLICY "Users can view their own cleanup history"
  ON public.cleanup_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cleanup history"
  ON public.cleanup_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cleanup history"
  ON public.cleanup_history FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for job_state_history
CREATE POLICY "Users can view job state history for their jobs"
  ON public.job_state_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pipeline_jobs pj 
    WHERE pj.id = job_id AND pj.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert job state history for their jobs"
  ON public.job_state_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pipeline_jobs pj 
    WHERE pj.id = job_id AND pj.user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_file_assets_user_id ON public.file_assets(user_id);
CREATE INDEX idx_file_assets_project_id ON public.file_assets(project_id);
CREATE INDEX idx_file_assets_job_id ON public.file_assets(job_id);
CREATE INDEX idx_file_assets_status ON public.file_assets(status);
CREATE INDEX idx_file_assets_expires_at ON public.file_assets(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_file_assets_file_type ON public.file_assets(file_type);

CREATE INDEX idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX idx_system_logs_project_id ON public.system_logs(project_id);
CREATE INDEX idx_system_logs_job_id ON public.system_logs(job_id);
CREATE INDEX idx_system_logs_severity ON public.system_logs(severity);
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at);
CREATE INDEX idx_system_logs_expires_at ON public.system_logs(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_cleanup_history_user_id ON public.cleanup_history(user_id);
CREATE INDEX idx_cleanup_history_status ON public.cleanup_history(status);

CREATE INDEX idx_job_state_history_job_id ON public.job_state_history(job_id);

-- Function to auto-set expires_at based on file_type
CREATE OR REPLACE FUNCTION public.set_file_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_type = 'temp' THEN
    NEW.expires_at := NEW.created_at + INTERVAL '24 hours';
    NEW.retention_hours := 24;
  ELSIF NEW.file_type = 'output' THEN
    NEW.expires_at := NEW.created_at + INTERVAL '7 days';
    NEW.retention_hours := 168;
  ELSIF NEW.file_type = 'final' THEN
    NEW.expires_at := NULL; -- No auto-expiry for final outputs
    NEW.retention_hours := NULL;
  ELSIF NEW.file_type = 'upload' THEN
    NEW.expires_at := NEW.created_at + INTERVAL '30 days';
    NEW.retention_hours := 720;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_set_file_expiry
  BEFORE INSERT ON public.file_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_file_expiry();

-- Function to auto-set log expiry based on severity
CREATE OR REPLACE FUNCTION public.set_log_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'debug' THEN
    NEW.expires_at := NEW.created_at + INTERVAL '24 hours';
    NEW.retention_days := 1;
  ELSIF NEW.severity IN ('info', 'warning') THEN
    NEW.expires_at := NEW.created_at + INTERVAL '7 days';
    NEW.retention_days := 7;
  ELSIF NEW.severity IN ('error', 'critical') THEN
    NEW.expires_at := NEW.created_at + INTERVAL '30 days';
    NEW.retention_days := 30;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_set_log_expiry
  BEFORE INSERT ON public.system_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_log_expiry();

-- Function to track job state changes
CREATE OR REPLACE FUNCTION public.track_job_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.job_state_history (job_id, from_status, to_status, triggered_by, reason)
    VALUES (NEW.id, OLD.status, NEW.status, 'system', 'Status change detected');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_track_job_state
  AFTER UPDATE ON public.pipeline_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.track_job_state_change();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.file_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cleanup_history;