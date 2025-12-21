-- Add missing DELETE policies for tables that need cascading delete

-- ai_costs: Add DELETE policy
CREATE POLICY "Users can delete own costs"
ON public.ai_costs
FOR DELETE
USING (auth.uid() = user_id);

-- ai_failures: Add DELETE policy  
CREATE POLICY "Users can delete own failures"
ON public.ai_failures
FOR DELETE
USING (auth.uid() = user_id);

-- cost_transactions: Add DELETE policy
CREATE POLICY "Users can delete own cost transactions"
ON public.cost_transactions
FOR DELETE
USING (auth.uid() = user_id);

-- analytics_events: Add DELETE policy
CREATE POLICY "Users can delete own events"
ON public.analytics_events
FOR DELETE
USING (auth.uid() = user_id);

-- video_outputs: Add DELETE policy
CREATE POLICY "Users can delete own outputs"
ON public.video_outputs
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = video_outputs.project_id
  AND projects.user_id = auth.uid()
));

-- engine_usage_analytics: Add DELETE policy
CREATE POLICY "Users can delete own engine analytics"
ON public.engine_usage_analytics
FOR DELETE
USING (auth.uid() = user_id);

-- generation_queue: Add DELETE policy
CREATE POLICY "Users can delete own queue items"
ON public.generation_queue
FOR DELETE
USING (auth.uid() = user_id);

-- ai_learnings: Add DELETE policy
CREATE POLICY "Users can delete own learnings"
ON public.ai_learnings
FOR DELETE
USING (auth.uid() = user_id);