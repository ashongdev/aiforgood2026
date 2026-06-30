-- Lets a referee mark a team absent for a given round instead of scoring it.
-- Per Rulebook §h.5.2, a no-show forfeits that round; absences are also the
-- second tiebreak criterion (after highest score) for qualifying rankings (§h.3.2).
-- An absent round is recorded as a 0 score with the flag set, so existing
-- round-progression logic (which keys off non-null scores) keeps working.
-- Run in the Supabase SQL Editor.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS team_1_r1_absent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_1_r2_absent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_1_r3_absent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_1_r4_absent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_2_r1_absent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_2_r2_absent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_2_r3_absent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_2_r4_absent boolean NOT NULL DEFAULT false;
