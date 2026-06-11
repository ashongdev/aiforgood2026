-- Add 'mc' (Master of Ceremonies) role to user_profiles constraint
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'scorekeeper', 'referee', 'mc'));
