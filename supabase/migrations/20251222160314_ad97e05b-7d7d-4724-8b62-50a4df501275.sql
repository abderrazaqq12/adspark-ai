-- Add google_drive_folder_id column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT DEFAULT NULL;

-- Add google_drive_folder_link column for easy access
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS google_drive_folder_link TEXT DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_google_drive_folder_id 
ON public.projects (google_drive_folder_id) 
WHERE google_drive_folder_id IS NOT NULL;