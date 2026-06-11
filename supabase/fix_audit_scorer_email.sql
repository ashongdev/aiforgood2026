-- Fix: referee (and other staff) audit entries showing no scorer_email.
--
-- Root cause: the trigger looks up scorer_email from public.user_profiles.
-- Accounts created before the email column was added, or where the Edge
-- Function insert failed silently, have email = NULL there.
-- The INSERT then records scorer_email = NULL, so the admin cannot tell
-- who made the change.
--
-- Run this in the Supabase SQL Editor.

-- ── 1. Backfill missing emails for existing accounts ──────────────────────────

UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id
  AND up.email IS NULL;

-- ── 2. Update trigger to fall back to auth.users if profile email is null ─────

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
  BEGIN

    BEGIN
      v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    IF v_user_id IS NOT NULL THEN
      -- Primary: user_profiles (denormalized, fastest)
      SELECT email INTO v_email
      FROM public.user_profiles
      WHERE id = v_user_id;

      -- Fallback: auth.users (always has the email, even if profile is stale)
      IF v_email IS NULL THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE id = v_user_id;
      END IF;
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
    RAISE WARNING 'log_score_changes: audit failed (match_id=%, err=%)', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
