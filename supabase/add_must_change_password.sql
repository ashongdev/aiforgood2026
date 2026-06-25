-- Forces new/reset staff accounts to change their password on first login.
-- Existing accounts default to false (they already have a real password set).
-- Run in the Supabase SQL Editor.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Lets a signed-in user clear their own flag once they've set a new password,
-- without granting them broader UPDATE access to user_profiles (role, table_number, etc).
CREATE OR REPLACE FUNCTION public.complete_password_change()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_profiles
  SET must_change_password = false
  WHERE id = auth.uid();
$$;
