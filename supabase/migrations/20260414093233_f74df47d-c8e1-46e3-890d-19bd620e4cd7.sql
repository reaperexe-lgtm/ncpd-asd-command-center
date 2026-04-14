-- Allow protocol creators to delete their own protocols
CREATE POLICY "Creators can delete own formation protocols"
ON public.formation_protocols
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);