import ReactGA from "react-ga4";

interface CategoryToggleProps {
	category: "junior" | "senior";
	onChange: (category: "junior" | "senior") => void;
}

export function CategoryToggle({ category, onChange }: CategoryToggleProps) {
	const handleJunior = () => {
		if (category !== "junior") {
			ReactGA.event({
				category: "User",
				action: "Category Changed:Junior",
			});
		}
		onChange("junior");
	};

	const handleSenior = () => {
		if (category !== "senior") {
			ReactGA.event({
				category: "User",
				action: "Category Changed:Senior",
			});
		}
		onChange("senior");
	};

	return (
		<div className="grid grid-cols-2 w-full border-2 border-editorial-ink bg-white mb-12 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
			<button
				onClick={handleJunior}
				className={`py-3 text-[10px] uppercase font-black tracking-widest transition-colors ${category === "junior" ? "bg-editorial-ink text-white" : "hover:bg-slate-50"}`}
			>
				Junior Division
			</button>
			<button
				onClick={handleSenior}
				className={`py-3 text-[10px] uppercase font-black tracking-widest transition-colors border-l-2 border-editorial-ink ${category === "senior" ? "bg-editorial-ink text-white" : "hover:bg-slate-50"}`}
			>
				Senior Division
			</button>
		</div>
	);
}
