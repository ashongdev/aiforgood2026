import { AnimatedScore } from "./AnimatedScore";

interface Match {
	id: string;
	team1: string;
	team2: string;
	team1Score: number | null;
	team2Score: number | null;
	team1R1: number | null;
	team1R2: number | null;
	team1R3?: number | null;
	team1R4?: number | null;
	team2R1: number | null;
	team2R2: number | null;
	team2R3?: number | null;
	team2R4?: number | null;
	winner?: number | null;
	station: string;
	isBye?: boolean;
}

interface ScoreboardDetailProps {
	match: Match;
}

export function ScoreboardDetail({ match }: ScoreboardDetailProps) {
	if (match.isBye) {
		return (
			<div className="w-full border-2 border-editorial-ink bg-editorial-gold mb-10 relative shadow-[12px_12px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
				<div className="px-4 py-3 border-b-2 border-editorial-ink bg-editorial-ink text-center">
					<p className="text-[10px] font-black uppercase tracking-widest text-white">
						BYE - Automatic Advancement
					</p>
				</div>
				<div className="p-8 pb-10 text-center">
					<p className="text-5xl font-serif font-black italic mb-4">
						{match.team1}
					</p>
					<div className="flex items-center gap-3 justify-center py-2">
						<div className="h-[2px] flex-1 bg-editorial-ink" />
						<span className="text-[11px] font-black italic text-editorial-ink">
							ADVANCES
						</span>
						<div className="h-[2px] flex-1 bg-editorial-ink" />
					</div>
					<p className="text-[10px] font-black uppercase tracking-[0.2em] mt-4 text-editorial-ink">
						Table {match.station}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full border-2 border-editorial-ink bg-white mb-10 relative shadow-[12px_12px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
			{/* Header with match info */}
			<div className="px-4 py-3 border-b-2 border-editorial-ink bg-slate-50">
				<p className="text-[10px] font-black uppercase tracking-widest text-center text-editorial-gold">
					Match Details - Table {match.station}
				</p>
			</div>

			{/* Scores Grid */}
			<div className="grid grid-cols-2 gap-0">
				{[
					{
						name: match.team1,
						rounds: [match.team1R1, match.team1R2, match.team1R3 ?? null, match.team1R4 ?? null],
						score: match.team1Score,
						wins: match.winner === 0,
						terminal: "Terminal_A",
						side: "border-r-2 border-editorial-ink bg-white" as const,
					},
					{
						name: match.team2,
						rounds: [match.team2R1, match.team2R2, match.team2R3 ?? null, match.team2R4 ?? null],
						score: match.team2Score,
						wins: match.winner === 1,
						terminal: "Terminal_B",
						side: "bg-slate-50/50" as const,
					},
				].map((team, ti) => {
					const scoredRounds = team.rounds
						.map((s, i) => ({ label: `Round ${i + 1}`, score: s }))
						.filter(r => r.score !== null);
					const total = scoredRounds.reduce((sum, r) => sum + (r.score ?? 0), 0);

					return (
						<div key={ti} className={`p-6 pb-8 text-center ${team.side}`}>
							<div className={`absolute top-3 ${ti === 0 ? "left-3" : "right-3"} text-[8px] font-mono opacity-40 uppercase tracking-widest font-bold`}>
								{team.terminal}
							</div>
							<p className="text-[11px] md:text-[12px] uppercase font-serif font-black italic mb-6 leading-none">
								{team.name}
							</p>

							<div className="space-y-4 mb-6">
								{scoredRounds.map(({ label, score }) => (
									<div key={label} className="flex justify-between items-center text-sm">
										<span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
											{label}
										</span>
										<span className="font-mono text-lg font-black">
											{score}
										</span>
									</div>
								))}
								{scoredRounds.length > 0 && (
									<>
										<div className="h-0.5 bg-editorial-ink/20 my-4" />
										<div className="flex justify-between items-center">
											<span className="text-[10px] font-black uppercase tracking-widest text-editorial-gold">
												Total
											</span>
											<span className="font-mono text-3xl font-black text-editorial-ink">
												<AnimatedScore value={total} />
											</span>
										</div>
									</>
								)}
							</div>

							{team.wins && (
								<div className="text-[9px] font-black uppercase tracking-widest bg-editorial-gold text-editorial-ink py-2 px-3">
									🏆 Winning
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
