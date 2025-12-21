-- Step 2: Drop existing function and recreate with new return type
DROP FUNCTION IF EXISTS public.get_my_api_key_providers();

CREATE FUNCTION public.get_my_api_key_providers()
RETURNS TABLE(provider text, is_active boolean, last_validated_at timestamp with time zone, last_validation_success boolean, last_validation_message text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT provider, is_active, last_validated_at, last_validation_success, last_validation_message
  FROM public.secure_api_keys 
  WHERE user_id = auth.uid();
$$;

-- Create function to update validation status
CREATE OR REPLACE FUNCTION public.update_api_key_validation(
  p_provider text,
  p_success boolean,
  p_message text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.secure_api_keys 
  SET 
    last_validated_at = now(),
    last_validation_success = p_success,
    last_validation_message = p_message,
    updated_at = now()
  WHERE user_id = auth.uid() AND provider = p_provider;
  RETURN FOUND;
END;
$$;