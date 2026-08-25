-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'scorekeeper'::text, 'referee'::text, 'mc'::text])),
  table_number integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text,
  locked boolean NOT NULL DEFAULT false,
  temp_password text,
  must_change_password boolean NOT NULL DEFAULT false,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  team_name text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['Junior'::text, 'Senior'::text])),
  country text,
  coach_name text,
  team_description text,
  team_members jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  booth_number integer,
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  phase text NOT NULL CHECK (phase = ANY (ARRAY['Qualifiers'::text, 'Pre-Quarterfinals'::text, 'Quarterfinals'::text, 'Semifinals'::text, 'Third Place'::text, 'Finals'::text])),
  category text NOT NULL CHECK (category = ANY (ARRAY['Junior'::text, 'Senior'::text])),
  team_1_id uuid,
  team_2_id uuid,
  team_1_r1 integer,
  team_1_r2 integer,
  team_1_r3 integer,
  team_1_r4 integer,
  team_2_r1 integer,
  team_2_r2 integer,
  team_2_r3 integer,
  team_2_r4 integer,
  team_1_final_points integer,
  team_2_final_points integer,
  table_number integer,
  match_order integer NOT NULL DEFAULT 0,
  winner_id uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  score_breakdown jsonb DEFAULT '{}'::jsonb,
  scheduled_time timestamp with time zone,
  team_1_r1_absent boolean NOT NULL DEFAULT false,
  team_1_r2_absent boolean NOT NULL DEFAULT false,
  team_1_r3_absent boolean NOT NULL DEFAULT false,
  team_1_r4_absent boolean NOT NULL DEFAULT false,
  team_2_r1_absent boolean NOT NULL DEFAULT false,
  team_2_r2_absent boolean NOT NULL DEFAULT false,
  team_2_r3_absent boolean NOT NULL DEFAULT false,
  team_2_r4_absent boolean NOT NULL DEFAULT false,
  scores_approved boolean NOT NULL DEFAULT false,
  scheduled_time_r2 timestamp with time zone,
  scheduled_time_r3 timestamp with time zone,
  scheduled_time_r4 timestamp with time zone,
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_team_1_id_fkey FOREIGN KEY (team_1_id) REFERENCES public.teams(id),
  CONSTRAINT matches_team_2_id_fkey FOREIGN KEY (team_2_id) REFERENCES public.teams(id),
  CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id)
);
CREATE TABLE public.phase_locks (
  phase text NOT NULL,
  category text NOT NULL,
  lock_type text CHECK (lock_type IS NULL OR (lock_type = ANY (ARRAY['full'::text, 'scores'::text]))),
  locked_at timestamp with time zone NOT NULL DEFAULT now(),
  scorekeeper_locked boolean NOT NULL DEFAULT false,
  CONSTRAINT phase_locks_pkey PRIMARY KEY (phase, category)
);
CREATE TABLE public.score_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid,
  changed_by uuid,
  scorer_email text,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  phase text,
  category text,
  team_1_name text,
  team_2_name text,
  changes jsonb NOT NULL,
  CONSTRAINT score_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT score_audit_log_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT score_audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.announcements (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  message text NOT NULL,
  importance text NOT NULL DEFAULT 'info'::text CHECK (importance = ANY (ARRAY['info'::text, 'warning'::text, 'urgent'::text])),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id)
);