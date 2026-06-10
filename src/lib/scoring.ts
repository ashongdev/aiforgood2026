import type { Category } from './database.types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoundBreakdown {
  // Mission 1: Cultivation and Selective Irrigation
  m1_seeds_correct: number      // +10 (J) / +5 (S) each
  m1_seeds_subdivision: number  // 0 (J) / +10 (S) each
  m1_seeds_misplaced: number    // 0 (J) / -5 (S) each
  m1_plots_watered: number      // +30 both
  m1_empty_watered: number      // 0 (J) / -10 (S) each
  // Mission 2: Harvesting and Sorting
  m2_fruits_moved: number       // +5 both (red or black moved from adhesive circle)
  m2_red_in_fruits: number      // +5 both
  m2_red_in_waste: number       // 0 (J) / -5 (S) each
  m2_black_in_waste: number     // +10 both
  m2_black_in_fruits: number    // 0 (J) / -10 (S) each
  m2_green_moved: number        // 0 (J) / -5 (S) each
  // Penalties
  p_unauthorized: number        // -20 both
  p_field_manip: number         // -20 both
  p_seeds_outside: number       // -20 both
  p_robot_exit: number          // -20 both
}

export const EMPTY_BREAKDOWN: RoundBreakdown = {
  m1_seeds_correct: 0, m1_seeds_subdivision: 0, m1_seeds_misplaced: 0,
  m1_plots_watered: 0, m1_empty_watered: 0,
  m2_fruits_moved: 0, m2_red_in_fruits: 0, m2_red_in_waste: 0,
  m2_black_in_waste: 0, m2_black_in_fruits: 0, m2_green_moved: 0,
  p_unauthorized: 0, p_field_manip: 0, p_seeds_outside: 0, p_robot_exit: 0,
}

export interface ScoringItem {
  key: keyof RoundBreakdown
  label: string
  pts: (c: Category) => number
  icon: string
}

export const MISSION_1_ITEMS: ScoringItem[] = [
  { key: 'm1_seeds_correct',    label: 'Seed in correct colored plot',   pts: c => c === 'Junior' ? 10 : 5,   icon: '🌱' },
  { key: 'm1_plots_watered',    label: 'Seeded plot correctly watered',  pts: () => 30,                       icon: '💧' },
  { key: 'm1_seeds_subdivision',label: 'Seed fully in 2×3 subdivision', pts: c => c === 'Junior' ? 0 : 10,   icon: '📦' },
  { key: 'm1_seeds_misplaced',  label: 'Misplaced seed',                 pts: c => c === 'Junior' ? 0 : -5,  icon: '↩️' },
  { key: 'm1_empty_watered',    label: 'Empty plot watered',             pts: c => c === 'Junior' ? 0 : -10, icon: '⚠️' },
]

export const MISSION_2_ITEMS: ScoringItem[] = [
  { key: 'm2_fruits_moved',    label: 'Red/black fruit moved from circle', pts: () => 5,                       icon: '🍎' },
  { key: 'm2_red_in_fruits',   label: 'Red fruit → Fruits zone',           pts: () => 5,                       icon: '🔴' },
  { key: 'm2_black_in_waste',  label: 'Black fruit → Waste zone',          pts: () => 10,                      icon: '⚫' },
  { key: 'm2_red_in_waste',    label: 'Red fruit → Waste zone',            pts: c => c === 'Junior' ? 0 : -5,  icon: '🗑️'  },
  { key: 'm2_black_in_fruits', label: 'Black fruit → Fruits zone',         pts: c => c === 'Junior' ? 0 : -10, icon: '🚫' },
  { key: 'm2_green_moved',     label: 'Green fruit moved',                 pts: c => c === 'Junior' ? 0 : -5,  icon: '🟢' },
]

export const PENALTY_ITEMS: ScoringItem[] = [
  { key: 'p_unauthorized',  label: 'Unauthorized robot interaction',  pts: () => -20, icon: '🤖' },
  { key: 'p_field_manip',   label: 'Field / piece manipulation',      pts: () => -20, icon: '✋' },
  { key: 'p_seeds_outside', label: 'Seeds passed outside start zone', pts: () => -20, icon: '📍' },
  { key: 'p_robot_exit',    label: 'Robot exits field',               pts: () => -20, icon: '🚨' },
]

export const ALL_SCORING_ITEMS: ScoringItem[] = [
  ...MISSION_1_ITEMS, ...MISSION_2_ITEMS, ...PENALTY_ITEMS,
]

export function computeRoundScore(b: RoundBreakdown, category: Category): number {
  return ALL_SCORING_ITEMS.reduce((sum, item) => sum + b[item.key] * item.pts(category), 0)
}

// JSONB key for a given team/round in score_breakdown column
export function breakdownKey(team: 1 | 2, round: 1 | 2 | 3 | 4): string {
  return `t${team}r${round}`
}

export function hasAnyScore(b: RoundBreakdown): boolean {
  return ALL_SCORING_ITEMS.some(item => b[item.key] > 0)
}
