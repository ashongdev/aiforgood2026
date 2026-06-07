-- ============================================================
-- AI For Good Tournament — Supabase Schema
-- Run this entire file once in your Supabase SQL Editor.
-- ============================================================

-- Required extensions
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. user_profiles
--    Extends auth.users with a role and optional table assignment.
--    Rows are created manually in the Supabase dashboard after
--    creating the auth account for each referee / admin.
-- ────────────────────────────────────────────────────────────
create table public.user_profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  role          text        not null check (role in ('admin', 'scorekeeper')),
  table_number  integer,                        -- default table for scorekeepers (UI filter default only — not enforced)
  created_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. teams
-- ────────────────────────────────────────────────────────────
create table public.teams (
  id                uuid        primary key default uuid_generate_v4(),
  team_name         text        not null,
  category          text        not null check (category in ('Junior', 'Senior')),
  country           text,
  coach_name        text,
  team_description  text,
  team_members      jsonb,                      -- ["Student Name 1", "Student Name 2", ...]
  created_at        timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 3. matches
--    Single source of truth for all phases and both categories.
--    Qualifier rows use team_1_r1..r4 / team_2_r1..r4.
--    Elimination rows use team_1_final_points / team_2_final_points directly.
--    team_1_final_points and team_2_final_points are always written
--    by the frontend (never generated columns) so the formula can
--    be changed without a live migration.
-- ────────────────────────────────────────────────────────────
create table public.matches (
  id                    uuid        primary key default uuid_generate_v4(),
  phase                 text        not null check (phase in (
                          'Qualifiers',
                          'Pre-Quarterfinals',
                          'Quarterfinals',
                          'Semifinals',
                          'Third Place',
                          'Finals'
                        )),
  category              text        not null check (category in ('Junior', 'Senior')),

  -- Team slots (nullable — empty bracket slots stay NULL until admin seeds them)
  team_1_id             uuid        references public.teams(id) on delete set null,
  team_2_id             uuid        references public.teams(id) on delete set null,

  -- Qualifier round scores (4 rounds per team, all nullable)
  team_1_r1             integer,
  team_1_r2             integer,
  team_1_r3             integer,
  team_1_r4             integer,
  team_2_r1             integer,
  team_2_r2             integer,
  team_2_r3             integer,
  team_2_r4             integer,

  -- Aggregated final points — written by the frontend
  team_1_final_points   integer,
  team_2_final_points   integer,

  -- Logistics
  table_number          integer,                -- physical field/table identifier
  match_order           integer     not null default 0,

  -- Winner set manually by admin (can override the suggested winner)
  winner_id             uuid        references public.teams(id) on delete set null,

  updated_at            timestamptz not null default now()
);

-- Auto-update updated_at on any row change
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_updated_at
  before update on public.matches
  for each row execute function public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 4. Row Level Security
--    Spectators (anon key): read-only on teams + matches.
--    Scorekeepers / Admins (authenticated): can update match scores.
--    No table_number-based row filtering — filtering is UI-only.
-- ────────────────────────────────────────────────────────────

alter table public.user_profiles  enable row level security;
alter table public.teams           enable row level security;
alter table public.matches         enable row level security;

-- user_profiles: each user reads only their own row
create policy "user_profiles: own row select"
  on public.user_profiles for select
  using (auth.uid() = id);

-- teams: public read
create policy "teams: public read"
  on public.teams for select
  using (true);

-- teams: authenticated write (admin creates teams via dashboard or import)
create policy "teams: authenticated write"
  on public.teams for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- matches: public read (spectators see live scores)
create policy "matches: public read"
  on public.matches for select
  using (true);

-- matches: authenticated users can update score cells and winner_id
create policy "matches: authenticated update"
  on public.matches for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- matches: authenticated users can insert (admin seeding bracket rows)
create policy "matches: authenticated insert"
  on public.matches for insert
  with check (auth.role() = 'authenticated');

-- matches: authenticated users can delete (admin removing incorrect rows)
create policy "matches: authenticated delete"
  on public.matches for delete
  using (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────
-- 5. Realtime
--    Enables WebSocket broadcast on the matches table so
--    spectator views update instantly when a scorer saves a cell.
-- ────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.matches;
