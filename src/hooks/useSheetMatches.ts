import { Match } from "../lib/matchService";

/**
 * Parse sheet data into matches
 */
export function parseSheetMatches(
	sheetData: string[][],
	phaseId: string,
	stationPrefix: string = "A",
): Match[] {
	return sheetData
		.map((row, index) => {
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
				id: `${phaseId}-match-${index}`,
				team1,
				team2,
				team1Score,
				team2Score,
				winner,
				station: `${stationPrefix}-${String(index + 1).padStart(2, 0)}`,
			} as Match;
		})
		.filter((match): match is Match => match !== null);
}
