import { motion } from "motion/react";
import { ByeCard } from "./ByeCard";
import {
	LockedScoreboardScreen,
	isScoreboardLocked,
} from "./LockedScoreboardScreen";
import { MatchNode } from "./MatchNode";

interface Match {
	id: string;
	team1: string;
	team2: string;
	team1Score: number | null;
	team2Score: number | null;
	team1R1: number | null;
	team1R2: number | null;
	team2R1: number | null;
	team2R2: number | null;
	winner: number | null;
	station: string;
	stage?: string;
	isBye?: boolean;
}

interface BracketListProps {
	matches: Match[];
	rawData?: string[][];
	sheetName?: string;
	rankingMap?: Record<string, number>;
	onSelectMatch: (match: Match) => void;
}

export function BracketList({
	matches,
	rawData,
	sheetName,
	rankingMap = {},
	onSelectMatch,
}: BracketListProps) {
	// Check if scoreboard is locked (rawData is passed for bracket phases)
	if (rawData && isScoreboardLocked(rawData)) {
		return <LockedScoreboardScreen />;
	}
	return (
		<motion.div
			key="list"
			initial={{ opacity: 0, scale: 0.98 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 1.02 }}
			className="w-full flex flex-col items-center max-w-6xl mx-auto"
		>
			<div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
				{matches.map((m, i) =>
					m.isBye ? (
						<ByeCard
							key={m.id || i}
							team={m.team1}
							station={m.station}
							onClick={() => onSelectMatch(m)}
						/>
					) : (
						<MatchNode
							key={m.id || i}
							match={m}
							sheetName={sheetName}
							rankingMap={rankingMap}
							onClick={() => onSelectMatch(m)}
						/>
					),
				)}
			</div>
		</motion.div>
	);
}
