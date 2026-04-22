
-- Tabelle für Gültigkeitsdaten pro Fluglizenz-User
CREATE TABLE IF NOT EXISTS public.flight_license_validity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  valid_until DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flight_license_validity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved can view license validity"
ON public.flight_license_validity
FOR SELECT
TO authenticated
USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage license validity"
ON public.flight_license_validity
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_flight_license_validity_updated_at
BEFORE UPDATE ON public.flight_license_validity
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
