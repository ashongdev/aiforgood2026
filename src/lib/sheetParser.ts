/**
 * Parses Google Sheets match data and transforms it to bracket format
 *
 * Each row in sheets has: [TEAM_A, R1, R2, space, TEAM_B, R1, R2, space, WINNER]
 */

export interface SheetMatchData {
	values: string[][];
}

export interface ParsedMatch {
	team1: string;
	team2: string;
	team1Score: number;
	team2Score: number;
	winner: number | null;
}

export function parseSheetMatch(row: string[]): ParsedMatch | null {
	if (!row || row.length < 9) return null;

	const team1 = row[0]?.trim();
	const team1R1 = parseInt(row[1] || 0, 10) || 0;
	const team1R2 = parseInt(row[2] || 0, 10) || 0;

	const team2 = row[4]?.trim();
	const team2R1 = parseInt(row[5] || 0, 10) || 0;
	const team2R2 = parseInt(row[6] || 0, 10) || 0;

	const winningTeam = row[8]?.trim();

	// Skip empty rows
	if (!team1 || !team2) return null;

	const team1Score = team1R1 + team1R2;
	const team2Score = team2R1 + team2R2;

	let winner: number | null = null;
	if (winningTeam === team1) {
		winner = 0;
	} else if (winningTeam === team2) {
		winner = 1;
	}

	return {
		team1,
		team2,
		team1Score,
		team2Score,
		winner,
	};
}

export function parseSheetData(
	data: SheetMatchData,
	baseStation: string = "A",
): ParsedMatch[] {
	return data.values
		.map((row, index) => {
			const parsed = parseSheetMatch(row);
			if (!parsed) return null;
			return parsed;
		})
		.filter((match): match is ParsedMatch => match !== null);
}
