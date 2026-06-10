-- Migration: add score_breakdown JSONB column to matches
-- Stores per-team per-round mission scoring details entered by referees.
-- Keys: "t1r1", "t1r2", ... "t2r4" (team 1/2, round 1-4)
-- Values: RoundBreakdown object with 15 count fields.
-- Matches scored via the numpad (scorekeepers) will have round totals but no breakdown.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT '{}';
