-- Activity log table for tracking all admin and user actions
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  category text NOT NULL DEFAULT 'general'
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Any authenticated user can insert logs (their own actions)
CREATE POLICY "Authenticated users can insert logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can insert logs for any user (for admin actions on behalf of others)
CREATE POLICY "Admins can insert any logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Index for fast queries
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX idx_activity_logs_category ON public.activity_logs (category);