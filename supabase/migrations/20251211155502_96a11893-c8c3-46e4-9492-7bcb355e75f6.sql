-- Create a SECURITY DEFINER function to fetch API keys for edge functions
-- This function is only callable from edge functions with service role key
CREATE OR REPLACE FUNCTION public.get_user_api_key(p_user_id uuid, p_provider text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  -- This function should only be called from edge functions with service role
  -- It returns the encrypted key for a specific user and provider
  SELECT encrypted_key INTO v_key
  FROM public.secure_api_keys
  WHERE user_id = p_user_id 
    AND provider = p_provider
    AND is_active = true;
  
  RETURN v_key;
END;
$$;

-- Grant execute to authenticated and service_role only
REVOKE ALL ON FUNCTION public.get_user_api_key(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_api_key(uuid, text) TO service_role;