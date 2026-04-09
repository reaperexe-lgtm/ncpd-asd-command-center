CREATE TABLE public.reset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reset_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
ON public.reset_requests
FOR SELECT
TO authenticated
USING (requested_by = auth.uid());

CREATE POLICY "Admins can view all requests"
ON public.reset_requests
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authorized can create requests"
ON public.reset_requests
FOR INSERT
TO authenticated
WITH CHECK (public.can_reset_stats(auth.uid()) AND requested_by = auth.uid());

CREATE POLICY "Admins can update requests"
ON public.reset_requests
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete requests"
ON public.reset_requests
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));