-- Create training modules table
CREATE TABLE public.training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Allgemein',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;

-- Everyone approved can view
CREATE POLICY "Approved can view training modules"
ON public.training_modules
FOR SELECT
TO authenticated
USING (is_approved(auth.uid()));

-- Ausbilder+ can manage
CREATE POLICY "Ausbilder can manage training modules"
ON public.training_modules
FOR ALL
TO authenticated
USING (can_manage_licenses(auth.uid()))
WITH CHECK (can_manage_licenses(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_training_modules_updated_at
BEFORE UPDATE ON public.training_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();