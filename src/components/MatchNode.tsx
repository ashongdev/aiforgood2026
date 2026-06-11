import { motion } from "motion/react";
import ReactGA from "react-ga4";
import { getCountryFlag } from "../lib/countryFlag";
import { AnimatedScore } from "./AnimatedScore";

interface MatchNodeProps {
	match: {
		id: string;
		team1: string;
		team2: string;
		team1Id?: string | null;
		team2Id?: string | null;
		team1Country?: string | null;
		team2Country?: string | null;
		team1Score: number | null;
		team2Score: number | null;
		winner: number | null;
		station: string;
		isBye?: boolean;
	};
	sheetName?: string;
	rankingMap?: Record<string, number>;
	onClick: () => void;
	onTeamBreakdown?: (teamId: string, teamName: string) => void;
}

export function MatchNode({
	match,
	sheetName,
	rankingMap = {},
	onClick,
	onTeamBreakdown,
}: MatchNodeProps) {
	const handleClick = () => {
		ReactGA.event({
			category: "User",
			action: `Matchup Clicked:${match.team1} vs ${match.team2}`,
		});
		onClick();
	};

	// Determine if we should show ranking badges
	const showRankings =
		sheetName === "PRE_QUARTERS" || sheetName === "QUARTERS";
	const team1Rank = rankingMap[match.team1];
	const team2Rank = rankingMap[match.team2];

	// Determine if we should show winner/loser fading (only for non-ranking bracket phases)
	const showWinnerFading = !showRankings && match.winner !== null;

	return (
		<motion.div
			whileHover={{ x: 4, y: 4 }}
			whileTap={{ scale: 0.98 }}
			onClick={handleClick}
			className="w-full border-2 border-editorial-ink bg-white shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] overflow-hidden cursor-pointer active:shadow-none transition-shadow h-full"
		>
			<div className="flex justify-between items-center px-4 py-2 border-b-2 border-editorial-ink bg-slate-50">
				<span className="text-[10px] font-black uppercase tracking-[0.2em] text-editorial-gold">
					STAGE
				</span>
				<span className="font-mono text-[10px] font-bold py-0.5 px-2 border border-editorial-ink">
					TABLE {match.station}
				</span>
			</div>
			<div className="p-6 space-y-5">
				{/* Team 1 */}
				<div
					className={`flex justify-between items-center transition-opacity ${
						showWinnerFading && match.winner === 1
							? "opacity-40"
							: ""
					}`}
				>
					<span className="flex items-center gap-2 min-w-0">
						{getCountryFlag(match.team1Country) && (
							<span className="text-2xl leading-none shrink-0" aria-label={match.team1Country ?? ""}>
								{getCountryFlag(match.team1Country)}
							</span>
						)}
						<span className="flex items-center gap-2 min-w-0 flex-wrap">
							<span className="font-serif text-2xl font-black italic tracking-tight leading-tight truncate">
								{match.team1}
							</span>
							{showRankings && team1Rank && (
								<span className="inline-block px-2 py-0.5 bg-editorial-gold text-white text-xs font-black rounded">
									#{team1Rank}
								</span>
							)}
							{onTeamBreakdown && match.team1Id && (
								<button
									onClick={(e) => { e.stopPropagation(); onTeamBreakdown(match.team1Id!, match.team1); }}
									className="shrink-0 text-[10px] font-black uppercase tracking-widest text-editorial-gold border border-editorial-gold px-1.5 py-0.5 hover:bg-editorial-gold hover:text-white transition-colors"
								>
									Stats
								</button>
							)}
						</span>
					</span>
					<span className="font-mono text-xl font-black shrink-0 ml-2">
						{match.team1Score ? (
							<AnimatedScore value={match.team1Score} />
						) : (
							0
						)}
					</span>
				</div>

				{/* VS divider */}
				<div className="flex items-center gap-4 py-2">
					<div className="h-0.5 flex-1 bg-editorial-ink" />
					<span className="text-[11px] font-black italic text-editorial-gold">
						VS
					</span>
					<div className="h-0.5 flex-1 bg-editorial-ink" />
				</div>

				{/* Team 2 */}
				<div
					className={`flex justify-between items-center transition-opacity ${
						showWinnerFading && match.winner === 0
							? "opacity-40"
							: ""
					}`}
				>
					<span className="flex items-center gap-2 min-w-0">
						{getCountryFlag(match.team2Country) && (
							<span className="text-2xl leading-none shrink-0" aria-label={match.team2Country ?? ""}>
								{getCountryFlag(match.team2Country)}
							</span>
						)}
						<span className="flex items-center gap-2 min-w-0 flex-wrap">
							<span className="font-serif text-2xl font-black italic tracking-tight leading-tight truncate">
								{match.team2}
							</span>
							{showRankings && team2Rank && (
								<span className="inline-block px-2 py-0.5 bg-editorial-gold text-white text-xs font-black rounded">
									#{team2Rank}
								</span>
							)}
							{onTeamBreakdown && match.team2Id && (
								<button
									onClick={(e) => { e.stopPropagation(); onTeamBreakdown(match.team2Id!, match.team2); }}
									className="shrink-0 text-[10px] font-black uppercase tracking-widest text-editorial-gold border border-editorial-gold px-1.5 py-0.5 hover:bg-editorial-gold hover:text-white transition-colors"
								>
									Stats
								</button>
							)}
						</span>
					</span>
					<span className="font-mono text-xl font-black shrink-0 ml-2">
						{match.team2Score ? (
							<AnimatedScore value={match.team2Score} />
						) : (
							0
						)}
					</span>
				</div>
			</div>
		</motion.div>
	);
}
