
ALTER TABLE public.profiles ADD COLUMN internal_dienstnummer text;

UPDATE public.profiles p
SET internal_dienstnummer = pp.internal_dienstnummer
FROM public.profiles_private pp
WHERE pp.user_id = p.id AND pp.internal_dienstnummer IS NOT NULL;

ALTER TABLE public.profiles_private DROP COLUMN internal_dienstnummer;
