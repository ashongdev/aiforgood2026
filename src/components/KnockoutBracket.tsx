import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { getCountryFlag } from "../lib/countryFlag";
import type { Category, MatchWithTeams } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { AnimatedScore } from "./AnimatedScore";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamRef {
	id: string;
	name: string;
}

type OpenBreakdown = (team1: TeamRef, team2: TeamRef | null, initialTeam: 1 | 2) => void;

// ─── One team line inside a match card ──────────────────────────────────────

function TeamRow({
	name,
	country,
	score,
	wins,
	faded,
	placeholder,
	onClick,
}: {
	name: string | undefined;
	country: string | null | undefined;
	score: number | string | null;
	wins: boolean;
	faded: boolean;
	/** Shown when the slot has no team yet, e.g. "Winner of Semi-Final 1". */
	placeholder: string;
	onClick?: () => void;
}) {
	const flag = getCountryFlag(country);
	const content = (
		<>
			<span
				aria-hidden
				className={`absolute inset-y-0 left-0 w-1 ${wins ? "bg-editorial-gold" : "bg-transparent"}`}
			/>
			{flag ? (
				<span className="w-6 shrink-0 text-center text-base leading-none">{flag}</span>
			) : (
				<span className="w-6 shrink-0 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
					{country?.slice(0, 2) ?? ""}
				</span>
			)}
			<span
				className={`min-w-0 flex-1 truncate text-left text-sm leading-tight ${
					name ? (wins ? "font-black text-editorial-ink" : "font-bold text-editorial-ink") : "font-medium italic text-gray-400"
				}`}
			>
				{name ?? placeholder}
			</span>
			{wins && (
				<span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-gray-500">Won</span>
			)}
			{score !== null && (
				<span className="w-12 shrink-0 text-right font-mono text-xl font-black leading-none text-editorial-ink">
					<AnimatedScore value={String(score)} />
				</span>
			)}
		</>
	);

	const base = `relative flex w-full items-center gap-2 px-3 py-3 transition-opacity ${faded ? "opacity-40" : ""}`;

	if (!onClick) return <div className={base}>{content}</div>;
	return (
		<button
			type="button"
			onClick={onClick}
			className={`${base} cursor-pointer hover:bg-editorial-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-editorial-gold`}
			aria-label={`${name}${score !== null ? `, ${score} points` : ""}. Show score breakdown`}
		>
			{content}
		</button>
	);
}

// ─── A match card ───────────────────────────────────────────────────────────

function MatchCard({
	match,
	label,
	feeders,
	onOpenBreakdown,
}: {
	match: MatchWithTeams | null;
	label: string;
	/** What fills an empty slot, e.g. ["Winner of Semi-Final 1", "Winner of Semi-Final 2"]. */
	feeders: [string, string];
	onOpenBreakdown?: OpenBreakdown;
}) {
	const t1 = match?.team_1;
	const t2 = match?.team_2;
	const t1Score = match?.team_1_final_points ?? match?.team_1_r1 ?? null;
	const t2Score = match?.team_2_final_points ?? match?.team_2_r1 ?? null;
	const t1Wins = !!match?.winner_id && match.winner_id === match.team_1_id;
	const t2Wins = !!match?.winner_id && match.winner_id === match.team_2_id;
	const decided = !!match?.winner_id;

	const team1Ref: TeamRef | null = t1 ? { id: t1.id, name: t1.team_name } : null;
	const team2Ref: TeamRef | null = t2 ? { id: t2.id, name: t2.team_name } : null;

	// Opens the breakdown for the clicked team, keeping the other team available for the modal's prev/next toggle.
	function openTeam(slot: 1 | 2) {
		if (!onOpenBreakdown) return;
		if (slot === 1 && team1Ref) onOpenBreakdown(team1Ref, team2Ref, 1);
		else if (slot === 2 && team2Ref) {
			if (team1Ref) onOpenBreakdown(team1Ref, team2Ref, 2);
			else onOpenBreakdown(team2Ref, null, 1);
		}
	}

	return (
		<div className="w-full overflow-hidden border-2 border-editorial-ink bg-white shadow-[5px_5px_0px_0px_rgba(26,26,26,1)]">
			<div className="flex items-center justify-between bg-editorial-ink px-3 py-1.5">
				<span className="text-[10px] font-black uppercase tracking-widest text-editorial-gold">{label}</span>
				<span className={`text-[9px] font-black uppercase tracking-widest ${decided ? "text-white/60" : "text-white/30"}`}>
					{decided ? "Completed" : t1Score !== null || t2Score !== null ? "In progress" : t1 && t2 ? "To play" : "Waiting"}
				</span>
			</div>
			<TeamRow
				name={t1?.team_name}
				country={t1?.country}
				score={t1Score}
				wins={t1Wins}
				faded={t2Wins}
				placeholder={feeders[0]}
				onClick={team1Ref ? () => openTeam(1) : undefined}
			/>
			<div className="h-px bg-editorial-ink/15" />
			<TeamRow
				name={t2?.team_name}
				country={t2?.country}
				score={t2Score}
				wins={t2Wins}
				faded={t1Wins}
				placeholder={feeders[1]}
				onClick={team2Ref ? () => openTeam(2) : undefined}
			/>
		</div>
	);
}

// ─── Champion panel ─────────────────────────────────────────────────────────

function Champion({ teamName, country }: { teamName: string | null | undefined; country?: string | null }) {
	const known = !!teamName;
	const flag = getCountryFlag(country);
	return (
		<div
			className={`flex w-full flex-col items-center gap-1.5 border-2 px-4 py-5 text-center ${
				known ? "border-editorial-ink bg-white" : "border-dashed border-editorial-ink/20 bg-white/50"
			}`}
		>
			<Trophy size={30} strokeWidth={1.75} className={known ? "text-editorial-gold" : "text-gray-300"} aria-hidden />
			<span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Champion</span>
			{known ? (
				<span className="flex items-center gap-1.5">
					{flag && <span className="text-lg leading-none">{flag}</span>}
					<span className="font-serif text-xl font-black italic leading-tight text-editorial-ink">{teamName}</span>
				</span>
			) : (
				<span className="text-sm font-medium italic text-gray-400">To be decided</span>
			)}
		</div>
	);
}

// ─── Connectors ─────────────────────────────────────────────────────────────

const lineOn = "bg-editorial-ink";
const lineOff = "bg-editorial-ink/25";

/** A short vertical line between stacked stages. */
function DownLine({ done }: { done: boolean }) {
	return <span aria-hidden className={`mx-auto block h-8 w-0.5 ${done ? lineOn : lineOff}`} />;
}

/**
 * Wide screens: the two semi-finals sit side by side, so their lines drop from the middle of each card, meet in a bar,
 * and one line carries on down into the final. Each half is dark once that semi-final has a winner.
 */
function Join({ sf1Done, sf2Done }: { sf1Done: boolean; sf2Done: boolean }) {
	return (
		<div className="relative mx-auto hidden h-14 w-full md:block" aria-hidden>
			<span className={`absolute left-1/4 top-0 h-1/2 w-0.5 -translate-x-1/2 ${sf1Done ? lineOn : lineOff}`} />
			<span className={`absolute left-1/4 top-1/2 h-0.5 w-1/4 -translate-y-1/2 ${sf1Done ? lineOn : lineOff}`} />
			<span className={`absolute right-1/4 top-0 h-1/2 w-0.5 translate-x-1/2 ${sf2Done ? lineOn : lineOff}`} />
			<span className={`absolute left-1/2 top-1/2 h-0.5 w-1/4 -translate-y-1/2 ${sf2Done ? lineOn : lineOff}`} />
			<span className={`absolute left-1/2 top-1/2 h-1/2 w-0.5 -translate-x-1/2 ${sf1Done && sf2Done ? lineOn : lineOff}`} />
		</div>
	);
}

function StageTitle({ children }: { children: React.ReactNode }) {
	return <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{children}</p>;
}

// ─── Self-contained bracket that fetches its own data ───────────────────────

interface KnockoutBracketProps {
	category: Category;
	onOpenBreakdown?: OpenBreakdown;
}

export function KnockoutBracket({ category, onOpenBreakdown }: KnockoutBracketProps) {
	const [sfMatches, setSfMatches] = useState<MatchWithTeams[]>([]);
	const [finalMatch, setFinalMatch] = useState<MatchWithTeams | null>(null);
	const [thirdMatch, setThirdMatch] = useState<MatchWithTeams | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	async function load() {
		const { data } = await supabase
			.from("matches")
			.select(
				"*, team_1:team_1_id(id,team_name,category,country,booth_number), team_2:team_2_id(id,team_name,category,country,booth_number), winner:winner_id(id,team_name,category,country)",
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
			.on("postgres_changes", { event: "*", schema: "public", table: "matches" }, load)
			.subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [category]);

	const sf1 = sfMatches[0] ?? null;
	const sf2 = sfMatches[1] ?? null;
	const champion = finalMatch?.winner ?? null;
	const sf1Done = !!sf1?.winner_id;
	const sf2Done = !!sf2?.winner_id;
	const finalDone = !!finalMatch?.winner_id;

	if (isLoading) {
		return <div className="py-16 text-center text-sm text-gray-400">Loading bracket…</div>;
	}

	if (!(sf1 || sf2 || finalMatch || thirdMatch)) {
		return (
			<div className="space-y-2 border border-gray-100 py-16 text-center">
				<p className="text-sm text-gray-400">Knockout bracket not set up yet.</p>
				<p className="text-xs text-gray-300">Admins can create Semi-Final matches from the Admin panel.</p>
			</div>
		);
	}

	return (
		<div className="w-full space-y-10 py-2">
			{/* Title */}
			<div>
				<h2 className="text-2xl font-black uppercase tracking-widest text-editorial-ink">Knockout Bracket</h2>
				<div className="mb-2 mt-2 h-1 w-12 bg-editorial-gold" />
				<p className="text-xs text-gray-500">Semi-Finals → Final · 3rd Place. Tap a team to see how its score was made.</p>
			</div>

			{/* The bracket: semi-finals → final → champion, top to bottom. Side by side on wide screens, stacked on narrow ones. */}
			<div className="mx-auto flex max-w-4xl flex-col">
				<StageTitle>Semi-Finals</StageTitle>
				<div className="mt-3 grid gap-6 md:grid-cols-2 md:gap-10">
					<MatchCard
						match={sf1}
						label="Semi-Final 1"
						feeders={["Team to be decided", "Team to be decided"]}
						onOpenBreakdown={onOpenBreakdown}
					/>
					<MatchCard
						match={sf2}
						label="Semi-Final 2"
						feeders={["Team to be decided", "Team to be decided"]}
						onOpenBreakdown={onOpenBreakdown}
					/>
				</div>

				<Join sf1Done={sf1Done} sf2Done={sf2Done} />
				<div className="md:hidden">
					<DownLine done={sf1Done && sf2Done} />
				</div>

				<div className="mx-auto flex w-full max-w-md flex-col pt-2">
					<StageTitle>Final</StageTitle>
					<div className="mt-3">
						<MatchCard
							match={finalMatch}
							label="Final"
							feeders={["Winner of Semi-Final 1", "Winner of Semi-Final 2"]}
							onOpenBreakdown={onOpenBreakdown}
						/>
					</div>
					<DownLine done={finalDone} />
					<Champion teamName={champion?.team_name} country={champion?.country} />
				</div>
			</div>

			{/* 3rd place: its own match, shown separately from the bracket */}
			{(thirdMatch || (sf1 && sf2)) && (
				<div>
					<div className="mb-4 flex items-center gap-3">
						<div className="h-px flex-1 bg-editorial-ink/15" />
						<p className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">3rd Place Match</p>
						<div className="h-px flex-1 bg-editorial-ink/15" />
					</div>
					<div className="mx-auto max-w-md">
						<MatchCard
							match={thirdMatch}
							label="3rd Place"
							feeders={["Loser of Semi-Final 1", "Loser of Semi-Final 2"]}
							onOpenBreakdown={onOpenBreakdown}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
