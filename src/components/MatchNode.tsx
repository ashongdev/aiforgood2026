import { motion } from "motion/react";
import ReactGA from "react-ga4";
import { AnimatedScore } from "./AnimatedScore";

interface MatchNodeProps {
	match: {
		id: string;
		team1: string;
		team2: string;
		team1Score: number | null;
		team2Score: number | null;
		winner: number | null;
		station: string;
		isBye?: boolean;
	};
	sheetName?: string;
	rankingMap?: Record<string, number>;
	onClick: () => void;
}

const teamLogos: Record<string, string> = {
	//Senior Team Logos
	Nanovolts: "/logos/Senior/Nanovolts.svg",
	"AI Squad": "/logos/Senior/Ai Squad.svg",
	Masterminds: "/logos/Senior/Masterminds.svg",
	"ARIS Eagles Senior": "/logos/Senior/Aris Eagles Senior.svg",
	"Redeemer Tech": "/logos/Senior/Redeemer Tech.svg",
	"STEMR Seniors": "/logos/Senior/Stemr Seniors.svg",
	Rookies: "/logos/Senior/Rookies.svg",
	Createch: "/logos/Senior/Create T.svg",
	"Team Applied": "/logos/Senior/Team Applied.svg",
	"Fusion Innovators": "/logos/Senior/Fusion Innovators.svg",
	"Beta Gold-ST": "/logos/Senior/Beta Gold-St.svg",
	Klone: "/logos/Senior/Klone.svg",
	"Kepler-Robot": "/logos/Senior/Kepler-Robot.svg",
	YCEM: "/logos/Senior/Ycem.svg",
	"Ahtoo Alpha Gold ST": "/logos/Senior/Ahtoo Alpha Gold St.svg",
	Novex: "/logos/Senior/Novex.svg",
	"The Problem Solvers": "/logos/Senior/The Problem Solvers.svg",
	Mechatronics: "/logos/Senior/Mechatronics.svg",

	//Junior Team Logos
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
	"Fearsom Dragons": "/logos/Junior/Fearsome Dragons.svg",
	"Nexus Communicators": "/logos/Junior/Nexus Communicators.svg",
	"Quantum Minds": "/logos/Junior/Quantum Minds.svg",
	"ACS Tech-Rangers": "/logos/Junior/ACS Tech-Rangers.svg",
	"ACS Tech-Titans": "/logos/Junior/Tech Titans.svg",
};

export function MatchNode({
	match,
	sheetName,
	rankingMap = {},
	onClick,
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
						{teamLogos[match.team1] && (
							<img
								src={teamLogos[match.team1]}
								alt={match.team1}
								className="w-7 h-7 object-contain shrink-0"
							/>
						)}
						<span className="flex items-center gap-2 min-w-0">
							<span className="font-serif text-2xl font-black italic tracking-tight leading-tight truncate">
								{match.team1}
							</span>
							{showRankings && team1Rank && (
								<span className="inline-block px-2 py-0.5 bg-editorial-gold text-white text-xs font-black rounded">
									#{team1Rank}
								</span>
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
						{teamLogos[match.team2] && (
							<img
								src={teamLogos[match.team2]}
								alt={match.team2}
								className="w-7 h-7 object-contain shrink-0"
							/>
						)}
						<span className="flex items-center gap-2 min-w-0">
							<span className="font-serif text-2xl font-black italic tracking-tight leading-tight truncate">
								{match.team2}
							</span>
							{showRankings && team2Rank && (
								<span className="inline-block px-2 py-0.5 bg-editorial-gold text-white text-xs font-black rounded">
									#{team2Rank}
								</span>
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
