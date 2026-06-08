-- Comprehensive fix for score update failures.
-- Safe to run multiple times (idempotent).
-- Run this in the Supabase SQL Editor.

-- ── 1. Ensure required columns exist ──────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.phase_locks
  ADD COLUMN IF NOT EXISTS scorekeeper_locked boolean NOT NULL DEFAULT false;

-- ── 2. Clear all stale scorekeeper phase locks ────────────────────────────────
-- If a phase was locked during testing it silently blocks ALL writes.

UPDATE public.phase_locks SET scorekeeper_locked = false;

-- ── 3. Ensure get_my_role() helper exists ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- ── 4. Fix the matches UPDATE policy ──────────────────────────────────────────
-- Admins now bypass the scorekeeper phase lock so they can always enter scores.

DROP POLICY IF EXISTS "matches: authenticated update" ON public.matches;

CREATE POLICY "matches: authenticated update"
  ON public.matches FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    -- Personally suspended scorekeepers are always blocked
    AND NOT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND locked = true
    )
    -- Admins bypass the phase scorekeeper lock; scorekeepers respect it
    AND (
      public.get_my_role() = 'admin'
      OR NOT EXISTS (
        SELECT 1 FROM public.phase_locks pl
        WHERE pl.phase = phase
          AND pl.category = category
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
        WHERE pl.phase = phase
          AND pl.category = category
          AND pl.scorekeeper_locked = true
      )
    )
  );

-- ── 5. Make the audit log trigger failsafe ────────────────────────────────────
-- Previously, any failure inside log_score_changes() (missing column, missing
-- table, FK violation) would roll back the entire UPDATE — silently killing
-- score saves. Wrap the body in EXCEPTION WHEN OTHERS so audit failures
-- never block the actual score write.

CREATE OR REPLACE FUNCTION public.log_score_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score_cols  text[]  := ARRAY[
    'team_1_r1','team_1_r2','team_1_r3','team_1_r4',
    'team_2_r1','team_2_r2','team_2_r3','team_2_r4'
  ];
  col         text;
  changes     jsonb   := '{}';
  old_val     integer;
  new_val     integer;
  v_user_id   uuid;
  v_email     text;
  t1_name     text;
  t2_name     text;
BEGIN
  -- Wrap everything so an audit failure never rolls back the score write
  BEGIN

    BEGIN
      v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    IF v_user_id IS NOT NULL THEN
      SELECT email INTO v_email
      FROM public.user_profiles
      WHERE id = v_user_id;
    END IF;

    FOREACH col IN ARRAY score_cols LOOP
      EXECUTE format('SELECT ($1).%I::integer', col) INTO old_val USING OLD;
      EXECUTE format('SELECT ($1).%I::integer', col) INTO new_val USING NEW;
      IF old_val IS DISTINCT FROM new_val THEN
        changes := changes || jsonb_build_object(
          col,
          jsonb_build_object('from', old_val, 'to', new_val)
        );
      END IF;
    END LOOP;

    IF changes != '{}' THEN
      SELECT team_name INTO t1_name FROM public.teams WHERE id = NEW.team_1_id;
      SELECT team_name INTO t2_name FROM public.teams WHERE id = NEW.team_2_id;

      INSERT INTO public.score_audit_log (
        match_id, changed_by, scorer_email,
        phase, category, team_1_name, team_2_name, changes
      ) VALUES (
        NEW.id, v_user_id, v_email,
        NEW.phase, NEW.category, t1_name, t2_name, changes
      );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Audit log failure must never block score writes
    RAISE WARNING 'log_score_changes: audit failed (match_id=%, err=%)', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
