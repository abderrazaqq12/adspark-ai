-- Create audio_tracks table for music/background audio
CREATE TABLE public.audio_tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id uuid REFERENCES public.scripts(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text NOT NULL,
  duration_sec numeric,
  volume numeric DEFAULT 1.0,
  fade_in_ms integer DEFAULT 0,
  fade_out_ms integer DEFAULT 0,
  start_time_sec numeric DEFAULT 0,
  track_type text DEFAULT 'background',
  created_at timestamp with time zone DEFAULT now()
);

-- Create subtitles table for captions
CREATE TABLE public.subtitles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scene_id uuid REFERENCES public.scenes(id) ON DELETE CASCADE,
  text text NOT NULL,
  start_time_ms integer NOT NULL,
  end_time_ms integer NOT NULL,
  style jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audio_tracks
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audio tracks"
ON public.audio_tracks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM scripts s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = audio_tracks.script_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can insert own audio tracks"
ON public.audio_tracks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM scripts s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = audio_tracks.script_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update own audio tracks"
ON public.audio_tracks FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM scripts s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = audio_tracks.script_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete own audio tracks"
ON public.audio_tracks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM scripts s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = audio_tracks.script_id AND p.user_id = auth.uid()
));

-- Enable RLS on subtitles
ALTER TABLE public.subtitles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subtitles"
ON public.subtitles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM scenes sc
  JOIN scripts s ON s.id = sc.script_id
  JOIN projects p ON p.id = s.project_id
  WHERE sc.id = subtitles.scene_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can insert own subtitles"
ON public.subtitles FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM scenes sc
  JOIN scripts s ON s.id = sc.script_id
  JOIN projects p ON p.id = s.project_id
  WHERE sc.id = subtitles.scene_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update own subtitles"
ON public.subtitles FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM scenes sc
  JOIN scripts s ON s.id = sc.script_id
  JOIN projects p ON p.id = s.project_id
  WHERE sc.id = subtitles.scene_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete own subtitles"
ON public.subtitles FOR DELETE
USING (EXISTS (
  SELECT 1 FROM scenes sc
  JOIN scripts s ON s.id = sc.script_id
  JOIN projects p ON p.id = s.project_id
  WHERE sc.id = subtitles.scene_id AND p.user_id = auth.uid()
));

-- Create audio storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true);

-- Audio bucket policies
CREATE POLICY "Public can view audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio');

CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);