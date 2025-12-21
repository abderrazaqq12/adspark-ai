-- Step 1: Add validation tracking columns
ALTER TABLE public.secure_api_keys 
ADD COLUMN last_validated_at timestamp with time zone,
ADD COLUMN last_validation_success boolean,
ADD COLUMN last_validation_message text;