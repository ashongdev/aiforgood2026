import { useCallback, useState } from "react";
import { Effect } from "../components/ParticleEffects";

export function useEffects() {
	const [effects, setEffects] = useState<Effect[]>([]);

	const triggerEffect = useCallback(
		(type: "cheer" | "boo", align: "left" | "right") => {
			const swarmSize = 12;
			const newParticles = Array.from({ length: swarmSize }).map(
				(_, i) => ({
					id: `${Date.now()}-${i}`,
					type,
					align,
					xOffset: (Math.random() - 0.5) * 80, // Horizontal scatter
					delay: Math.random() * 0.4, // Staggered start
				}),
			);

			setEffects((prev) => [...prev, ...newParticles]);

			setTimeout(() => {
				setEffects((prev) =>
					prev.filter(
						(e) => !newParticles.find((p) => p.id === e.id),
					),
				);
			}, 2500);
		},
		[],
	);

	return { effects, triggerEffect };
}
