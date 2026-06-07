import { ArrowLeft } from "lucide-react";
import ReactGA from "react-ga4";

interface MatchDetailHeaderProps {
	onBack: () => void;
}

export function MatchDetailHeader({ onBack }: MatchDetailHeaderProps) {
	const handleBack = () => {
		ReactGA.event({
			category: "User",
			action: "Back to Bracket Clicked",
		});
		onBack();
	};

	return (
		<header className="w-full mb-8">
			<button
				onClick={handleBack}
				className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:text-editorial-gold transition-colors mb-4"
			>
				<ArrowLeft size={16} strokeWidth={4} /> Back to Ledger
			</button>
		</header>
	);
}
