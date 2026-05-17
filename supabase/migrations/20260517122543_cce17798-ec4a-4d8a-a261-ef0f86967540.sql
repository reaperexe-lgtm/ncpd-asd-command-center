
-- Allow applicants to read map data (view-only, no hidden password access)
CREATE POLICY "Applicants can view map backgrounds"
ON public.map_backgrounds FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'asd_applicant'::app_role) OR has_role(auth.uid(), 'flight_applicant'::app_role));

CREATE POLICY "Applicants can view map locations"
ON public.map_locations FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'asd_applicant'::app_role) OR has_role(auth.uid(), 'flight_applicant'::app_role));

CREATE POLICY "Applicants can view map areas"
ON public.map_areas FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'asd_applicant'::app_role) OR has_role(auth.uid(), 'flight_applicant'::app_role));

CREATE POLICY "Applicants can view map drawings"
ON public.map_drawings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'asd_applicant'::app_role) OR has_role(auth.uid(), 'flight_applicant'::app_role));

CREATE POLICY "Applicants can view map settings"
ON public.map_settings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'asd_applicant'::app_role) OR has_role(auth.uid(), 'flight_applicant'::app_role));
