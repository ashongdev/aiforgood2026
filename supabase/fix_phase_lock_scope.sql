-- Fix: phase lock RLS policy had a SQL scoping bug.
-- The unqualified "phase" and "category" inside the NOT EXISTS subquery
-- resolved to phase_locks.phase / phase_locks.category (the subquery's own
-- columns) instead of the matches row being evaluated, making the condition
-- always true and blocking ALL phases whenever any single phase was locked.
-- Fix: qualify with matches.phase / matches.category.
-- Run this in the Supabase SQL Editor.

DROP POLICY IF EXISTS "matches: authenticated update" ON public.matches;

CREATE POLICY "matches: authenticated update"
  ON public.matches FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND locked = true
    )
    AND (
      public.get_my_role() = 'admin'
      OR NOT EXISTS (
        SELECT 1 FROM public.phase_locks pl
        WHERE pl.phase    = matches.phase
          AND pl.category = matches.category
          AND pl.scorekeeper_locked = true
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND locked = true
    )
    AND (
      public.get_my_role() = 'admin'
      OR NOT EXISTS (
        SELECT 1 FROM public.phase_locks pl
        WHERE pl.phase    = matches.phase
          AND pl.category = matches.category
          AND pl.scorekeeper_locked = true
      )
    )
  );
