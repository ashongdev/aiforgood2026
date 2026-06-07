import { AnimatedScore } from "./AnimatedScore";

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
				{/* Team 1 */}
				<div className="p-6 pb-8 text-center border-r-2 border-editorial-ink bg-white">
					<div className="absolute top-3 left-3 text-[8px] font-mono opacity-40 uppercase tracking-widest font-bold">
						Terminal_A
					</div>
					<p className="text-[11px] md:text-[12px] uppercase font-serif font-black italic mb-6 leading-none">
						{match.team1}
					</p>

					{/* Round Scores */}
					<div className="space-y-4 mb-6">
						<div className="flex justify-between items-center text-sm">
							<span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
								Round 1
							</span>
							<span className="font-mono text-lg font-black">
								{match.team1R1 ?? 0}
							</span>
						</div>
						<div className="flex justify-between items-center text-sm">
							<span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
								Round 2
							</span>
							<span className="font-mono text-lg font-black">
								{match.team1R2 ?? 0}
							</span>
						</div>
						<div className="h-[2px] bg-editorial-ink/20 my-4" />
						<div className="flex justify-between items-center">
							<span className="text-[10px] font-black uppercase tracking-widest text-editorial-gold">
								Total
							</span>
							<span className="font-mono text-3xl font-black text-editorial-ink">
								{match.team1Score ? (
									<AnimatedScore value={match.team1Score} />
								) : (
									0
								)}
							</span>
						</div>
					</div>

					{match.winner === 0 && (
						<div className="text-[9px] font-black uppercase tracking-widest bg-editorial-gold text-editorial-ink py-2 px-3">
							🏆 Winning
						</div>
					)}
				</div>

				{/* Team 2 */}
				<div className="p-6 pb-8 text-center bg-slate-50/50">
					<div className="absolute top-3 right-3 text-[8px] font-mono opacity-40 uppercase tracking-widest font-bold">
						Terminal_B
					</div>
					<p className="text-[11px] md:text-[12px] uppercase font-serif font-black italic mb-6 leading-none">
						{match.team2}
					</p>

					{/* Round Scores */}
					<div className="space-y-4 mb-6">
						<div className="flex justify-between items-center text-sm">
							<span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
								Round 1
							</span>
							<span className="font-mono text-lg font-black">
								{match.team2R1 ?? 0}
							</span>
						</div>
						<div className="flex justify-between items-center text-sm">
							<span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
								Round 2
							</span>
							<span className="font-mono text-lg font-black">
								{match.team2R2 ?? 0}
							</span>
						</div>
						<div className="h-[2px] bg-editorial-ink/20 my-4" />
						<div className="flex justify-between items-center">
							<span className="text-[10px] font-black uppercase tracking-widest text-editorial-gold">
								Total
							</span>
							<span className="font-mono text-3xl font-black text-editorial-ink">
								{match.team2Score ? (
									<AnimatedScore value={match.team2Score} />
								) : (
									0
								)}
							</span>
						</div>
					</div>

					{match.winner === 1 && (
						<div className="text-[9px] font-black uppercase tracking-widest bg-editorial-gold text-editorial-ink py-2 px-3">
							🏆 Winning
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
