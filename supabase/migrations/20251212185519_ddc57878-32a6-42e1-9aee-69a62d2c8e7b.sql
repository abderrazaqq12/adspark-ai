-- Create secure_api_keys table if not exists
CREATE TABLE IF NOT EXISTS public.secure_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.secure_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for secure_api_keys
CREATE POLICY "Users can view own api keys" ON public.secure_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys" ON public.secure_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys" ON public.secure_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys" ON public.secure_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Create or replace the upsert function
CREATE OR REPLACE FUNCTION public.upsert_secure_api_key(
  p_provider TEXT,
  p_encrypted_key TEXT,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key_id UUID;
BEGIN
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

-- Create or replace the get providers function
CREATE OR REPLACE FUNCTION public.get_my_api_key_providers()
RETURNS TABLE(provider TEXT, is_active BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT provider, is_active 
  FROM public.secure_api_keys 
  WHERE user_id = auth.uid();
$$;

-- Create or replace delete function
CREATE OR REPLACE FUNCTION public.delete_my_api_key(p_provider TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.secure_api_keys 
  WHERE user_id = auth.uid() AND provider = p_provider;
  RETURN FOUND;
END;
$$;

-- Create or replace toggle active function
CREATE OR REPLACE FUNCTION public.toggle_api_key_active(p_provider TEXT, p_is_active BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.secure_api_keys 
  SET is_active = p_is_active, updated_at = now()
  WHERE user_id = auth.uid() AND provider = p_provider;
  RETURN FOUND;
END;
$$;

-- Create function to get user api key (for edge functions)
CREATE OR REPLACE FUNCTION public.get_user_api_key(p_user_id UUID, p_provider TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT encrypted_key INTO v_key
  FROM public.secure_api_keys
  WHERE user_id = p_user_id 
    AND provider = p_provider
    AND is_active = true;
  
  RETURN v_key;
END;
$$;