-- Announcements banner — singleton table (id always = 1)
-- Admin upserts to set/update, deletes to clear.

CREATE TABLE IF NOT EXISTS public.announcements (
  id          INTEGER       PRIMARY KEY DEFAULT 1,
  message     TEXT          NOT NULL,
  importance  TEXT          NOT NULL DEFAULT 'info'
                            CHECK (importance IN ('info', 'warning', 'urgent')),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT singleton CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can read
CREATE POLICY "announcements_public_read"
  ON public.announcements FOR SELECT USING (true);

-- Only authenticated users can write
CREATE POLICY "announcements_auth_write"
  ON public.announcements FOR ALL USING (auth.role() = 'authenticated');

-- Enable realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
