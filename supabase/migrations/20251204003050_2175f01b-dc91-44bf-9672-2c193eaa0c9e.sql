-- Create storage bucket for generated videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true);

-- Create storage bucket for custom scene uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-scenes', 'custom-scenes', true);

-- RLS policies for videos bucket (public read, authenticated write)
CREATE POLICY "Public can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for custom-scenes bucket
CREATE POLICY "Public can view custom scenes"
ON storage.objects FOR SELECT
USING (bucket_id = 'custom-scenes');

CREATE POLICY "Authenticated users can upload custom scenes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'custom-scenes' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own custom scenes"
ON storage.objects FOR DELETE
USING (bucket_id = 'custom-scenes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add transition settings to scenes table
ALTER TABLE public.scenes
ADD COLUMN IF NOT EXISTS transition_type text DEFAULT 'cut',
ADD COLUMN IF NOT EXISTS transition_duration_ms integer DEFAULT 500;