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
		ReactGA.event({ category: "User", action: `Matchup Clicked:${match.team1} vs ${match.team2}` });
		onClick();
	};

	const showRankings = sheetName === "PRE_QUARTERS" || sheetName === "QUARTERS";
	const team1Rank = rankingMap[match.team1];
	const team2Rank = rankingMap[match.team2];
	const decided = match.winner !== null;
	const team1Wins = decided && match.winner === 0;
	const team2Wins = decided && match.winner === 1;
	const showStats = !!onTeamBreakdown && !!(match.team1Id || match.team2Id);

	return (
		<div className="flex flex-col">
			{/* ── Clickable match card ─────────────────────────── */}
			<motion.div
				whileHover={{ x: 4, y: 4 }}
				whileTap={{ scale: 0.98 }}
				onClick={handleClick}
				className="w-full border-2 border-editorial-ink bg-white shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] overflow-hidden cursor-pointer active:shadow-none transition-shadow"
			>
				{/* Table header */}
				<div className="flex items-center justify-between px-3 py-1.5 bg-editorial-ink">
					<span className="text-[10px] font-black uppercase tracking-widest text-white/50">
						Table
					</span>
					<span className="font-mono text-xs font-black text-editorial-gold">
						{match.station}
					</span>
				</div>

				{/* Teams — horizontal split */}
				<div className="flex min-h-22">
					{/* Team 1 */}
					<div className={`flex-1 flex flex-col items-center justify-center gap-1 px-3 py-4 text-center transition-opacity ${
						team2Wins ? "opacity-35" : ""
					} ${team1Wins ? "bg-editorial-gold/10 border-r-2 border-editorial-gold" : "border-r border-editorial-ink/20"}`}>
						{getCountryFlag(match.team1Country) && (
							<span className="text-base leading-none">{getCountryFlag(match.team1Country)}</span>
						)}
						<span className="text-sm font-black text-editorial-ink leading-tight line-clamp-2">
							{match.team1}
						</span>
						{showRankings && team1Rank && (
							<span className="text-[10px] font-black px-1.5 py-0.5 bg-editorial-gold text-white">
								#{team1Rank}
							</span>
						)}
						<span className={`font-mono text-2xl font-black leading-none mt-1 ${team1Wins ? "text-editorial-gold" : "text-editorial-ink"}`}>
							<AnimatedScore value={match.team1Score ?? 0} />
						</span>
						{team1Wins && (
							<span className="text-[9px] font-black uppercase tracking-widest text-editorial-gold mt-0.5">Winner</span>
						)}
					</div>

					{/* VS divider */}
					<div className="flex flex-col items-center justify-center px-2 border-x border-editorial-ink/15 bg-gray-50">
						<span className="text-[10px] font-black italic text-gray-400">VS</span>
					</div>

					{/* Team 2 */}
					<div className={`flex-1 flex flex-col items-center justify-center gap-1 px-3 py-4 text-center transition-opacity ${
						team1Wins ? "opacity-35" : ""
					} ${team2Wins ? "bg-editorial-gold/10 border-l-2 border-editorial-gold" : "border-l border-editorial-ink/20"}`}>
						{getCountryFlag(match.team2Country) && (
							<span className="text-base leading-none">{getCountryFlag(match.team2Country)}</span>
						)}
						<span className="text-sm font-black text-editorial-ink leading-tight line-clamp-2">
							{match.team2}
						</span>
						{showRankings && team2Rank && (
							<span className="text-[10px] font-black px-1.5 py-0.5 bg-editorial-gold text-white">
								#{team2Rank}
							</span>
						)}
						<span className={`font-mono text-2xl font-black leading-none mt-1 ${team2Wins ? "text-editorial-gold" : "text-editorial-ink"}`}>
							<AnimatedScore value={match.team2Score ?? 0} />
						</span>
						{team2Wins && (
							<span className="text-[9px] font-black uppercase tracking-widest text-editorial-gold mt-0.5">Winner</span>
						)}
					</div>
				</div>

				{/* Tap hint */}
				<div className="px-3 py-1.5 border-t border-editorial-ink/10 bg-gray-50 flex items-center justify-center">
					<span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
						Tap to view match
					</span>
				</div>
			</motion.div>

			{/* ── Stats footer — outside the card, no click conflict ── */}
			{showStats && (
				<div className="flex border-2 border-t-0 border-editorial-ink/30">
					{match.team1Id ? (
						<button
							onClick={() => onTeamBreakdown!(match.team1Id!, match.team1)}
							className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-editorial-ink hover:bg-editorial-gold hover:text-white transition-colors border-r border-editorial-ink/20 truncate px-2"
						>
							📊 {match.team1}
						</button>
					) : <div className="flex-1" />}
					{match.team2Id ? (
						<button
							onClick={() => onTeamBreakdown!(match.team2Id!, match.team2)}
							className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-editorial-ink hover:bg-editorial-gold hover:text-white transition-colors truncate px-2"
						>
							📊 {match.team2}
						</button>
					) : <div className="flex-1" />}
				</div>
			)}
		</div>
	);
}
