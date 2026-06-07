import { useCountUp } from "../hooks/useCountUp";

interface AnimatedScoreProps {
	value: string | number;
	className?: string;
	duration?: number;
}

export function AnimatedScore({
	value,
	className = "",
	duration = 600,
}: AnimatedScoreProps) {
	const displayValue = useCountUp(value, duration);
	return <span className={className}>{displayValue}</span>;
}
