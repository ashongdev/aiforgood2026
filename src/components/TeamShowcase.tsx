import { ArrowLeft, Globe, Users } from "lucide-react";
import { useState } from "react";
import { getCountryFlag } from "../lib/countryFlag";
import type { Team } from "../lib/database.types";

// ─── Team initials fallback ────────────────────────────────────────────────────

function initials(name: string): string {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function TeamDetail({ team, onBack }: { team: Team; onBack: () => void }) {
	const flag = getCountryFlag(team.country);

	return (
		<div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
			<button
				onClick={onBack}
				className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-editorial-ink transition-colors mb-6"
			>
				<ArrowLeft size={14} /> All Teams
			</button>

			<div className="border-2 border-editorial-ink bg-white shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
				{/* Header band */}
				<div className="bg-editorial-ink px-6 py-5 flex items-center gap-5">
					{flag ? (
						<span className="text-5xl leading-none shrink-0" aria-label={team.country ?? ""}>
							{flag}
						</span>
					) : (
						<div className="w-16 h-16 shrink-0 bg-editorial-gold flex items-center justify-center">
							<span className="text-xl font-black text-editorial-ink">
								{initials(team.team_name)}
							</span>
						</div>
					)}
					<div className="min-w-0">
						<h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white leading-tight break-words">
							{team.team_name}
						</h2>
						<span className="inline-block mt-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-editorial-gold text-editorial-ink">
							{team.category}
						</span>
					</div>
				</div>

				{/* Body */}
				<div className="px-6 py-5 space-y-5">
					{/* Country */}
					{team.country && (
						<div className="flex items-start gap-3">
							<Globe size={15} className="shrink-0 text-gray-400 mt-0.5" />
							<div>
								<p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Country</p>
								<p className="text-sm font-semibold">{team.country}</p>
							</div>
						</div>
					)}

					{/* Coach */}
					{team.coach_name && (
						<div className="flex items-start gap-3">
							<span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5 w-[15px] text-center">C</span>
							<div>
								<p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Coach</p>
								<p className="text-sm font-semibold">{team.coach_name}</p>
							</div>
						</div>
					)}

					{/* Members */}
					{team.team_members && team.team_members.length > 0 && (
						<div className="flex items-start gap-3">
							<Users size={15} className="shrink-0 text-gray-400 mt-0.5" />
							<div>
								<p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Team Members</p>
								<div className="flex flex-wrap gap-2">
									{team.team_members.map((member) => (
										<span
											key={member}
											className="text-xs font-semibold px-2.5 py-1 border border-editorial-ink/20 bg-editorial-bg"
										>
											{member}
										</span>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Description */}
					{team.team_description && (
						<div className="pt-4 border-t border-gray-100">
							<p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">About</p>
							<p className="text-sm text-gray-600 leading-relaxed">{team.team_description}</p>
						</div>
					)}

					{/* Fallback if no details at all */}
					{!team.country && !team.coach_name && !team.team_members?.length && !team.team_description && (
						<p className="text-sm text-gray-400 italic">No additional details available yet.</p>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Showcase grid ────────────────────────────────────────────────────────────

interface TeamShowcaseProps {
	teams: Team[];
	category: "Junior" | "Senior";
}

export function TeamShowcase({ teams, category }: TeamShowcaseProps) {
	const [selected, setSelected] = useState<Team | null>(null);

	if (selected) {
		return (
			<div className="w-full flex flex-col items-center">
				<TeamDetail team={selected} onBack={() => setSelected(null)} />
			</div>
		);
	}

	return (
		<div className="w-full max-w-6xl mx-auto">
			{/* Title block */}
			<div className="px-4 md:px-0 pb-6">
				<h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-editorial-ink">
					Meet the Teams
				</h2>
				<div className="w-16 h-1 bg-editorial-gold mt-3 mb-3" />
				<p className="text-xs text-gray-500">
					{teams.length} {category} team{teams.length !== 1 ? "s" : ""} competing · tap a card to learn more
				</p>
			</div>

			{teams.length === 0 ? (
				<div className="text-center py-16 text-sm text-gray-400">
					No teams registered yet.
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-4 md:px-0">
					{teams.map((team) => {
						const flag = getCountryFlag(team.country);
						return (
							<button
								key={team.id}
								onClick={() => setSelected(team)}
								className="group text-left border-2 border-editorial-ink bg-white hover:bg-editorial-gold hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all duration-150 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] flex flex-col items-center p-4 gap-3"
							>
								{/* Flag or initials */}
								<div className="w-14 h-14 flex items-center justify-center shrink-0">
									{flag ? (
										<span className="text-4xl leading-none" aria-label={team.country ?? ""}>
											{flag}
										</span>
									) : (
										<div className="w-14 h-14 bg-editorial-ink flex items-center justify-center group-hover:bg-white transition-colors">
											<span className="text-lg font-black text-white group-hover:text-editorial-ink transition-colors">
												{initials(team.team_name)}
											</span>
										</div>
									)}
								</div>

								{/* Name */}
								<div className="w-full text-center">
									<p className="text-xs font-black uppercase tracking-wide leading-tight line-clamp-2 group-hover:text-editorial-ink">
										{team.team_name}
									</p>
									{team.country && (
										<p className="text-[10px] text-gray-400 mt-1 group-hover:text-editorial-ink/60 transition-colors">
											{team.country}
										</p>
									)}
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
