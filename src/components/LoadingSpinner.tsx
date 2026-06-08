import { motion } from "motion/react";

export function LoadingSpinner() {
	return (
		<div className="flex flex-col items-center justify-center py-12 gap-4">
			{/* Rotating square border */}
			<motion.div
				animate={{ rotate: 360 }}
				transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
				className="w-12 h-12 border-4 border-editorial-ink"
				style={{
					boxShadow: "4px 4px 0px 0px rgba(26,26,26,1)",
				}}
			/>

			{/* Animated text label */}
			<motion.div
				animate={{ opacity: [0.5, 1, 0.5] }}
				transition={{ duration: 1.5, repeat: Infinity }}
				className="text-[10px] font-black uppercase tracking-widest text-editorial-ink"
			>
				Loading
			</motion.div>

			{/* Bouncing dots */}
			<div className="flex gap-2">
				{[0, 1, 2].map((i) => (
					<motion.div
						key={i}
						animate={{ y: [0, -8, 0] }}
						transition={{
							duration: 0.6,
							repeat: Infinity,
							delay: i * 0.1,
						}}
						className="w-2 h-2 bg-editorial-ink"
					/>
				))}
			</div>
		</div>
	);
}
