-- Add 'referee' role and scheduled_time to matches.
-- Run in Supabase SQL Editor.

-- ── 1. Extend user_profiles.role to include 'referee' ─────────────────────────

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'scorekeeper', 'referee'));

-- ── 2. Add scheduled_time to matches ─────────────────────────────────────────

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS scheduled_time timestamptz;

-- ── 3. Expose scheduled_time via Realtime ─────────────────────────────────────
-- matches table is already in supabase_realtime publication — no action needed.
