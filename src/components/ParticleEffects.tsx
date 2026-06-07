import { AnimatePresence, motion } from "motion/react";

export interface Effect {
	id: string;
	type: "cheer" | "boo";
	align: "left" | "right";
	xOffset: number;
	delay: number;
}

interface ParticleEffectsProps {
	effects: Effect[];
}

export function ParticleEffects({ effects }: ParticleEffectsProps) {
	return (
		<AnimatePresence>
			{effects.map((effect) => (
				<motion.div
					key={effect.id}
					initial={{ y: 0, opacity: 0, scale: 0.2, x: 0 }}
					animate={{
						y: -500,
						opacity: [0, 1, 1, 0],
						scale: [0.5, 1.5, 1.2, 0.8],
						x: effect.xOffset,
						rotate: effect.xOffset / 2,
					}}
					transition={{
						duration: 2,
						ease: "easeOut",
						delay: effect.delay,
					}}
					className={`fixed bottom-40 pointer-events-none z-50 text-4xl md:text-5xl ${effect.align === "left" ? "left-[20%] md:left-[25%]" : "right-[20%] md:right-[25%]"}`}
				>
					{effect.type === "cheer" ? "❤️" : "👎"}
				</motion.div>
			))}
		</AnimatePresence>
	);
}
