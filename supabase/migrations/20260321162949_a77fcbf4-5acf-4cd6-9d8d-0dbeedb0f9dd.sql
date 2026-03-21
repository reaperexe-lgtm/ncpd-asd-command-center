-- Ensure one balance row per user
ALTER TABLE public.casino_balances
ADD CONSTRAINT casino_balances_user_id_unique UNIQUE (user_id);

-- Allow every authenticated user to read their own balance
CREATE POLICY "Users can view own balance"
ON public.casino_balances
FOR SELECT
TO authenticated
USING (user_id = auth.uid());