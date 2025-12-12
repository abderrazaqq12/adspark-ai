-- Add structured output columns to projects table for the 3-stage pipeline

-- Stage 1: Marketing Angles JSON output
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS marketing_angles_output JSONB DEFAULT NULL;

-- Stage 2: Landing Page Text Content JSON output  
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS landing_page_text_output JSONB DEFAULT NULL;

-- Stage 3: Landing Page HTML output
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS landing_page_html_output TEXT DEFAULT NULL;

-- Add index for faster lookups on active projects
CREATE INDEX IF NOT EXISTS idx_projects_user_marketing ON public.projects(user_id) WHERE marketing_angles_output IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.projects.marketing_angles_output IS 'Stage 1: Structured marketing angles (problems, desires, objections, emotional_triggers, angles)';
COMMENT ON COLUMN public.projects.landing_page_text_output IS 'Stage 2: Structured landing page text (hero, benefits, features, usage_steps, technical_details, faq, reviews)';
COMMENT ON COLUMN public.projects.landing_page_html_output IS 'Stage 3: Production-ready HTML landing page';