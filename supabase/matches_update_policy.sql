-- Enforce both personal lock and phase-level scorekeeper lock at the DB layer.
-- Run in the Supabase SQL editor after scorekeeper_lock.sql and scorekeeper_phase_lock.sql.

DROP POLICY IF EXISTS "matches: authenticated update" ON public.matches;

CREATE POLICY "matches: authenticated update"
  ON public.matches FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    -- Block personally suspended scorekeepers
    AND NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND locked = true
    )
    -- Block writes to scorekeeper-locked phases
    AND NOT EXISTS (
      SELECT 1 FROM public.phase_locks pl
      WHERE pl.phase = phase
        AND pl.category = category
        AND pl.scorekeeper_locked = true
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND locked = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.phase_locks pl
      WHERE pl.phase = phase
        AND pl.category = category
        AND pl.scorekeeper_locked = true
    )
  );
