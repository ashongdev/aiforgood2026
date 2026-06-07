import { Heart, ThumbsDown } from "lucide-react";
import ReactGA from "react-ga4";
import { ReactionButton } from "./ReactionButton";

interface Match {
	team1: string;
	team2: string;
}

interface InteractionMatrixProps {
	match: Match;
	onCheerLeft: () => void;
	onBooLeft: () => void;
	onCheerRight: () => void;
	onBooRight: () => void;
}

export function InteractionMatrix({
	match,
	onCheerLeft,
	onBooLeft,
	onCheerRight,
	onBooRight,
}: InteractionMatrixProps) {
	const handleCheerLeft = () => {
		ReactGA.event({
			category: "User",
			action: `Cheer Clicked:${match.team1}`,
		});
		onCheerLeft();
	};

	const handleBooLeft = () => {
		ReactGA.event({
			category: "User",
			action: `Boo Clicked:${match.team1}`,
		});
		onBooLeft();
	};

	const handleCheerRight = () => {
		ReactGA.event({
			category: "User",
			action: `Cheer Clicked:${match.team2}`,
		});
		onCheerRight();
	};

	const handleBooRight = () => {
		ReactGA.event({
			category: "User",
			action: `Boo Clicked:${match.team2}`,
		});
		onBooRight();
	};

	return (
		<div className="w-full space-y-12">
			<div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-editorial-ink">
				<div className="space-y-6">
					<div className="text-center">
						<span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
							Control / A
						</span>
						<p className="text-[10px] font-serif font-black italic truncate px-2">
							{match.team1}
						</p>
					</div>
					<div className="space-y-3">
						<ReactionButton
							icon={<Heart size={18} />}
							label="Cheer"
							onClick={handleCheerLeft}
							disabled={false}
						/>
						<ReactionButton
							icon={<ThumbsDown size={18} />}
							label="Boo"
							onClick={handleBooLeft}
							disabled={false}
						/>
					</div>
				</div>

				<div className="space-y-6">
					<div className="text-center">
						<span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
							Control / B
						</span>
						<p className="text-[10px] font-serif font-black italic truncate px-2">
							{match.team2}
						</p>
					</div>
					<div className="space-y-3">
						<ReactionButton
							icon={<Heart size={18} />}
							label="Cheer"
							onClick={handleCheerRight}
							disabled={false}
						/>
						<ReactionButton
							icon={<ThumbsDown size={18} />}
							label="Boo"
							onClick={handleBooRight}
							disabled={false}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
