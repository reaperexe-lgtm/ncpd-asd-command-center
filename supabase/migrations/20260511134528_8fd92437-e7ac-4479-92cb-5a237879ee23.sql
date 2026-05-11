ALTER TABLE public.casino_balances
  ADD COLUMN IF NOT EXISTS last_birthday_gift_year integer,
  ADD COLUMN IF NOT EXISTS last_anniversary_gift_year integer;