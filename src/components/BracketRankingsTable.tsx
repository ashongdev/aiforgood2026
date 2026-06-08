import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactGA from "react-ga4";
import { AnimatedScore } from "./AnimatedScore";
import {
	LockedScoreboardScreen,
	isScoreboardLocked,
} from "./LockedScoreboardScreen";

function AnimatedPanel({
	isOpen,
	children,
}: {
	isOpen: boolean;
	children: React.ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState(0);

	useEffect(() => {
		if (ref.current) {
			setHeight(isOpen ? ref.current.scrollHeight : 0);
		}
	}, [isOpen, children]);

	return (
		<div
			style={{
				height: `${height}px`,
				overflow: "hidden",
				transition: "height 250ms cubic-bezier(0.4, 0, 0.2, 1)",
			}}
		>
			<div ref={ref}>{children}</div>
		</div>
	);
}

interface BracketTeam {
	rank: number;
	team: string;
	score: number;
}

interface BracketRankingsTableProps {
	data: string[][];
	progressCount?: number;
}


export function BracketRankingsTable({
	data,
	progressCount = 0,
}: BracketRankingsTableProps) {
	// All hooks MUST be called unconditionally, before any returns or conditionals
	const [selectedTeam, setSelectedTeam] = useState<BracketTeam | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// Now we can do early returns
	if (!data || data.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-sm text-red-600">
					No bracket data available
				</p>
			</div>
		);
	}

	// Check if scoreboard is locked
	if (isScoreboardLocked(data)) {
		return <LockedScoreboardScreen />;
	}

	// Parse rankings from column G (index 6) and find team scores
	const teams: BracketTeam[] = data
		.map((row, index) => {
			const rankingTeam = row[6]?.trim() || ""; // RANKINGS column (G/index 6)

			if (!rankingTeam) return null;

			// Find this team's actual data row (where column A or D matches the ranking name)
			const teamDataRow = data.find(
				(r) =>
					r[0]?.trim() === rankingTeam.trim() ||
					r[3]?.trim() === rankingTeam.trim(),
			);

			// Use the team's actual row data if found, otherwise fallback to current row
			const scoreRow = teamDataRow || row;

			// Find the advancing team's score from the actual data row
			let score = 0;
			if (scoreRow[0]?.trim() === rankingTeam) {
				// Team is in column A, score is in column B (index 1)
				score = parseInt(scoreRow[1] || "0", 10) || 0;
			} else if (scoreRow[3]?.trim() === rankingTeam) {
				// Team is in column D, score is in column E (index 4)
				score = parseInt(scoreRow[4] || "0", 10) || 0;
			}

			return {
				rank: index + 1,
				team: rankingTeam,
				score,
			};
		})
		.filter((t) => t !== null) as BracketTeam[];

	const totalPages = Math.ceil(teams.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const pageTeams = teams.slice(startIndex, endIndex);

	const handleNextPage = () => {
		if (currentPage < totalPages) setCurrentPage(currentPage + 1);
	};

	const handlePrevPage = () => {
		if (currentPage > 1) setCurrentPage(currentPage - 1);
	};

	return (
		<div className="w-full max-w-6xl mx-auto space-y-0">
			{/* ── Title block ── */}
			<div className="px-4 md:px-0 pb-5">
				<h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-editorial-ink">
					Advancing Teams
				</h2>
				<div className="w-16 h-1 bg-editorial-gold mt-3 mb-3" />
				<p className="text-xs text-gray-500 flex items-center gap-2">
					<span className="inline-block w-3 h-3 bg-editorial-gold" />
					tap a row to expand
				</p>
			</div>

			{/* ── Column header ── */}
			<div className="flex items-center gap-3 px-3 py-2 bg-editorial-ink border-2 border-editorial-ink border-l-4 border-l-editorial-ink">
				<span className="w-8 shrink-0 text-[10px] font-black uppercase tracking-widest text-white/60">
					#
				</span>
				<span className="flex-1 min-w-0 text-[10px] font-black uppercase tracking-widest text-white/60">
					Team
				</span>
				<span className="shrink-0 w-12 text-right text-[10px] font-black uppercase tracking-widest text-white/60">
					Score
				</span>
			</div>

			{/* ── Ranked list ── */}
			<div className="space-y-0">
				{pageTeams.map((team, index) => {
					const actualIndex = startIndex + index;
					const isExpanded = selectedTeam?.team === team.team;

					return (
						<div key={actualIndex}>
							{/* Row */}
							<button
								onClick={() => {
									ReactGA.event({
										category: "User",
										action: `Team Clicked:${team.team}`,
									});
									setSelectedTeam(isExpanded ? null : team);
								}}
								className={`w-full text-left flex items-center gap-3 px-3 py-3 border-t border-b-0 border-r-0 border-editorial-ink/20 border-l-4 transition-colors ${
									isExpanded
										? "bg-editorial-ink text-white border-l-editorial-gold"
										: actualIndex < progressCount
											? "bg-white hover:bg-editorial-gold/5 border-l-editorial-gold"
											: "bg-white hover:bg-editorial-gold/5"
								}`}
							>
								{/* Rank badge */}
								<span
									className={`w-8 h-8 shrink-0 flex items-center justify-center border-2 font-black text-sm ${
										isExpanded
											? "border-white text-white"
											: "border-editorial-ink text-editorial-ink"
									}`}
								>
									{actualIndex + 1}
								</span>

								{/* Team name */}
								<span className="flex-1 min-w-0 flex items-center gap-2">
									<span
										className={`text-sm font-semibold truncate ${
											isExpanded
												? "text-white"
												: "text-editorial-ink"
										}`}
									>
										{team.team}
									</span>
								</span>

								{/* Score */}
								<span
									className={`shrink-0 w-12 text-right text-sm font-black ${
										isExpanded
											? "text-editorial-gold"
											: team.score > 0
												? "text-editorial-green"
												: "text-gray-400"
									}`}
								>
									<AnimatedScore
										value={team.score.toString()}
									/>
								</span>
							</button>

							{/* Inline expanded detail — animated */}
							<AnimatedPanel isOpen={isExpanded}>
								<div className="bg-white border-t border-editorial-ink/10 px-4 py-4">
									<div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
										<span>
											Rank{" "}
											<strong className="text-editorial-ink">
												{actualIndex + 1}
											</strong>{" "}
											of {teams.length}
										</span>
									</div>
								</div>
							</AnimatedPanel>
						</div>
					);
				})}
			</div>

			{/* ── Pagination ── */}
			<div className="pt-4 px-4 md:px-0">
				<div className="flex items-center justify-start gap-2">
					<button
						onClick={handlePrevPage}
						disabled={currentPage === 1}
						className="flex items-center justify-center w-9 h-9 border-2 border-editorial-ink bg-white hover:bg-editorial-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
					<button
						onClick={handleNextPage}
						disabled={currentPage === totalPages}
						className="flex items-center justify-center w-9 h-9 border-2 border-editorial-ink bg-white hover:bg-editorial-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
					>
						<ChevronRight className="h-4 w-4" />
					</button>
				</div>
				<p className="text-[10px] text-gray-500 mt-2">
					{startIndex + 1}–{Math.min(endIndex, teams.length)} of{" "}
					{teams.length} teams
				</p>
			</div>
		</div>
	);
}
