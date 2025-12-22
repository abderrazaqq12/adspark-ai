-- ==========================================
-- FlowScale Project System: Schema Enhancements
-- ==========================================
-- Enhances existing projects table and adds resource tracking
-- Part of unified Project System architecture

-- ==========================================
-- 1. Enhance Projects Table
-- ==========================================

-- Add lifecycle and metadata columns
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted', 'error')),
  ADD COLUMN IF NOT EXISTS resource_stats JSONB DEFAULT '{"files": 0, "outputs": 0, "size_bytes": 0}',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add unique constraint on Drive folder ID (after ensuring no duplicates)
-- This prevents multiple projects from sharing the same Drive folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'projects_drive_folder_unique'
  ) THEN
    ALTER TABLE public.projects 
      ADD CONSTRAINT projects_drive_folder_unique 
      UNIQUE (google_drive_folder_id);
  END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON public.projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_status_updated ON public.projects(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_drive_folder ON public.projects(google_drive_folder_id) WHERE google_drive_folder_id IS NOT NULL;

-- Backfill status for existing projects
UPDATE public.projects 
SET status = 'active' 
WHERE status IS NULL;

-- ==========================================
-- 2. Project Resources Tracking Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.project_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'output', 'job', 'log', 'drive_file')),
  resource_id UUID NOT NULL,
  resource_path TEXT,
  size_bytes BIGINT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one resource entry per (type, id) combination
  CONSTRAINT project_resources_unique UNIQUE(resource_type, resource_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_project_resources_project ON public.project_resources(project_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_project_resources_type ON public.project_resources(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_project_resources_created ON public.project_resources(project_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.project_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access resources for their own projects
CREATE POLICY "View Own Project Resources" ON public.project_resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_resources.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Insert Own Project Resources" ON public.project_resources
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_resources.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Update Own Project Resources" ON public.project_resources
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_resources.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Delete Own Project Resources" ON public.project_resources
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_resources.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ==========================================
-- 3. Project Drive Sync Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.project_drive_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  drive_folder_id TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'archiving', 'archived')),
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  folder_structure JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One sync record per project
  CONSTRAINT project_drive_sync_unique UNIQUE(project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_drive_sync_status ON public.project_drive_sync(sync_status, last_sync_at);
CREATE INDEX IF NOT EXISTS idx_project_drive_sync_folder ON public.project_drive_sync(drive_folder_id);

-- Enable RLS
ALTER TABLE public.project_drive_sync ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View Own Project Drive Sync" ON public.project_drive_sync
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_drive_sync.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage Own Project Drive Sync" ON public.project_drive_sync
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_drive_sync.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ==========================================
-- 4. Helper Functions
-- ==========================================

-- Function to update project resource stats
CREATE OR REPLACE FUNCTION public.update_project_resource_stats(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Calculate stats from project_resources table
  SELECT jsonb_build_object(
    'total_resources', COUNT(*),
    'total_bytes', COALESCE(SUM(size_bytes), 0),
    'files', COUNT(*) FILTER (WHERE resource_type = 'file'),
    'outputs', COUNT(*) FILTER (WHERE resource_type = 'output'),
    'jobs', COUNT(*) FILTER (WHERE resource_type = 'job'),
    'logs', COUNT(*) FILTER (WHERE resource_type = 'log'),
    'drive_files', COUNT(*) FILTER (WHERE resource_type = 'drive_file'),
    'last_updated', NOW()
  )
  INTO v_stats
  FROM public.project_resources
  WHERE project_id = p_project_id;
  
  -- Update projects table
  UPDATE public.projects
  SET resource_stats = v_stats,
      updated_at = NOW()
  WHERE id = p_project_id;
  
  RETURN v_stats;
END;
$$;

-- Function to archive a project
CREATE OR REPLACE FUNCTION public.archive_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update project status
  UPDATE public.projects
  SET status = 'archived',
      archived_at = NOW(),
      updated_at = NOW()
  WHERE id = p_project_id
  AND user_id = auth.uid()
  AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update Drive sync status
  UPDATE public.project_drive_sync
  SET sync_status = 'archiving',
      updated_at = NOW()
  WHERE project_id = p_project_id;
  
  RETURN TRUE;
END;
$$;

-- ==========================================
-- 5. Triggers
-- ==========================================

-- Trigger to update project.updated_at when resources change
CREATE OR REPLACE FUNCTION public.trigger_update_project_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.projects
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_project_resources_change ON public.project_resources;
CREATE TRIGGER on_project_resources_change
  AFTER INSERT OR UPDATE OR DELETE ON public.project_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_project_timestamp();

-- ==========================================
-- 6. Comments for Documentation
-- ==========================================

COMMENT ON TABLE public.project_resources IS 'Tracks all resources owned by a project (files, outputs, jobs, logs, Drive files)';
COMMENT ON TABLE public.project_drive_sync IS 'Tracks Google Drive folder synchronization state for each project';
COMMENT ON COLUMN public.projects.status IS 'Project lifecycle status: active, archived, deleted, error';
COMMENT ON COLUMN public.projects.resource_stats IS 'Cached statistics about project resources (updated by trigger)';
COMMENT ON FUNCTION public.update_project_resource_stats IS 'Recalculates and updates resource statistics for a project';
COMMENT ON FUNCTION public.archive_project IS 'Archives a project (soft delete) - callable by project owner only';
