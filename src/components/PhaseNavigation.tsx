import { ChevronLeft, ChevronRight } from "lucide-react";

interface PhaseNavigationProps {
	currentPhase: number;
	phaseName: string;
	onPrevPhase: () => void;
	onNextPhase: () => void;
}

export function PhaseNavigation({
	currentPhase,
	phaseName,
	onPrevPhase,
	onNextPhase,
}: PhaseNavigationProps) {
	return (
		<header className="w-full mb-16">
			<div className="flex items-center justify-between mb-10">
				<button
					onClick={onPrevPhase}
					className="w-14 h-14 flex items-center justify-center border-2 border-editorial-ink bg-white hover:bg-editorial-gold active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all"
				>
					<ChevronLeft className="h-7 w-7" />
				</button>
				<div className="text-center flex-1 min-w-0 px-4">
					<h1 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.4em] mb-2">
						Phase Index
					</h1>
					<p className="text-2xl sm:text-3xl md:text-5xl font-serif font-black italic tracking-tighter leading-none truncate">
						{phaseName}
					</p>
				</div>
				<button
					onClick={onNextPhase}
					className="w-14 h-14 flex items-center justify-center border-2 border-editorial-ink bg-white hover:bg-editorial-gold active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all"
				>
					<ChevronRight className="h-7 w-7" />
				</button>
			</div>
			<div className="border-y-4 border-editorial-ink py-4 text-center bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,0.05)] px-4">
				<span className="text-[10px] sm:text-xs md:text-[12px] uppercase font-black tracking-[0.2em] sm:tracking-[0.3em] font-serif italic text-editorial-gold inline-block truncate">
					{phaseName}
				</span>
			</div>
		</header>
	);
}
