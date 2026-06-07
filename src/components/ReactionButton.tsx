import { ReactNode } from "react";

interface ReactionButtonProps {
	icon: ReactNode;
	label: string;
	onClick: () => void;
	disabled: boolean;
}

export function ReactionButton({
	icon,
	label,
	onClick,
	disabled,
}: ReactionButtonProps) {
	return (
		<button
			disabled={disabled}
			onClick={onClick}
			className={`w-full py-4 border-2 border-editorial-ink bg-white flex flex-col items-center justify-center gap-2 transition-all active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] group ${disabled ? "opacity-20 cursor-not-allowed grayscale" : "hover:bg-editorial-gold"}`}
		>
			<div className="group-hover:scale-110 transition-transform">
				{icon}
			</div>
			<span className="text-[9px] font-black tracking-widest uppercase">
				{label}
			</span>
		</button>
	);
}
