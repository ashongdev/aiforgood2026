import { motion } from "motion/react";
import ReactGA from "react-ga4";

interface ByeCardProps {
	team: string;
	station: string;
	onClick: () => void;
}

export function ByeCard({ team, station, onClick }: ByeCardProps) {
	const handleClick = () => {
		ReactGA.event({
			category: "User",
			action: `Bye Card Clicked:${team}`,
		});
		onClick();
	};

	return (
		<motion.div
			whileHover={{ x: 4, y: 4 }}
			whileTap={{ scale: 0.98 }}
			onClick={handleClick}
			className="w-full border-2 border-editorial-ink bg-editorial-gold shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] overflow-hidden cursor-pointer active:shadow-none transition-shadow h-full"
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
