-- Allow approved users to view all casino balances for the leaderboard
CREATE POLICY "Approved can view all balances"
ON public.casino_balances
FOR SELECT
TO authenticated
USING (is_approved(auth.uid()));

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own balance" ON public.casino_balances;