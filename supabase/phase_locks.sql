-- ============================================================
-- Phase Locks Migration
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Allows admins to lock spectator views per phase/category.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.phase_locks (
    phase    TEXT NOT NULL,
    category TEXT NOT NULL,
    lock_type TEXT NOT NULL CHECK (lock_type IN ('full', 'scores')),
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (phase, category)
);

ALTER TABLE public.phase_locks ENABLE ROW LEVEL SECURITY;

-- Spectators (anon) can read locks to know what to hide
CREATE POLICY "phase_locks_anon_select"
    ON public.phase_locks FOR SELECT TO anon USING (true);

-- Authenticated users (admins, scorekeepers) can manage locks
CREATE POLICY "phase_locks_auth_all"
    ON public.phase_locks FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- Subscribe to live lock changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.phase_locks;
