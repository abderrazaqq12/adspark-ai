-- Create prompt_profiles table for first-class prompt management
CREATE TABLE public.prompt_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('marketing_angles', 'landing_page', 'product_content', 'image_generation', 'voiceover', 'scene_breakdown')),
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ar',
  market TEXT NOT NULL DEFAULT 'gcc',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prompt_versions table for versioning (keep last 3)
CREATE TABLE public.prompt_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_profile_id UUID NOT NULL REFERENCES public.prompt_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for prompt_profiles
CREATE POLICY "Users can view own prompts" ON public.prompt_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts" ON public.prompt_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts" ON public.prompt_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts" ON public.prompt_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for prompt_versions
CREATE POLICY "Users can view own prompt versions" ON public.prompt_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.prompt_profiles pp 
      WHERE pp.id = prompt_versions.prompt_profile_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own prompt versions" ON public.prompt_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prompt_profiles pp 
      WHERE pp.id = prompt_versions.prompt_profile_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own prompt versions" ON public.prompt_versions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.prompt_profiles pp 
      WHERE pp.id = prompt_versions.prompt_profile_id 
      AND pp.user_id = auth.uid()
    )
  );

-- Create unique constraint for active prompts per type/language/market
CREATE UNIQUE INDEX idx_prompt_profiles_active_unique 
  ON public.prompt_profiles (user_id, type, language, market) 
  WHERE is_active = true;

-- Create index for faster lookups
CREATE INDEX idx_prompt_profiles_lookup 
  ON public.prompt_profiles (user_id, type, language, market, is_active);

-- Create function to auto-version prompts and cleanup old versions
CREATE OR REPLACE FUNCTION public.manage_prompt_versions()
RETURNS TRIGGER AS $$
DECLARE
  version_count INTEGER;
BEGIN
  -- Insert new version
  INSERT INTO public.prompt_versions (prompt_profile_id, version, prompt_text, prompt_hash)
  VALUES (NEW.id, NEW.version, NEW.prompt_text, NEW.prompt_hash);
  
  -- Count versions for this prompt
  SELECT COUNT(*) INTO version_count 
  FROM public.prompt_versions 
  WHERE prompt_profile_id = NEW.id;
  
  -- Keep only last 3 versions
  IF version_count > 3 THEN
    DELETE FROM public.prompt_versions 
    WHERE id IN (
      SELECT id FROM public.prompt_versions 
      WHERE prompt_profile_id = NEW.id 
      ORDER BY version ASC 
      LIMIT version_count - 3
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for versioning
CREATE TRIGGER trigger_prompt_version_management
  AFTER INSERT OR UPDATE OF prompt_text ON public.prompt_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.manage_prompt_versions();

-- Create function to get active prompt (used by edge functions)
CREATE OR REPLACE FUNCTION public.get_active_prompt(
  p_user_id UUID,
  p_type TEXT,
  p_language TEXT DEFAULT 'ar',
  p_market TEXT DEFAULT 'gcc'
)
RETURNS TABLE (
  id UUID,
  prompt_text TEXT,
  prompt_hash TEXT,
  version INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT pp.id, pp.prompt_text, pp.prompt_hash, pp.version
  FROM public.prompt_profiles pp
  WHERE pp.user_id = p_user_id
    AND pp.type = p_type
    AND pp.language = p_language
    AND pp.market = p_market
    AND pp.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;