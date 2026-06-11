import { motion } from "motion/react";
import { useEffect } from "react";
import ReactGA from "react-ga4";
import { InteractionMatrix } from "./InteractionMatrix";
import { MatchDetailHeader } from "./MatchDetailHeader";
import { Effect, ParticleEffects } from "./ParticleEffects";
import { ScoreboardDetail } from "./ScoreboardDetail";

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
	stage?: string;
	isBye?: boolean;
}

interface MatchDetailViewProps {
	match: Match;
	currentPhase: number;
	shared: boolean;
	effects: Effect[];
	onBack: () => void;
	onCheerLeft: () => void;
	onBooLeft: () => void;
	onCheerRight: () => void;
	onBooRight: () => void;
}

export function MatchDetailView({
	match,
	currentPhase,
	shared,
	effects,
	onBack,
	onCheerLeft,
	onBooLeft,
	onCheerRight,
	onBooRight,
}: MatchDetailViewProps) {
	useEffect(() => {
		ReactGA.initialize("G-Z8EWG2FKDC");
		ReactGA.send({ hitType: "pageview", page: window.location.pathname });
	}, []);

	return (
		<motion.div
			key="detail"
			initial={{ opacity: 0, x: 50 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -50 }}
			className="w-full flex flex-col items-center max-w-2xl"
		>
			<MatchDetailHeader onBack={onBack} />
			<ScoreboardDetail match={match} />
			<InteractionMatrix
				match={match}
				onCheerLeft={onCheerLeft}
				onBooLeft={onBooLeft}
				onCheerRight={onCheerRight}
				onBooRight={onBooRight}
			/>
			<ParticleEffects effects={effects} />
		</motion.div>
	);
}
