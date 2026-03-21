
ALTER TABLE public.casino_balances ADD COLUMN IF NOT EXISTS last_daily_gift timestamp with time zone DEFAULT NULL;
