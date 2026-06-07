-- Score audit log: tracks every score cell change made by scorekeepers.
-- Run this in the Supabase SQL editor AFTER add_email_to_profiles.sql.

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.score_audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      uuid        REFERENCES public.matches(id) ON DELETE SET NULL,
  changed_by    uuid        REFERENCES auth.users(id)    ON DELETE SET NULL,
  scorer_email  text,                 -- denormalized for audit display
  changed_at    timestamptz NOT NULL DEFAULT now(),
  phase         text,
  category      text,
  team_1_name   text,                 -- denormalized so old match data is preserved
  team_2_name   text,
  -- JSON: { "team_1_r2": { "from": 4, "to": 7 }, ... }
  changes       jsonb       NOT NULL
);

ALTER TABLE public.score_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit trail
CREATE POLICY "audit: admin read"
  ON public.score_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- No direct inserts from the client; all writes come from the trigger below
-- (service role bypasses RLS, so no insert policy needed)

-- ── Trigger function ──────────────────────────────────────────────────────────

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
  -- Extract the authenticated user ID from the PostgREST JWT claim
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Look up their email from user_profiles (denormalize for audit display)
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email
    FROM public.user_profiles
    WHERE id = v_user_id;
  END IF;

  -- Compare each score column; build changes JSONB
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

  -- Only log rows where at least one score column changed
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

  RETURN NEW;
END;
$$;

-- Attach trigger to matches table
DROP TRIGGER IF EXISTS on_score_update ON public.matches;
CREATE TRIGGER on_score_update
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.log_score_changes();
