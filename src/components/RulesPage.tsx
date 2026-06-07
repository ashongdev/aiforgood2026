import { useState } from "react";
import { SCORING_RULES } from "../data/scoringRules";
import { AnimatedScore } from "./AnimatedScore";
import { CategoryToggle } from "./CategoryToggle";

export function RulesPage() {
	const [category, setCategory] = useState<"junior" | "senior">("junior");

	const rules = SCORING_RULES[category];

	const isPositiveScore = (points: string | number) => {
		const pointStr =
			typeof points === "string" ? points : points.toString();
		return pointStr.startsWith("+");
	};

	const getPointColor = (points: string | number) => {
		const pointStr =
			typeof points === "string" ? points : points.toString();
		if (pointStr.startsWith("+")) return "text-editorial-green font-bold";
		if (pointStr.startsWith("-")) return "text-red-600 font-bold";
		return "text-editorial-ink font-semibold";
	};

	const MissionSection = ({
		title,
		rules: missionRules,
	}: {
		title: string;
		rules: typeof SCORING_RULES.junior.mission1;
	}) => (
		<div className="mb-12">
			<h3 className="text-lg font-black uppercase tracking-widest text-editorial-ink mb-6 pb-3 border-b-2 border-editorial-ink">
				{title}
			</h3>
			<div className="overflow-x-auto">
				<table className="w-full border-collapse bg-white border-2 border-editorial-ink shadow-[2px_2px_0px_0px_rgba(26,26,26,0.1)]">
					<thead>
						<tr className="bg-editorial-ink text-white">
							<th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest border-b-2 border-editorial-ink">
								Action
							</th>
							<th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest border-b-2 border-editorial-ink w-24">
								Points
							</th>
						</tr>
					</thead>
					<tbody>
						{missionRules.rules.map((rule, index) => (
							<tr
								key={index}
								className={`border-b-2 border-editorial-ink ${index % 2 === 0 ? "bg-white" : "bg-editorial-bg"} hover:bg-editorial-gold/10 transition-colors`}
							>
								<td className="px-4 py-3 text-sm leading-relaxed text-editorial-ink font-medium">
									{rule.action}
								</td>
								<td
									className={`px-4 py-3 text-center text-sm font-black uppercase ${getPointColor(rule.points)}`}
								>
									<AnimatedScore value={rule.points} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-editorial-bg p-6 md:p-12">
			{/* Container */}
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="mb-12">
					<h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-editorial-ink mb-4">
						Scoring Rules
					</h1>
					<div className="w-16 h-1 bg-editorial-gold"></div>
				</div>

				{/* Category Toggle */}
				<div className="mb-12">
					<CategoryToggle
						category={category}
						onChange={setCategory}
					/>
				</div>

				{/* Age Group Label */}
				<div className="mb-8 p-4 bg-white border-2 border-editorial-ink shadow-[2px_2px_0px_0px_rgba(26,26,26,0.1)]">
					<p className="text-sm font-black uppercase tracking-widest text-editorial-ink">
						{category === "junior"
							? "Junior Division (Ages 10-14)"
							: "Senior Division (Ages 15-18)"}
					</p>
				</div>

				{/* Mission Rules */}
				<div className="space-y-12">
					<MissionSection
						title={rules.mission1.title}
						rules={rules.mission1}
					/>
					<MissionSection
						title={rules.mission2.title}
						rules={rules.mission2}
					/>
					<MissionSection
						title={rules.penalties.title}
						rules={rules.penalties}
					/>
				</div>

				{/* Key Notes */}
				<div className="mt-16 p-6 bg-white border-2 border-editorial-gold shadow-[3px_3px_0px_0px_rgba(212,175,55,0.3)]">
					<h3 className="text-sm font-black uppercase tracking-widest text-editorial-ink mb-4">
						Key Information
					</h3>
					<ul className="space-y-3 text-sm text-editorial-ink">
						<li className="flex items-start gap-3">
							<span className="text-editorial-gold font-black text-lg mt-0.5">
								•
							</span>
							<span>
								<strong>Each round lasts 2 minutes</strong> with
								robots operating autonomously
							</span>
						</li>
						<li className="flex items-start gap-3">
							<span className="text-editorial-gold font-black text-lg mt-0.5">
								•
							</span>
							<span>
								<strong>Two active plots</strong> are randomly
								selected by the referee before each match
							</span>
						</li>
						<li className="flex items-start gap-3">
							<span className="text-editorial-gold font-black text-lg mt-0.5">
								•
							</span>
							<span>
								<strong>
									Seeds can only be handed to robots
								</strong>{" "}
								while they are inside the start zone
							</span>
						</li>
						<li className="flex items-start gap-3">
							<span className="text-editorial-gold font-black text-lg mt-0.5">
								•
							</span>
							<span>
								<strong>
									Green fruits must never be moved
								</strong>{" "}
								(0 or -5 points in Senior category)
							</span>
						</li>
						<li className="flex items-start gap-3">
							<span className="text-editorial-gold font-black text-lg mt-0.5">
								•
							</span>
							<span>
								<strong>
									Completing all actions is optional
								</strong>{" "}
								— there is no penalty for missions not performed
							</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
