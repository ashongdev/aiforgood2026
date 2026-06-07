import { useEffect, useState } from "react";

export function useCountUp(
	targetValue: number | string,
	duration: number = 500,
) {
	const target = typeof targetValue === "string" ? parseInt(targetValue) : targetValue;
	const [displayValue, setDisplayValue] = useState(0);

	useEffect(() => {
		if (target === 0) {
			setDisplayValue(0);
			return;
		}

		let startTime: number;
		let animationFrameId: number;

		const animate = (currentTime: number) => {
			if (!startTime) startTime = currentTime;
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Easing function for smooth animation
			const easeOut = 1 - Math.pow(1 - progress, 3);
			const currentValue = Math.floor(target * easeOut);

			setDisplayValue(currentValue);

			if (progress < 1) {
				animationFrameId = requestAnimationFrame(animate);
			}
		};

		animationFrameId = requestAnimationFrame(animate);

		return () => cancelAnimationFrame(animationFrameId);
	}, [target, duration]);

	return displayValue;
}
