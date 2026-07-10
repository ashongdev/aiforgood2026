import { useEffect, useState } from "react";
import { getCountryFlag } from "../lib/countryFlag";
import type { Category, MatchWithTeams } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { AnimatedScore } from "./AnimatedScore";

// ─── Mini match card ──────────────────────────────────────────────────────────

function BracketCard({
	match,
	label,
	onClick,
}: {
	match: MatchWithTeams | null;
	label: string;
	onClick?: (m: MatchWithTeams) => void;
}) {
	const t1 = match?.team_1;
	const t2 = match?.team_2;
	const t1Score = match?.team_1_final_points ?? null;
	const t2Score = match?.team_2_final_points ?? null;
	const t1Wins = !!match?.winner_id && match.winner_id === match.team_1_id;
	const t2Wins = !!match?.winner_id && match.winner_id === match.team_2_id;
	const decided = !!match?.winner_id;

	const isClickable = !!match && !!onClick;

	const cardContent = (
		<div
			className={`border-2 border-editorial-ink bg-white shadow-[3px_3px_0px_0px_rgba(26,26,26,0.9)] ${
				isClickable ? "cursor-pointer hover:shadow-[5px_5px_0px_0px_rgba(26,26,26,0.9)] transition-shadow active:shadow-none" : ""
			}`}
			onClick={() => match && onClick?.(match)}
		>
			{/* Header bar */}
			<div className="flex items-center justify-between px-2.5 py-1 bg-editorial-ink">
				<span className="text-[9px] font-black uppercase tracking-widest text-editorial-gold">
					{label}
				</span>
				{decided && (
					<span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
						Final
					</span>
				)}
				{isClickable && !decided && (
					<span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
						Tap
					</span>
				)}
			</div>

			{/* Team 1 */}
			<div
				className={`flex items-center gap-1.5 px-2.5 py-2.5 border-b border-editorial-ink/10 transition-opacity ${
					t2Wins ? "opacity-35" : ""
				} ${t1Wins ? "bg-editorial-gold/10" : ""}`}
			>
				<span className="text-editorial-gold text-[10px] leading-none shrink-0 w-3">
					{t1Wins ? "▶" : ""}
				</span>
				{getCountryFlag(t1?.country) && (
					<span className="text-sm leading-none shrink-0">
						{getCountryFlag(t1?.country)}
					</span>
				)}
				<span
					className={`flex-1 text-xs font-bold truncate min-w-0 ${
						t1Wins ? "text-editorial-ink" : "text-editorial-ink/80"
					}`}
				>
					{t1?.team_name ?? (
						<span className="text-gray-300 font-normal italic">TBD</span>
					)}
				</span>
				{t1Score !== null && (
					<span
						className={`font-mono text-base font-black shrink-0 ${
							t1Wins ? "text-editorial-gold" : "text-editorial-ink/50"
						}`}
					>
						<AnimatedScore value={String(t1Score)} />
					</span>
				)}
			</div>

			{/* VS row */}
			<div className="flex items-center justify-center px-2.5 py-1">
				<span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
					vs
				</span>
			</div>

			{/* Team 2 */}
			<div
				className={`flex items-center gap-1.5 px-2.5 py-2.5 border-t border-editorial-ink/10 transition-opacity ${
					t1Wins ? "opacity-35" : ""
				} ${t2Wins ? "bg-editorial-gold/10" : ""}`}
			>
				<span className="text-editorial-gold text-[10px] leading-none shrink-0 w-3">
					{t2Wins ? "▶" : ""}
				</span>
				{getCountryFlag(t2?.country) && (
					<span className="text-sm leading-none shrink-0">
						{getCountryFlag(t2?.country)}
					</span>
				)}
				<span
					className={`flex-1 text-xs font-bold truncate min-w-0 ${
						t2Wins ? "text-editorial-ink" : "text2editorial-ink/80"
					}`}
				>
					{t2?.team_name ?? (
						<span className="text-gray-300 font-normal italic">TBD</span>
					)}
				</span>
				{t2Score !== null && (
					<span
						className={`font-mono text-base font-black shrink-0 ${
							t2Wins ? "text-editorial-gold" : "text-editorial-ink/50"
						}`}
					>
						<AnimatedScore value={String(t2Score)} />
					</span>
				)}
			</div>
		</div>
	);

	return cardContent;
}

// ─── Self-contained bracket that fetches its own data ─────────────────────────

interface KnockoutBracketProps {
	category: Category;
	onSelectMatch?: (match: MatchWithTeams) => void;
}

export function KnockoutBracket({ category, onSelectMatch }: KnockoutBracketProps) {
	const [sfMatches, setSfMatches] = useState<MatchWithTeams[]>([]);
	const [finalMatch, setFinalMatch] = useState<MatchWithTeams | null>(null);
	const [thirdMatch, setThirdMatch] = useState<MatchWithTeams | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	async function load() {
		const { data } = await supabase
			.from("matches")
			.select(
				"*, team_1:team_1_id(id,team_name,category,country,booth_number), team_2:team_2_id(id,team_name,category,country,booth_number), winner:winner_id(id,team_name,category)",
			)
			.eq("category", category)
			.in("phase", ["Semifinals", "Finals", "Third Place"])
			.order("match_order", { ascending: true });

		if (data) {
			const rows = data as MatchWithTeams[];
			setSfMatches(rows.filter((m) => m.phase === "Semifinals"));
			setFinalMatch(rows.find((m) => m.phase === "Finals") ?? null);
			setThirdMatch(rows.find((m) => m.phase === "Third Place") ?? null);
		}
		setIsLoading(false);
	}

	useEffect(() => {
		load();
		const ch = supabase
			.channel(`knockout-${category}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "matches" },
				load,
			)
			.subscribe();
		return () => { supabase.removeChannel(ch); };
	}, [category]);

	const sf1 = sfMatches[0] ?? null;
	const sf2 = sfMatches[1] ?? null;
	const champion = finalMatch?.winner ?? null;
	const bronzeWinner = thirdMatch?.winner ?? null;

	if (isLoading) {
		return (
			<div className="py-16 text-center text-sm text-gray-400">
				Loading bracket…
			</div>
		);
	}

	const hasAnyMatch = sf1 || sf2 || finalMatch || thirdMatch;
	if (!hasAnyMatch) {
		return (
			<div className="py-16 text-center space-y-2 border border-gray-100">
				<p className="text-sm text-gray-400">Knockout bracket not set up yet.</p>
				<p className="text-xs text-gray-300">
					Admins can create Semi-Final matches from the Admin panel.
				</p>
			</div>
		);
	}

	return (
		<div className="w-full space-y-8 py-2">
			{/* Title */}
			<div>
				<h2 className="text-2xl font-black uppercase tracking-widest text-editorial-ink">
					Knockout Bracket
				</h2>
				<div className="w-12 h-1 bg-editorial-gold mt-2 mb-1" />
				<p className="text-xs text-gray-400">
					Semi-Finals → Final · 3rd Place
				</p>
			</div>

			{/* ── MOBILE: horizontal scroll pager — each section nearly full-width,
			     connector (1.5rem) peeks at the right/left edge as a scroll cue ── */}
			<div
				className="md:hidden overflow-x-auto snap-x snap-mandatory scrollbar-none flex"
				style={{ scrollPaddingLeft: "1.5rem" }}
			>
				{/* SF section — width = 100% minus connector width so connector peeks */}
				<div className="snap-start shrink-0 w-[calc(100%-1.5rem)] flex flex-col gap-4 pr-3 py-1">
					<div>
						<p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
							Semi-Final 1
						</p>
						<BracketCard match={sf1} label="SF 1" onClick={onSelectMatch} />
					</div>
					<div>
						<p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
							Semi-Final 2
						</p>
						<BracketCard match={sf2} label="SF 2" onClick={onSelectMatch} />
					</div>
				</div>

				{/* Connector — peeks at right when on SF, peeks at left when on Final */}
				<div className="shrink-0 w-6 self-stretch flex flex-col">
					<div className="flex-1 border-r-2 border-b-2 border-editorial-ink/25" />
					<div className="flex-1 border-r-2 border-t-2 border-editorial-ink/25" />
				</div>

				{/* Final section */}
				<div className="snap-start shrink-0 w-[calc(100%-1.5rem)] flex flex-col justify-center gap-2 pl-3 py-1">
					<p className="text-[9px] font-black uppercase tracking-widest text-editorial-gold">
						Final
					</p>
					<BracketCard match={finalMatch} label="Final" onClick={onSelectMatch} />
					{champion ? (
						<div className="flex items-center gap-2 mt-1">
							<span className="text-base leading-none">🏆</span>
							<span className="text-xs font-black uppercase tracking-widest text-editorial-gold line-clamp-2">
								{champion.team_name}
							</span>
						</div>
					) : (
						<div className="flex items-center gap-2 mt-1 opacity-40">
							<span className="text-base leading-none">🏆</span>
							<span className="text-xs font-black uppercase tracking-widest text-gray-400">
								TBD
							</span>
						</div>
					)}
				</div>
			</div>

			{/* ── DESKTOP: side-by-side 3-column grid ── */}
			<div className="hidden md:grid grid-cols-[1fr_40px_1fr] items-stretch">
				{/* SF column */}
				<div className="flex flex-col">
					<div className="flex-1 flex flex-col justify-center py-3 pr-4">
						<p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
							Semi-Final 1
						</p>
						<BracketCard match={sf1} label="SF 1" onClick={onSelectMatch} />
					</div>
					<div className="flex-1 flex flex-col justify-center py-3 pr-4">
						<p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
							Semi-Final 2
						</p>
						<BracketCard match={sf2} label="SF 2" onClick={onSelectMatch} />
					</div>
				</div>

				{/* Connector */}
				<div className="flex flex-col">
					<div className="flex-1 border-r-2 border-b-2 border-editorial-ink/20" />
					<div className="flex-1 border-r-2 border-t-2 border-editorial-ink/20" />
				</div>

				{/* Final column */}
				<div className="flex flex-col justify-center pl-4 gap-2">
					<p className="text-[9px] font-black uppercase tracking-widest text-editorial-gold">
						Final
					</p>
					<BracketCard match={finalMatch} label="Final" onClick={onSelectMatch} />
					{champion ? (
						<div className="flex items-center gap-2 mt-1">
							<span className="text-lg leading-none">🏆</span>
							<span className="text-xs font-black uppercase tracking-widest text-editorial-gold">
								{champion.team_name}
							</span>
						</div>
					) : (
						<div className="flex items-center gap-2 mt-1 opacity-40">
							<span className="text-lg leading-none">🏆</span>
							<span className="text-xs font-black uppercase tracking-widest text-gray-400">
								Champion TBD
							</span>
						</div>
					)}
				</div>
			</div>

			{/* ── 3rd Place ── */}
			{(thirdMatch || (sf1 && sf2)) && (
				<div>
					<div className="flex items-center gap-3 mb-3">
						<div className="h-px flex-1 bg-gray-100" />
						<p className="text-[9px] font-black uppercase tracking-widest text-gray-400 shrink-0">
							3rd Place Match
						</p>
						<div className="h-px flex-1 bg-gray-100" />
					</div>
					<div className="md:max-w-xs">
						<BracketCard match={thirdMatch} label="3rd Place" onClick={onSelectMatch} />
					</div>
					{bronzeWinner ? (
						<div className="flex items-center gap-2 mt-2 px-1">
							<span className="text-lg leading-none">🥉</span>
							<span className="text-xs font-black uppercase tracking-widest text-amber-600">
								{bronzeWinner.team_name}
							</span>
						</div>
					) : thirdMatch ? (
						<div className="flex items-center gap-2 mt-2 px-1 opacity-40">
							<span className="text-lg leading-none">🥉</span>
							<span className="text-xs font-black uppercase tracking-widest text-gray-400">
								3rd Place TBD
							</span>
						</div>
					) : null}
				</div>
			)}
		</div>
	);
}
