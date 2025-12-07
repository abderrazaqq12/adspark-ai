-- Fix: Require authentication to view AI engines (prevents infrastructure info exposure)
DROP POLICY IF EXISTS "Anyone can view active engines" ON public.ai_engines;

CREATE POLICY "Authenticated users can view active engines" 
ON public.ai_engines 
FOR SELECT 
TO authenticated
USING (status = 'active');