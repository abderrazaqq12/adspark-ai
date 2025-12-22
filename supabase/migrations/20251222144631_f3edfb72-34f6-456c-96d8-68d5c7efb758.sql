-- Add default_country column to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS default_country TEXT DEFAULT 'US';

-- Add comment for clarity
COMMENT ON COLUMN public.user_settings.default_country IS 'ISO 3166-1 alpha-2 country code for default audience targeting';