import type { MatchWithTeams } from "./database.types";
import { tc } from "./format";

export type QualTeam = { id: string; name: string; score: number };
export type QualPairing = { rank1: number; t1: QualTeam; t2: QualTeam | null; rank2: number };

// Sum scores across rounds 1..upToRound for every team, sorted descending by score.
export function computeQualTeams(matches: MatchWithTeams[], upToRound: 1 | 2 | 3): QualTeam[] {
	const map = new Map<string, QualTeam>();
	function add(id: string | null, team: { team_name: string } | null, scores: (number | null)[]) {
		if (!id || !team) return;
		const total = scores.slice(0, upToRound).filter((v): v is number => v !== null).reduce((a, b) => a + b, 0);
		const e = map.get(id) ?? { id, name: tc(team.team_name), score: 0 };
		e.score += total;
		map.set(id, e);
	}
	for (const m of matches) {
		add(m.team_1_id, m.team_1, [m.team_1_r1, m.team_1_r2, m.team_1_r3]);
		add(m.team_2_id, m.team_2, [m.team_2_r1, m.team_2_r2, m.team_2_r3]);
	}
	return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

// Build snake pairings: rank 1 vs rank N, rank 2 vs rank N-1, …
export function buildQualPairings(teams: QualTeam[]): QualPairing[] {
	const pairs: QualPairing[] = [];
	const n = teams.length;
	for (let i = 0; i < Math.floor(n / 2); i++) {
		pairs.push({ rank1: i + 1, t1: teams[i], t2: teams[n - 1 - i], rank2: n - i });
	}
	if (n % 2 === 1) {
		const mid = Math.floor(n / 2);
		pairs.push({ rank1: mid + 1, t1: teams[mid], t2: null, rank2: 0 });
	}
	return pairs;
}

// For a given round (2|3|4), return the computed pairings zipped with match rows
// sorted by match_order. Pairing index i corresponds to the i-th match (by match_order).
export function getPairingsForRound(
	qualMatches: MatchWithTeams[],
	forRound: 2 | 3 | 4,
): Array<{ match: MatchWithTeams; t1Id: string | null; t1Name: string; t2Id: string | null; t2Name: string | null }> {
	const upToRound = (forRound - 1) as 1 | 2 | 3;
	const teams = computeQualTeams(qualMatches, upToRound);
	const pairings = buildQualPairings(teams);
	const sorted = [...qualMatches].sort((a, b) => a.match_order - b.match_order);
	return sorted.map((match, i) => ({
		match,
		t1Id: pairings[i]?.t1.id ?? null,
		t1Name: pairings[i]?.t1.name ?? "TBD",
		t2Id: pairings[i]?.t2?.id ?? null,
		t2Name: pairings[i]?.t2?.name ?? null,
	}));
}
