-- Scorekeeper lock: admins can lock/unlock individual scorekeepers in real-time.
-- Run in the Supabase SQL editor.

-- ── 1. Add locked column ──────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

-- ── 2. Allow admins to update any profile row (for locking) ──────────────────
-- The existing "profiles: self update" policy only covers own row.

CREATE POLICY "profiles: admin update any"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 3. Block locked scorekeepers from writing scores (DB enforcement) ─────────
-- Replaces the existing "matches: authenticated update" policy.

DROP POLICY IF EXISTS "matches: authenticated update" ON public.matches;

CREATE POLICY "matches: authenticated update"
  ON public.matches FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND locked = true
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND locked = true
    )
  );

-- ── 4. Enable realtime on user_profiles so lock changes push instantly ────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
