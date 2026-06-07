import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactGA from "react-ga4";
import { AnimatedScore } from "./AnimatedScore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpectatorStanding {
	rank: number;
	team_name: string;
	r1: number | null;
	r2: number | null;
	r3: number | null;
	r4: number | null;
	best_round: number;
	total: number;
}

interface QualifiersTableProps {
	standings: SpectatorStanding[];
	/** How many top teams advance to the bracket (gold left border). 0 = no marker. */
	advanceCount?: number;
	/** Lock type "scores" — show team names but hide all score values. */
	scoresHidden?: boolean;
}

// ─── Animated expand panel ────────────────────────────────────────────────────

function AnimatedPanel({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState(0);

	useEffect(() => {
		if (ref.current) setHeight(isOpen ? ref.current.scrollHeight : 0);
	}, [isOpen, children]);

	return (
		<div style={{ height: `${height}px`, overflow: "hidden", transition: "height 250ms cubic-bezier(0.4,0,0.2,1)" }}>
			<div ref={ref}>{children}</div>
		</div>
	);
}

// ─── Team logo map ─────────────────────────────────────────────────────────────

const teamLogos: Record<string, string> = {
	// Senior
	Nanovolts: "/logos/Senior/Nanovolts.svg",
	"Ai Squad": "/logos/Senior/Ai Squad.svg",
	Masterminds: "/logos/Senior/Masterminds.svg",
	"Aris Eagles Senior": "/logos/Senior/Aris Eagles Senior.svg",
	"Redeemer Tech": "/logos/Senior/Redeemer Tech.svg",
	"Stemr Seniors": "/logos/Senior/Stemr Seniors.svg",
	Rookies: "/logos/Senior/Rookies.svg",
	Createch: "/logos/Senior/Create T.svg",
	"Team Applied": "/logos/Senior/Team Applied.svg",
	"Fusion Innovators": "/logos/Senior/Fusion Innovators.svg",
	"Beta Gold-St": "/logos/Senior/Beta Gold-St.svg",
	Klone: "/logos/Senior/Klone.svg",
	"Kepler-Robot": "/logos/Senior/Kepler-Robot.svg",
	Ycem: "/logos/Senior/Ycem.svg",
	"Ahtoo Alpha Gold St": "/logos/Senior/Ahtoo Alpha Gold St.svg",
	Novex: "/logos/Senior/Novex.svg",
	// Junior
	"ARIS Eagles Junior": "/logos/Junior/Aris Eagles Junior.svg",
	"Beta Gold-Jr": "/logos/Junior/BetavGold.svg",
	Bytebots: "/logos/Junior/Byetbots.svg",
	Mechminds: "/logos/Junior/Mechminds.svg",
	Varified: "/logos/Junior/Varified'.svg",
	"Redeemer Builders": "/logos/Junior/Redeemer.svg",
	"Redeemer Innovators": "/logos/Junior/Redeemer Innovatios.svg",
	"Grace Worriors": "/logos/Junior/GraceWarriors.svg",
	Nexgen: "/logos/Junior/NEXGEn.svg",
	"Bweh Trailblazers": "/logos/Junior/Bweh!.svg",
	"Tech-Titans": "/logos/Junior/Tech Titans.svg",
	"Legacy AI": "/logos/Junior/Legacy.svg",
	Glocity: "/logos/Junior/Glocity.svg",
	"Kinderkids Dream Builders": "/logos/Junior/Dreambuiold.svg",
	"STEMT Juniors": "/logos/Junior/Stemr Seniors.svg",
	"J2W Robotics Team": "/logos/Junior/J2.svg",
	"Kinderkids Robostars": "/logos/Junior/Kinderkids.svg",
	"Ahtoo Alpha Gold JT": "/logos/Junior/Ahtoo.svg",
	"Beta Gold-JT": "/logos/Junior/BetavGold.svg",
	"WIOSO Intellectuals": "/logos/Junior/WIOSS.svg",
	"Global Eagles": "/logos/Junior/Eagles.svg",
	"Guardian Lions": "/logos/Junior/Lions.svg",
	"Pro-Lego-Codex": "/logos/Junior/Pro Lego.svg",
	"The Queens": "/logos/Junior/Queens.svg",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function QualifiersTable({
	standings,
	advanceCount = 0,
	scoresHidden = false,
}: QualifiersTableProps) {
	const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	if (!standings || standings.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-sm text-gray-400">No qualifier standings available yet.</p>
			</div>
		);
	}

	const totalPages = Math.ceil(standings.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const pageStandings = standings.slice(startIndex, startIndex + itemsPerPage);

	return (
		<div className="w-full max-w-6xl mx-auto space-y-0">
			{/* Title block */}
			<div className="px-4 md:px-0 pb-5">
				<h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-editorial-ink">
					Standings
				</h2>
				<div className="w-16 h-1 bg-editorial-gold mt-3 mb-3" />
				<p className="text-xs text-gray-500 flex items-center gap-2">
					{advanceCount > 0 && (
						<>
							<span className="inline-block w-3 h-3 bg-editorial-gold" />
							Top {advanceCount} teams progress ·{" "}
						</>
					)}
					{scoresHidden ? (
						<span className="flex items-center gap-1 text-amber-600 font-semibold">
							<Lock size={10} /> Scores hidden by organizers
						</span>
					) : (
						"tap a row to expand"
					)}
				</p>
			</div>

			{/* Column header */}
			<div className="flex items-center gap-3 px-3 py-2 bg-editorial-ink border-2 border-editorial-ink border-l-4 border-l-editorial-ink">
				<span className="w-8 shrink-0 text-[10px] font-black uppercase tracking-widest text-white/60">#</span>
				<span className="flex-1 min-w-0 text-[10px] font-black uppercase tracking-widest text-white/60">Team</span>
				{!scoresHidden && (
					<span className="hidden sm:flex items-center gap-1 shrink-0">
						{["R1", "R2", "R3", "R4"].map((r) => (
							<span key={r} className="inline-flex items-center justify-center w-9 text-[10px] font-black uppercase tracking-widest text-white/60">
								{r}
							</span>
						))}
					</span>
				)}
				<span className="shrink-0 w-12 text-right text-[10px] font-black uppercase tracking-widest text-white/60">
					{scoresHidden ? "" : "Total"}
				</span>
			</div>

			{/* Rows */}
			<div className="space-y-0">
				{pageStandings.map((standing, index) => {
					const actualIndex = startIndex + index;
					const progresses = advanceCount > 0 && actualIndex < advanceCount;
					const isExpanded = expandedTeam === standing.team_name;

					return (
						<div key={standing.team_name}>
							<button
								onClick={() => {
									if (scoresHidden) return;
									ReactGA.event({ category: "User", action: `Team Clicked:${standing.team_name}` });
									setExpandedTeam(isExpanded ? null : standing.team_name);
								}}
								className={`w-full text-left flex items-center gap-3 px-3 py-3 border-t border-b-0 border-r-0 border-editorial-ink/20 border-l-4 transition-colors ${
									progresses ? "border-l-editorial-gold" : "border-l-transparent"
								} ${
									isExpanded ? "bg-editorial-ink text-white" : "bg-white hover:bg-editorial-gold/5"
								} ${scoresHidden ? "cursor-default" : "cursor-pointer"}`}
							>
								{/* Rank badge */}
								<span className={`w-8 h-8 shrink-0 flex items-center justify-center border-2 font-black text-sm ${
									isExpanded ? "border-white text-white" : "border-editorial-ink text-editorial-ink"
								}`}>
									{actualIndex + 1}
								</span>

								{/* Logo + Name */}
								<span className="flex-1 min-w-0 flex items-center gap-2">
									{teamLogos[standing.team_name] ? (
										<img
											src={teamLogos[standing.team_name]}
											alt={standing.team_name}
											className="w-6 h-6 object-contain shrink-0"
										/>
									) : (
										<span className="w-6 h-6 shrink-0" />
									)}
									<span className={`text-sm font-semibold truncate ${isExpanded ? "text-white" : "text-editorial-ink"}`}>
										{standing.team_name}
									</span>
								</span>

								{scoresHidden ? (
									<span className="text-xs text-gray-300">—</span>
								) : (
									<>
										{/* Round pills */}
										<span className="hidden sm:flex items-center gap-1 shrink-0">
											{[standing.r1, standing.r2, standing.r3, standing.r4].map((score, i) => (
												<span key={i} className={`inline-flex items-center justify-center w-9 h-7 text-xs font-bold border ${
													isExpanded ? "border-white/40 text-white" : "border-editorial-ink/20 text-editorial-ink"
												}`}>
													<AnimatedScore value={score !== null ? String(score) : "0"} />
												</span>
											))}
										</span>

										{/* Total */}
										<span className={`shrink-0 w-12 text-right text-sm font-black ${
											isExpanded ? "text-editorial-gold" : standing.total > 0 ? "text-editorial-green" : "text-gray-400"
										}`}>
											<AnimatedScore value={String(standing.total)} />
										</span>
									</>
								)}
							</button>

							{/* Expanded detail */}
							{!scoresHidden && (
								<AnimatedPanel isOpen={isExpanded}>
									<div className="bg-white border-t border-editorial-ink/10 px-4 py-4">
										<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
											{[
												{ label: "Round 1", score: standing.r1 },
												{ label: "Round 2", score: standing.r2 },
												{ label: "Round 3", score: standing.r3 },
												{ label: "Round 4", score: standing.r4 },
											].map((round) => (
												<div key={round.label} className="flex items-center justify-between sm:flex-col sm:items-center sm:justify-center p-3 bg-gray-50 border border-editorial-ink/15 sm:text-center">
													<p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{round.label}</p>
													<p className="text-xl font-black text-editorial-ink">
														<AnimatedScore value={round.score !== null ? String(round.score) : "0"} />
													</p>
												</div>
											))}
										</div>
										<div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
											<span>Rank <strong className="text-editorial-ink">{actualIndex + 1}</strong> of {standings.length}</span>
											<span className="font-black text-editorial-green text-sm">
												<AnimatedScore value={String(standing.total)} /> pts
											</span>
										</div>
									</div>
								</AnimatedPanel>
							)}
						</div>
					);
				})}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="pt-4 px-4 md:px-0">
					<div className="flex items-center justify-start gap-2">
						<button
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							className="flex items-center justify-center w-9 h-9 border-2 border-editorial-ink bg-white hover:bg-editorial-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<button
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className="flex items-center justify-center w-9 h-9 border-2 border-editorial-ink bg-white hover:bg-editorial-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
					<p className="text-[10px] text-gray-500 mt-2">
						{startIndex + 1}–{Math.min(startIndex + itemsPerPage, standings.length)} of {standings.length} teams
					</p>
				</div>
			)}
		</div>
	);
}
