export type Role = 'admin' | 'scorekeeper' | 'referee' | 'mc'
export type Category = 'Junior' | 'Senior'
export type Phase =
  | 'Qualifiers'
  | 'Pre-Quarterfinals'
  | 'Quarterfinals'
  | 'Semifinals'
  | 'Third Place'
  | 'Finals'

export interface UserProfile {
  id: string
  role: Role
  table_number: number | null
  email: string | null
  locked: boolean
  created_at: string
}

export interface ScorekeeperProfile {
  id: string
  role: 'scorekeeper' | 'referee' | 'mc'
  table_number: number | null
  email: string | null
  locked: boolean
  temp_password: string | null
  created_at: string
}

export interface ScoreAuditLog {
  id: string
  match_id: string | null
  changed_by: string | null
  scorer_email: string | null
  changed_at: string
  phase: string | null
  category: string | null
  team_1_name: string | null
  team_2_name: string | null
  changes: Record<string, { from: number | null; to: number | null }>
}

export interface Team {
  id: string
  team_name: string
  category: Category
  country: string | null
  coach_name: string | null
  team_description: string | null
  team_members: string[] | null
  created_at: string
}

export interface Match {
  id: string
  phase: Phase
  category: Category
  team_1_id: string | null
  team_2_id: string | null
  // Qualifier round scores
  team_1_r1: number | null
  team_1_r2: number | null
  team_1_r3: number | null
  team_1_r4: number | null
  team_2_r1: number | null
  team_2_r2: number | null
  team_2_r3: number | null
  team_2_r4: number | null
  // Aggregated points (written by frontend)
  team_1_final_points: number | null
  team_2_final_points: number | null
  table_number: number | null
  match_order: number
  winner_id: string | null
  updated_at: string
  scheduled_time: string | null
  // Per-round mission breakdown (keys: "t1r1"…"t2r4", values: RoundBreakdown)
  score_breakdown: Record<string, Record<string, number>> | null
}

// Match row joined with team names (used in scorekeeper grid)
export interface MatchWithTeams extends Match {
  team_1: Team | null
  team_2: Team | null
  winner: Team | null
}

// Qualifier leaderboard entry (derived from matches)
export interface QualifierStanding {
  team: Team
  total_points: number
  cumulative_score: number
  rank: number
  matches: Match[]
}

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at'>
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>
      }
      teams: {
        Row: Team
        Insert: Omit<Team, 'id' | 'created_at'>
        Update: Partial<Omit<Team, 'id' | 'created_at'>>
      }
      matches: {
        Row: Match
        Insert: Omit<Match, 'id' | 'updated_at'>
        Update: Partial<Omit<Match, 'id' | 'updated_at'>>
      }
    }
  }
}
