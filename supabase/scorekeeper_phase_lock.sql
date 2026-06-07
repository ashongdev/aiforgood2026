-- Scorekeeper phase lock: admins can lock score entry per phase/category.
-- Extends the existing phase_locks table.
-- Run in the Supabase SQL editor.

-- ── 1. Make lock_type nullable ────────────────────────────────────────────────
-- A row may now exist for scorekeeper-only locks (no spectator lock active).

ALTER TABLE public.phase_locks
  ALTER COLUMN lock_type DROP NOT NULL;

ALTER TABLE public.phase_locks
  DROP CONSTRAINT IF EXISTS phase_locks_lock_type_check;

ALTER TABLE public.phase_locks
  ADD CONSTRAINT phase_locks_lock_type_check
  CHECK (lock_type IS NULL OR lock_type IN ('full', 'scores'));

-- ── 2. Add scorekeeper_locked column ─────────────────────────────────────────

ALTER TABLE public.phase_locks
  ADD COLUMN IF NOT EXISTS scorekeeper_locked BOOLEAN NOT NULL DEFAULT false;
