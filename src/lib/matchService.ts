export interface Match {
	id: string;
	team1: string;
	team2: string;
	team1Id?: string | null;
	team2Id?: string | null;
	team1Country?: string | null;
	team2Country?: string | null;
	team1Score: number | null;
	team2Score: number | null;
	team1R1: number | null;
	team1R2: number | null;
	team2R1: number | null;
	team2R2: number | null;
	winner: number | null;
	station: string;
	isBye?: boolean;
}

/**
 * Parse raw sheet data into matches
 * For bracket phases, the structure is: TEAM A | TEAM_A_SCORE | TABLE | TEAM B | TEAM_B_SCORE | EMPTY | RANKINGS
 */
export function transformSheetDataToMatches(
	sheetData: string[][],
	phaseId: string,
	baseStation: string = "A",
): Match[] {
	return sheetData
		.map((row, index) => {
			if (!row || row.length < 3) return null;

			// For bracket phases: columns are 0=TEAM_A, 1=TEAM_A_SCORE, 2=TABLE, 3=TEAM_B, 4=TEAM_B_SCORE, 6=RANKINGS
			const team1 = row[0]?.trim();
			const team1Score = parseInt(row[1] || "0", 10) || 0;
			const tableNumber = row[2]?.trim() || "";
			const team2 = row[3]?.trim();
			const team2Score = parseInt(row[4] || "0", 10) || 0;
			const winningTeam = row[6]?.trim();

			// Skip empty rows
			if (!team1) return null;

			// Handle bye scenario (only team1, no team2)
			if (!team2) {
				return {
					id: `${phaseId}-${index}`,
					team1,
					team2: "",
					team1Score: null,
					team2Score: null,
					team1R1: null,
					team1R2: null,
					team2R1: null,
					team2R2: null,
					winner: 0, // Team 1 automatically wins a bye
					station:
						tableNumber ||
						`${baseStation}-${String(index + 1).padStart(2, "0")}`,
					isBye: true,
				} as Match;
			}

			let winner: number | null = null;
			if (winningTeam === team1) {
				winner = 0;
			} else if (winningTeam === team2) {
				winner = 1;
			}

			return {
				id: `${phaseId}-${index}`,
				team1,
				team2,
				team1Score,
				team2Score,
				team1R1: null,
				team1R2: null,
				team2R1: null,
				team2R2: null,
				winner,
				station: tableNumber || `${String(index + 1).padStart(2, "0")}`,
				isBye: false,
			} as Match;
		})
		.filter((match): match is Match => match !== null);
}
