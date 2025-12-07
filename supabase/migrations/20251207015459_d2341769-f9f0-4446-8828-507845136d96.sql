-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create a secure table for API keys that only service role can access
-- This table will NOT have RLS policies allowing client access - only edge functions with service role can read

CREATE TABLE public.secure_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  encrypted_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS but with NO permissive policies for anon/authenticated roles
-- This means ONLY service role can access this table
ALTER TABLE public.secure_api_keys ENABLE ROW LEVEL SECURITY;

-- Create an index for faster lookups
CREATE INDEX idx_secure_api_keys_user_provider ON public.secure_api_keys(user_id, provider);

-- Create a trigger for updated_at
CREATE TRIGGER update_secure_api_keys_updated_at
BEFORE UPDATE ON public.secure_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- IMPORTANT: No RLS policies are created here intentionally
-- This means authenticated users CANNOT read/write this table directly
-- Only edge functions using SUPABASE_SERVICE_ROLE_KEY can access it

-- Create a function for users to add/update their API keys (will be called via RPC)
-- This is a SECURITY DEFINER function that runs with elevated privileges
CREATE OR REPLACE FUNCTION public.upsert_secure_api_key(
  p_provider text,
  p_encrypted_key text,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_id uuid;
BEGIN
  -- auth.uid() ensures only the authenticated user can add their own keys
  INSERT INTO public.secure_api_keys (user_id, provider, encrypted_key, is_active)
  VALUES (auth.uid(), p_provider, p_encrypted_key, p_is_active)
  ON CONFLICT (user_id, provider) 
  DO UPDATE SET 
    encrypted_key = p_encrypted_key,
    is_active = p_is_active,
    updated_at = now()
  RETURNING id INTO v_key_id;
  
  RETURN v_key_id;
END;
$$;

-- Function to get providers (names only, not keys) for current user
CREATE OR REPLACE FUNCTION public.get_my_api_key_providers()
RETURNS TABLE(provider text, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT provider, is_active 
  FROM public.secure_api_keys 
  WHERE user_id = auth.uid();
$$;

-- Function to delete an API key for current user
CREATE OR REPLACE FUNCTION public.delete_my_api_key(p_provider text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.secure_api_keys 
  WHERE user_id = auth.uid() AND provider = p_provider;
  RETURN FOUND;
END;
$$;

-- Function to toggle API key active status
CREATE OR REPLACE FUNCTION public.toggle_api_key_active(p_provider text, p_is_active boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.secure_api_keys 
  SET is_active = p_is_active, updated_at = now()
  WHERE user_id = auth.uid() AND provider = p_provider;
  RETURN FOUND;
END;
$$;