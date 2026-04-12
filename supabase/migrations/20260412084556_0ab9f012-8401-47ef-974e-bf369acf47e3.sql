
CREATE TABLE public.permission_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_key TEXT NOT NULL,
  role TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(permission_key, role)
);

ALTER TABLE public.permission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read permission settings"
ON public.permission_settings FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert permission settings"
ON public.permission_settings FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update permission settings"
ON public.permission_settings FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete permission settings"
ON public.permission_settings FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
