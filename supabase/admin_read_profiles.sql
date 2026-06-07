-- Allow admins to read all user_profiles rows (needed for Scorekeepers tab).
-- Uses a SECURITY DEFINER function to avoid infinite recursion in RLS policies.
-- Run in the Supabase SQL editor.

-- 1. Drop any previous bad policy
DROP POLICY IF EXISTS "profiles: admin select all" ON public.user_profiles;

-- 2. Helper: reads the caller's role without triggering RLS (SECURITY DEFINER bypasses it)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 3. Select policy: own row, or caller is admin
CREATE POLICY "profiles: admin select all"
  ON public.user_profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.get_my_role() = 'admin'
  );
