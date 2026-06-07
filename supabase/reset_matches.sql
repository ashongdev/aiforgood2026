-- ============================================================
-- Reset Script — wipe all match data, keep teams.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- ============================================================

-- 1. Remove all phase locks (scores/full locks tied to phases)
DELETE FROM public.phase_locks;

-- 2. Remove all matches (scores, round data, winners)
DELETE FROM public.matches;

-- Teams are intentionally left untouched.

-- Confirm row counts after reset
SELECT 'phase_locks' AS table_name, COUNT(*) AS remaining FROM public.phase_locks
UNION ALL
SELECT 'matches',                    COUNT(*)              FROM public.matches
UNION ALL
SELECT 'teams (preserved)',          COUNT(*)              FROM public.teams;
