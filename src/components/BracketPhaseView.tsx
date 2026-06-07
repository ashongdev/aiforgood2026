import { useState } from "react";
import type { Match } from "../lib/matchService";
import { BracketList } from "./BracketList";
import { BracketRankingsTable } from "./BracketRankingsTable";
import {
	LockedScoreboardScreen,
	isScoreboardLocked,
} from "./LockedScoreboardScreen";

interface BracketPhaseViewProps {
	data: string[][];
	matches: Match[];
	rawData?: string[][];
	sheetName?: string;
	onSelectMatch: (match: Match) => void;
}

export function BracketPhaseView({
	data,
	matches,
	rawData,
	sheetName,
	onSelectMatch,
}: BracketPhaseViewProps) {
	// All hooks MUST be called unconditionally first
	const [viewMode, setViewMode] = useState<"rankings" | "matchups">(
		"rankings",
	);

	// Now we can do early returns
	if (rawData && isScoreboardLocked(rawData)) {
		return <LockedScoreboardScreen />;
	}

	// Determine progress count based on phase
	const progressCount =
		sheetName === "PRE_QUARTERS" ? 8 : sheetName === "QUARTERS" ? 4 : 0;

	// Build ranking map for teams (team name -> ranking position)
	const rankingMap: Record<string, number> = {};
	if (data && data.length > 0) {
		data.forEach((row, index) => {
			const rankingTeam = row[6]?.trim(); // RANKINGS column (G/index 6)
			if (rankingTeam) {
				rankingMap[rankingTeam] = index + 1; // 1-indexed position
			}
		});
	}

	return (
		<div className="w-full space-y-6">
			{/* Tab Toggle */}
			<div className="flex justify-center gap-2 px-4 md:px-0 pb-4">
				<button
					onClick={() => setViewMode("rankings")}
					className={`px-6 py-2 font-bold uppercase tracking-widest text-sm border-2 transition-colors ${
						viewMode === "rankings"
							? "bg-editorial-ink text-white border-editorial-ink"
							: "bg-white text-editorial-ink border-editorial-ink hover:bg-editorial-gold/10"
					}`}
				>
					Rankings
				</button>
				<button
					onClick={() => setViewMode("matchups")}
					className={`px-6 py-2 font-bold uppercase tracking-widest text-sm border-2 transition-colors ${
						viewMode === "matchups"
							? "bg-editorial-ink text-white border-editorial-ink"
							: "bg-white text-editorial-ink border-editorial-ink hover:bg-editorial-gold/10"
					}`}
				>
					Matchups
				</button>
			</div>

			{/* Rankings View */}
			{viewMode === "rankings" && (
				<BracketRankingsTable
					data={data}
					progressCount={progressCount}
				/>
			)}

			{/* Matchups View */}
			{viewMode === "matchups" && (
				<BracketList
					matches={matches}
					rawData={rawData}
					sheetName={sheetName}
					rankingMap={rankingMap}
					onSelectMatch={onSelectMatch}
				/>
			)}
		</div>
	);
}
