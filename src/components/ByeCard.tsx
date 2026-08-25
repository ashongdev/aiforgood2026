import { motion } from "motion/react";
import ReactGA from "react-ga4";

interface TeamRef {
	id: string;
	name: string;
}

interface ByeCardProps {
	team: string;
	teamId?: string | null;
	station: string;
	onOpenBreakdown?: (team1: TeamRef, team2: null, initialTeam: 1) => void;
}

export function ByeCard({ team, teamId, station, onOpenBreakdown }: ByeCardProps) {
	const canOpen = !!onOpenBreakdown && !!teamId;

	function open() {
		if (!onOpenBreakdown || !teamId) return;
		ReactGA.event({ category: "User", action: `Score Breakdown Opened (bye):${team}` });
		onOpenBreakdown({ id: teamId, name: team }, null, 1);
	}

	return (
		<motion.div
			whileHover={canOpen ? { x: 4, y: 4 } : undefined}
			whileTap={canOpen ? { scale: 0.98 } : undefined}
			onClick={open}
			className={`w-full border-2 border-editorial-ink bg-editorial-gold shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] overflow-hidden active:shadow-none transition-shadow h-full ${canOpen ? "cursor-pointer" : ""}`}
		>
			<div className="flex justify-between items-center px-4 py-2 border-b-2 border-editorial-ink bg-editorial-ink">
				<span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
					STAGE
				</span>
				<span className="font-mono text-[10px] font-bold py-0.5 px-2 border border-white text-white">
					STATION {station}
				</span>
			</div>
			<div className="p-6 space-y-5">
				<div className="text-center space-y-4">
					<span className="font-serif text-2xl font-black italic tracking-tight leading-tight block">
						{team}
					</span>
					<div className="flex items-center gap-3 justify-center py-2">
						<div className="h-0.5 flex-1 bg-editorial-ink" />
						<span className="text-[11px] font-black italic text-editorial-ink whitespace-nowrap">
							BYE
						</span>
						<div className="h-0.5 flex-1 bg-editorial-ink" />
					</div>
					<span className="text-[10px] font-black uppercase tracking-[0.2em] text-editorial-ink block">
						Advances to Next Round
					</span>
				</div>
			</div>
		</motion.div>
	);
}
