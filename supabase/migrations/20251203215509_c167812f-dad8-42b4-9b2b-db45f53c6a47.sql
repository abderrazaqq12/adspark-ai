-- Users profile table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  credits INTEGER DEFAULT 100,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Engines Registry
CREATE TABLE public.ai_engines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('avatar', 'text_to_video', 'image_to_video', 'template_based', 'voice')),
  supports_free_tier BOOLEAN DEFAULT false,
  pricing_model TEXT CHECK (pricing_model IN ('free', 'free_tier', 'pay_per_use', 'subscription')),
  max_duration_sec INTEGER DEFAULT 60,
  supported_ratios TEXT[] DEFAULT ARRAY['16:9', '9:16', '1:1'],
  api_base_url TEXT,
  api_key_env TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'coming_soon')),
  description TEXT,
  priority_score INTEGER DEFAULT 50,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prompt Templates (user-editable)
CREATE TABLE public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  language TEXT DEFAULT 'en',
  category TEXT DEFAULT 'script',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_name TEXT,
  language TEXT DEFAULT 'en',
  output_count INTEGER DEFAULT 10,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scripts
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  raw_text TEXT NOT NULL,
  hooks TEXT[],
  tone TEXT,
  style TEXT,
  status TEXT DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scenes
CREATE TABLE public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  index INTEGER NOT NULL,
  text TEXT NOT NULL,
  scene_type TEXT CHECK (scene_type IN ('hook', 'problem', 'solution', 'social_proof', 'cta', 'broll', 'avatar', 'product', 'testimonial', 'transition')),
  visual_prompt TEXT,
  engine_id UUID REFERENCES public.ai_engines(id),
  engine_name TEXT,
  duration_sec INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  video_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Video Outputs (final assembled videos)
CREATE TABLE public.video_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  final_video_url TEXT,
  format TEXT DEFAULT 'mp4',
  duration_sec INTEGER,
  has_subtitles BOOLEAN DEFAULT true,
  has_watermark BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Uploads (user files)
CREATE TABLE public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT CHECK (file_type IN ('image', 'video', 'audio', 'document')),
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Settings
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  default_language TEXT DEFAULT 'en',
  default_voice TEXT,
  use_free_tier_only BOOLEAN DEFAULT false,
  api_keys JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generation Queue
CREATE TABLE public.generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE,
  engine_id UUID REFERENCES public.ai_engines(id),
  priority INTEGER DEFAULT 50,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for ai_engines (public read, admin write)
CREATE POLICY "Anyone can view active engines" ON public.ai_engines FOR SELECT USING (status = 'active');

-- RLS Policies for prompt_templates
CREATE POLICY "Users can view own templates" ON public.prompt_templates FOR SELECT USING (auth.uid() = user_id OR is_default = true);
CREATE POLICY "Users can insert own templates" ON public.prompt_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.prompt_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.prompt_templates FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for projects
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for scripts
CREATE POLICY "Users can view own scripts" ON public.scripts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scripts.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can insert own scripts" ON public.scripts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scripts.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own scripts" ON public.scripts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scripts.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can delete own scripts" ON public.scripts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scripts.project_id AND projects.user_id = auth.uid())
);

-- RLS Policies for scenes
CREATE POLICY "Users can view own scenes" ON public.scenes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.scripts s 
    JOIN public.projects p ON p.id = s.project_id 
    WHERE s.id = scenes.script_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert own scenes" ON public.scenes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scripts s 
    JOIN public.projects p ON p.id = s.project_id 
    WHERE s.id = scenes.script_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own scenes" ON public.scenes FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.scripts s 
    JOIN public.projects p ON p.id = s.project_id 
    WHERE s.id = scenes.script_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete own scenes" ON public.scenes FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.scripts s 
    JOIN public.projects p ON p.id = s.project_id 
    WHERE s.id = scenes.script_id AND p.user_id = auth.uid()
  )
);

-- RLS Policies for video_outputs
CREATE POLICY "Users can view own outputs" ON public.video_outputs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = video_outputs.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can insert own outputs" ON public.video_outputs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = video_outputs.project_id AND projects.user_id = auth.uid())
);

-- RLS Policies for uploads
CREATE POLICY "Users can view own uploads" ON public.uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own uploads" ON public.uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own uploads" ON public.uploads FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for generation_queue
CREATE POLICY "Users can view own queue" ON public.generation_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own queue" ON public.generation_queue FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed default AI engines
INSERT INTO public.ai_engines (name, type, supports_free_tier, pricing_model, max_duration_sec, api_key_env, status, description, priority_score) VALUES
('Runway Gen-3 Alpha', 'text_to_video', false, 'pay_per_use', 10, 'RUNWAY_API_KEY', 'active', 'Professional-grade video with precise camera control', 90),
('OpenAI Sora', 'text_to_video', false, 'subscription', 20, 'OPENAI_API_KEY', 'active', 'State-of-the-art cinematic video generation', 95),
('Google Veo 3.1', 'text_to_video', false, 'pay_per_use', 30, 'GOOGLE_VEO_API_KEY', 'active', 'High-quality video with excellent lighting', 88),
('Pika Labs', 'text_to_video', true, 'free_tier', 16, 'PIKA_API_KEY', 'active', 'Fast creative video generation', 75),
('Hailuo Video', 'text_to_video', true, 'free_tier', 10, 'HAILUO_API_KEY', 'active', 'Quick UGC-style video clips', 70),
('Luma Dream Machine', 'text_to_video', true, 'free_tier', 5, 'LUMA_API_KEY', 'active', 'Cinematic scenes with smooth motion', 72),
('HeyGen', 'avatar', false, 'subscription', 60, 'HEYGEN_API_KEY', 'active', 'Realistic AI avatars with lip-sync', 85),
('Synthesia', 'avatar', false, 'subscription', 120, 'SYNTHESIA_API_KEY', 'active', 'Corporate-grade avatar videos', 82),
('NanoBanana', 'image_to_video', true, 'free', 10, 'LOVABLE_API_KEY', 'active', 'Photo to animated scene using Gemini', 65),
('ElevenLabs', 'voice', false, 'pay_per_use', 300, 'ELEVENLABS_API_KEY', 'active', 'Ultra-realistic voice generation', 90),
('Kling AI', 'text_to_video', false, 'pay_per_use', 10, 'KLING_API_KEY', 'active', 'Realistic physics simulation', 78);

-- Seed default prompt templates
INSERT INTO public.prompt_templates (user_id, name, template_text, variables, language, category, is_default) VALUES
(NULL, 'UGC Product Ad', 'Create a compelling UGC-style video script for {{product_name}}. 

Target audience: {{audience}}
Key benefits: {{benefits}}
Problem it solves: {{problem}}
Call to action: {{cta}}
Tone: {{brand_tone}}
Special offer: {{offer}}

Write in {{language}} language. Include:
1. Attention-grabbing hook (3 seconds)
2. Problem statement (5 seconds)  
3. Solution introduction (5 seconds)
4. Key benefits showcase (10 seconds)
5. Social proof element (5 seconds)
6. Strong CTA (3 seconds)

Keep total script under 60 words for a 30-second video.', 
'["product_name", "audience", "benefits", "problem", "cta", "brand_tone", "offer", "language"]'::jsonb, 
'en', 'script', true),

(NULL, 'Testimonial Style', 'Write a testimonial-style video script for {{product_name}}.

Speak as if you are a satisfied customer sharing your experience.
Language: {{language}}
Benefits experienced: {{benefits}}
Problem solved: {{problem}}
Audience: {{audience}}

Structure:
1. Personal hook about the problem
2. Discovery of the product
3. Results and transformation
4. Recommendation and CTA: {{cta}}

Keep it authentic and conversational. Under 80 words.', 
'["product_name", "language", "benefits", "problem", "audience", "cta"]'::jsonb,
'en', 'script', true),

(NULL, 'إعلان منتج بالعربي', 'اكتب نص إعلان فيديو جذاب لمنتج {{product_name}}.

الجمهور المستهدف: {{audience}}
الفوائد الرئيسية: {{benefits}}
المشكلة التي يحلها: {{problem}}
دعوة للعمل: {{cta}}
النبرة: {{brand_tone}}

اكتب بأسلوب عربي سعودي عامي وجذاب.
الهيكل:
1. خطاف يجذب الانتباه
2. عرض المشكلة
3. تقديم الحل
4. إبراز الفوائد
5. دعوة قوية للشراء

اجعل النص أقل من 60 كلمة.',
'["product_name", "audience", "benefits", "problem", "cta", "brand_tone"]'::jsonb,
'ar', 'script', true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_outputs;