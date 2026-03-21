
-- Function to check if user can delete protocols (admin OR supervisor)
CREATE OR REPLACE FUNCTION public.can_delete_protocols(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('director', 'co_director', 'admin', 'supervisor')
  )
$$;

-- Add delete policies for missions (supervisors)
CREATE POLICY "Supervisors can delete missions"
ON public.missions FOR DELETE
TO authenticated
USING (can_delete_protocols(auth.uid()));

-- Add delete policies for pursuits (supervisors)
CREATE POLICY "Supervisors can delete pursuits"
ON public.pursuits FOR DELETE
TO authenticated
USING (can_delete_protocols(auth.uid()));

-- Add delete policies for mission_vehicles (supervisors)
CREATE POLICY "Supervisors can delete vehicles"
ON public.mission_vehicles FOR DELETE
TO authenticated
USING (can_delete_protocols(auth.uid()));

-- Add delete policies for pursuit_photos (supervisors)
CREATE POLICY "Supervisors can delete pursuit photos"
ON public.pursuit_photos FOR DELETE
TO authenticated
USING (can_delete_protocols(auth.uid()));
