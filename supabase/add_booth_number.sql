-- Add booth_number column to teams table
-- Range: 600–667, unique per team

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS booth_number INTEGER;

-- Ensure no two teams share a booth number
CREATE UNIQUE INDEX IF NOT EXISTS teams_booth_number_unique
  ON teams(booth_number)
  WHERE booth_number IS NOT NULL;
