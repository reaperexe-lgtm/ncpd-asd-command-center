CREATE POLICY "Admins can update any balance"
ON public.casino_balances
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));