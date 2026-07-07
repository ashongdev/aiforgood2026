import { useEffect, useMemo, useState } from "react";
import { Mic, RefreshCw, Search, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { CustomSelect } from "../components/CustomSelect";
import { getCountryFlag } from "../lib/countryFlag";
import { tc } from "../lib/format";
import type { Category, MatchWithTeams, Phase, Team } from "../lib/database.types";

const PHASES: Phase[] = [
	"Qualifiers",
	"Pre-Quarterfinals",
	"Quarterfinals",
	"Semifinals",
	"Third Place",
	"Finals",
];

const PHASE_SHORT: Record<string, string> = {
	Qualifiers: "QUALS",
	"Pre-Quarterfinals": "PRE-QF",
	Quarterfinals: "QF",
	Semifinals: "SF",
	"Third Place": "3RD",
	Finals: "FINAL",
};

type MatchStatus = "upcoming" | "live" | "done";

function matchStatus(m: MatchWithTeams): MatchStatus {
	if (m.winner_id) return "done";
	const t = m.scheduled_time ? new Date(m.scheduled_time).getTime() : null;
	if (t && Date.now() >= t && Date.now() <= t + 90 * 60 * 1000) return "live";
	return "upcoming";
}

function formatTime(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null): string {
	if (!iso) return "";
	return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

// ─── Standings helpers ────────────────────────────────────────────────────────

type TeamEntry = {
	id: string;
	name: string;
	country: string | null;
	score: number;
};

type RoundPairing = {
	rank1: number;
	t1: TeamEntry;
	t2: TeamEntry | null;
	rank2: number;
};

function computeScoresUpTo(catMatches: MatchWithTeams[], upToRound: 1 | 2 | 3): TeamEntry[] {
	const map = new Map<string, TeamEntry>();

	function addTeam(
		id: string | null,
		team: { team_name: string; country?: string | null } | null,
		scores: (number | null)[],
	) {
		if (!id || !team) return;
		const total = scores
			.slice(0, upToRound)
			.filter((v): v is number => v !== null)
			.reduce((a, b) => a + b, 0);
		const e = map.get(id) ?? { id, name: tc(team.team_name), country: tc(team.country ?? null), score: 0 };
		e.score += total;
		map.set(id, e);
	}

	for (const m of catMatches) {
		addTeam(m.team_1_id, m.team_1, [m.team_1_r1, m.team_1_r2, m.team_1_r3]);
		addTeam(m.team_2_id, m.team_2, [m.team_2_r1, m.team_2_r2, m.team_2_r3]);
	}

	return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

function buildPairings(teams: TeamEntry[]): RoundPairing[] {
	const pairs: RoundPairing[] = [];
	const n = teams.length;
	for (let i = 0; i < Math.floor(n / 2); i++) {
		pairs.push({ rank1: i + 1, t1: teams[i], t2: teams[n - 1 - i], rank2: n - i });
	}
	if (n % 2 === 1) {
		const mid = Math.floor(n / 2);
		pairs.push({ rank1: mid + 1, t1: teams[mid], t2: null, rank2: 0 });
	}
	return pairs;
}

// ─── Computed pairing → synthetic match (R2–R4 uses same MatchRow as R1) ─────

function pairingToMatch(pairing: RoundPairing, cat: Category): MatchWithTeams {
	const makeTeam = (t: TeamEntry): Team => ({
		id: t.id, team_name: t.name, category: cat, country: t.country,
		coach_name: null, team_description: null, team_members: null, booth_number: null, created_at: "",
	});
	return {
		id: `computed-${pairing.t1.id}`,
		phase: "Qualifiers", category: cat,
		team_1_id: pairing.t1.id, team_2_id: pairing.t2?.id ?? null,
		team_1_r1: null, team_1_r2: null, team_1_r3: null, team_1_r4: null,
		team_2_r1: null, team_2_r2: null, team_2_r3: null, team_2_r4: null,
		team_1_r1_absent: false, team_1_r2_absent: false, team_1_r3_absent: false, team_1_r4_absent: false,
		team_2_r1_absent: false, team_2_r2_absent: false, team_2_r3_absent: false, team_2_r4_absent: false,
		team_1_final_points: null, team_2_final_points: null,
		table_number: null, match_order: 0, winner_id: null, updated_at: "", scheduled_time: null, score_breakdown: null, scores_approved: false,
		team_1: makeTeam(pairing.t1),
		team_2: pairing.t2 ? makeTeam(pairing.t2) : null,
		winner: null,
	};
}

// ─── Match row (R1 and non-qualifier phases) ──────────────────────────────────

function MatchRow({ match }: { match: MatchWithTeams }) {
	const status = matchStatus(match);
	const team1 = match.team_1;
	const team2 = match.team_2;
	const t1Wins = !!match.winner_id && match.team_1_id === match.winner_id;
	const t2Wins = !!match.winner_id && match.team_2_id === match.winner_id;

	const accentColor =
		status === "live" ? "bg-editorial-gold" :
		status === "done" ? "bg-editorial-green" :
		"bg-gray-200";

	const rowRing =
		status === "live"
			? "ring-2 ring-editorial-gold shadow-md"
			: "ring-1 ring-editorial-ink/10 shadow-sm";

	return (
		<div className={`flex items-stretch bg-white overflow-hidden ${rowRing}`}>
			<div className={`w-1 shrink-0 ${accentColor}`} />

			<div className="flex-1 px-4 py-3 min-w-0">
				<div className="flex items-center justify-between gap-2 mb-2">
					<span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
						{PHASE_SHORT[match.phase] ?? match.phase}
						{match.table_number ? ` · Table ${match.table_number}` : ""}
						{match.category ? ` · ${match.category}` : ""}
					</span>
					<div className="flex items-center gap-2 shrink-0">
						{match.scheduled_time && (
							<span className="text-[9px] font-mono text-gray-400">
								{formatTime(match.scheduled_time)}
							</span>
						)}
						<span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 ${
							status === "live"
								? "bg-editorial-gold text-white"
								: status === "done"
								? "bg-editorial-green/10 text-editorial-green border border-editorial-green/20"
								: "text-gray-400"
						}`}>
							{status === "live" ? "● Live" : status === "done" ? "Done" : "Upcoming"}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-3 min-w-0">
					<div className={`flex-1 min-w-0 ${t2Wins ? "opacity-35" : ""}`}>
						<div className="flex items-center gap-1.5 min-w-0">
							{getCountryFlag(team1?.country) && (
								<span className="text-base leading-none shrink-0">{getCountryFlag(team1?.country)}</span>
							)}
							<span className={`text-sm font-black leading-tight truncate ${
								t1Wins ? "text-editorial-gold" : "text-editorial-ink"
							}`}>
								{team1 ? tc(team1.team_name) : <span className="text-gray-300 font-normal italic">TBD</span>}
							</span>
							{t1Wins && (
								<span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-editorial-gold border border-editorial-gold/40 px-1">
									WIN
								</span>
							)}
						</div>
						{(team1?.country || (team1 as { booth_number?: number | null } | null)?.booth_number) && (
							<p className="text-[9px] text-gray-400 mt-0.5 truncate">
								{team1?.country ? tc(team1.country) : ""}
								{(team1 as { booth_number?: number | null } | null)?.booth_number ? (
									<span className="font-mono ml-1">#{(team1 as { booth_number?: number | null }).booth_number}</span>
								) : null}
							</p>
						)}
					</div>

					<span className="text-[10px] font-black italic text-gray-200 shrink-0">vs</span>

					<div className={`flex-1 min-w-0 text-right ${t1Wins ? "opacity-35" : ""}`}>
						<div className="flex items-center justify-end gap-1.5 min-w-0">
							{t2Wins && (
								<span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-editorial-gold border border-editorial-gold/40 px-1">
									WIN
								</span>
							)}
							<span className={`text-sm font-black leading-tight truncate ${
								t2Wins ? "text-editorial-gold" : "text-editorial-ink"
							}`}>
								{team2 ? tc(team2.team_name) : <span className="text-gray-300 font-normal italic">TBD</span>}
							</span>
							{getCountryFlag(team2?.country) && (
								<span className="text-base leading-none shrink-0">{getCountryFlag(team2?.country)}</span>
							)}
						</div>
						{(team2?.country || (team2 as { booth_number?: number | null } | null)?.booth_number) && (
							<p className="text-[9px] text-gray-400 mt-0.5 truncate">
								{(team2 as { booth_number?: number | null } | null)?.booth_number ? (
									<span className="font-mono mr-1">#{(team2 as { booth_number?: number | null }).booth_number}</span>
								) : null}
								{team2?.country ? tc(team2.country) : ""}
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MCPage() {
	const [matches, setMatches] = useState<MatchWithTeams[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [category, setCategory] = useState<Category | "All">("All");
	const [phaseFilter, setPhaseFilter] = useState<Phase | "All">(
		() => (localStorage.getItem("mc_phase") as Phase | "All") ?? "All"
	);
	const [search, setSearch] = useState("");
	const [isRefreshing, setIsRefreshing] = useState(false);
	// Round toggle — only meaningful when phaseFilter === "Qualifiers"
	const [qualRound, setQualRound] = useState<1 | 2 | 3 | 4>(1);

	function updatePhaseFilter(v: Phase | "All") {
		setPhaseFilter(v);
		localStorage.setItem("mc_phase", v);
	}

	async function loadMatches() {
		setIsLoading(true);
		const { data } = await supabase
			.from("matches")
			.select("*, team_1:team_1_id(id,team_name,category,country,booth_number), team_2:team_2_id(id,team_name,category,country,booth_number), winner:winner_id(id,team_name,category)")
			.order("phase", { ascending: true })
			.order("match_order", { ascending: true });
		const rows = (data as MatchWithTeams[]) ?? [];
		setMatches(rows);
		// Auto-detect the active qualifier round from which rounds have scores
		const qualRows = rows.filter(m => m.phase === "Qualifiers");
		if (qualRows.length > 0) {
			const hasR4 = qualRows.some(m => m.team_1_r4 !== null || m.team_2_r4 !== null);
			const hasR3 = qualRows.some(m => m.team_1_r3 !== null || m.team_2_r3 !== null);
			const hasR2 = qualRows.some(m => m.team_1_r2 !== null || m.team_2_r2 !== null);
			setQualRound(hasR4 ? 4 : hasR3 ? 3 : hasR2 ? 2 : 1);
		}
		setIsLoading(false);
	}

	async function refreshMatches() {
		const { data } = await supabase
			.from("matches")
			.select("*, team_1:team_1_id(id,team_name,category,country,booth_number), team_2:team_2_id(id,team_name,category,country,booth_number), winner:winner_id(id,team_name,category)")
			.order("phase", { ascending: true })
			.order("match_order", { ascending: true });
		if (data) setMatches(data as MatchWithTeams[]);
	}

	useEffect(() => {
		loadMatches();
	}, []);

	// Keep standings fresh so R2-R4 dynamic pairings reflect real-time scores
	useEffect(() => {
		const ch = supabase
			.channel("mc-matches-live")
			.on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" },
				() => { refreshMatches(); })
			.subscribe();
		return () => { supabase.removeChannel(ch); };
	}, []);

	const liveMatches = useMemo(() => matches.filter((m) => matchStatus(m) === "live"), [matches]);

	// ── Qualifier-round mode ────────────────────────────────────────────────────
	const isQualMode = phaseFilter === "Qualifiers";

	const qualMatches = useMemo(
		() => matches.filter((m) => m.phase === "Qualifiers" && (category === "All" || m.category === category)),
		[matches, category],
	);

	// R1: existing DB pairings, with search applied
	const r1Matches = useMemo(() => {
		if (!isQualMode || qualRound !== 1) return [];
		const q = search.trim().toLowerCase();
		return qualMatches.filter((m) => {
			if (!q) return true;
			const t1 = (m.team_1 as { team_name: string } | null)?.team_name?.toLowerCase() ?? "";
			const t2 = (m.team_2 as { team_name: string } | null)?.team_name?.toLowerCase() ?? "";
			return t1.includes(q) || t2.includes(q);
		});
	}, [isQualMode, qualRound, qualMatches, search]);

	// R2–R4: compute pairings per category from standings after the previous round
	const computedPairings = useMemo(() => {
		if (!isQualMode || qualRound === 1) return null;
		const upToRound = (qualRound - 1) as 1 | 2 | 3;
		const cats: Category[] = category === "All" ? ["Junior", "Senior"] : [category];
		return cats.flatMap((cat) => {
			const catMatches = qualMatches.filter((m) => m.category === cat);
			if (catMatches.length === 0) return [];
			const teams = computeScoresUpTo(catMatches, upToRound);
			if (teams.length === 0) return [];
			const q = search.trim().toLowerCase();
			const visible = q ? teams.filter((t) => t.name.toLowerCase().includes(q)) : teams;
			if (visible.length === 0) return [];
			return [{ cat, pairs: buildPairings(visible) }];
		});
	}, [isQualMode, qualRound, qualMatches, category, search]);

	// ── Normal (non-qualifier) view ─────────────────────────────────────────────
	const filtered = useMemo(() => {
		if (isQualMode) return [];
		return matches.filter((m) => {
			if (category !== "All" && m.category !== category) return false;
			if (phaseFilter !== "All" && m.phase !== phaseFilter) return false;
			const q = search.trim().toLowerCase();
			if (q) {
				const t1 = (m.team_1 as { team_name: string } | null)?.team_name?.toLowerCase() ?? "";
				const t2 = (m.team_2 as { team_name: string } | null)?.team_name?.toLowerCase() ?? "";
				if (!t1.includes(q) && !t2.includes(q)) return false;
			}
			return true;
		});
	}, [matches, category, phaseFilter, isQualMode, search]);

	const grouped = useMemo(() => {
		const map = new Map<Phase, MatchWithTeams[]>();
		for (const m of filtered) {
			if (!map.has(m.phase)) map.set(m.phase, []);
			map.get(m.phase)!.push(m);
		}
		return PHASES.filter((p) => map.has(p)).map((p) => ({ phase: p, matches: map.get(p)! }));
	}, [filtered]);

	async function handleRefresh() {
		setIsRefreshing(true);
		await loadMatches();
		setIsRefreshing(false);
	}

	return (
		<div className="min-h-screen bg-editorial-bg">
			{/* ── Header ──────────────────────────────────────────────── */}
			<header className="bg-editorial-ink sticky top-0 z-30 border-b-4 border-editorial-gold">
				<div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
					<Mic size={15} className="text-editorial-gold shrink-0" />
					<span className="text-xs font-black uppercase tracking-widest text-white mr-auto">
						MC View
					</span>

					{/* Category toggle */}
					<div className="flex items-center gap-0.5 bg-white/10 p-0.5">
						{(["All", "Junior", "Senior"] as const).map((c) => (
							<button
								key={c}
								onClick={() => setCategory(c)}
								className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors ${
									category === c ? "bg-editorial-gold text-white" : "text-white/50 hover:text-white"
								}`}
							>
								{c}
							</button>
						))}
					</div>

					<button
						onClick={handleRefresh}
						disabled={isRefreshing}
						className="p-1.5 text-white/50 hover:text-editorial-gold transition-colors disabled:opacity-40"
					>
						<RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
					</button>
				</div>
			</header>

			{/* ── Live banner ──────────────────────────────────────────── */}
			{liveMatches.length > 0 && (
				<div className="bg-editorial-gold/95 px-4 py-2">
					<div className="max-w-4xl mx-auto">
						<p className="text-[10px] font-black uppercase tracking-widest text-white">
							● Now on court —{" "}
							{liveMatches.map((m) => {
								const t1 = (m.team_1 as { team_name: string } | null)?.team_name ?? "TBD";
								const t2 = (m.team_2 as { team_name: string } | null)?.team_name ?? "TBD";
								return `${tc(t1)} vs ${tc(t2)}${m.table_number ? ` (Table ${m.table_number})` : ""}`;
							}).join("   ·   ")}
						</p>
					</div>
				</div>
			)}

			<div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
				{/* ── Filters ──────────────────────────────────────────── */}
				<div className="flex gap-2">
					<div className="relative flex-1">
						<Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
						<input
							type="text"
							placeholder="Search team…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full pl-8 pr-3 py-2 text-sm border border-editorial-ink/20 focus:outline-none focus:border-editorial-gold bg-white text-editorial-ink placeholder:text-gray-300"
						/>
					</div>
					<CustomSelect
						value={phaseFilter}
						options={[{ value: "All", label: "All Phases" }, ...PHASES.map((p) => ({ value: p, label: p }))]}
						onChange={(v) => updatePhaseFilter(v as Phase | "All")}
						showSearch={false}
						defaultValue="All"
					/>
				</div>

				{/* ── Qualifier round tabs ──────────────────────────────── */}
				{isQualMode && (
					<div>
						<p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Round</p>
						<div className="flex items-center gap-1 flex-wrap">
							{([1, 2, 3, 4] as const).map((r) => (
								<button
									key={r}
									onClick={() => setQualRound(r)}
									className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors border ${
										qualRound === r
											? "bg-editorial-ink text-white border-editorial-ink"
											: "bg-white text-editorial-ink border-editorial-ink/20 hover:border-editorial-ink/50"
									}`}
								>
									R{r}
								</button>
							))}
							{qualRound > 1 && (
								<span className="ml-1 text-[9px] text-gray-400 italic">
									Pairings based on standings after R{qualRound - 1}
								</span>
							)}
						</div>
					</div>
				)}

				{/* ── Content ──────────────────────────────────────────── */}
				{isLoading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 size={24} className="animate-spin text-editorial-gold" />
					</div>
				) : isQualMode ? (
					qualRound === 1 ? (
						r1Matches.length === 0 ? (
							<div className="text-center py-12 text-gray-400 text-sm">No qualifier matches found.</div>
						) : (
							<div className="space-y-4">
								<div className="flex items-center gap-2 pb-2 border-b border-editorial-ink/10">
									<span className="text-[10px] font-black uppercase tracking-widest text-editorial-ink">
										Round 1 — Official Pairings
									</span>
									<span className="text-[9px] text-gray-400">System generated</span>
								</div>
								<div className="space-y-1.5">
									{r1Matches.map((m) => <MatchRow key={m.id} match={m} />)}
								</div>
							</div>
						)
					) : !computedPairings || computedPairings.length === 0 ? (
						<div className="text-center py-12 text-gray-400 text-sm">
							No R{qualRound - 1} scores recorded yet — pairings will appear once scores are entered.
						</div>
					) : (
						<div className="space-y-6">
							{computedPairings.map(({ cat, pairs }) => (
								<div key={cat}>
									<div className="flex items-center gap-2 pb-2 border-b border-editorial-ink/10 mb-3">
										<span className="text-[10px] font-black uppercase tracking-widest text-editorial-ink">
											Round {qualRound} — {cat}
										</span>
										<span className="text-[9px] text-gray-400">
											{pairs.length} pairing{pairs.length !== 1 ? "s" : ""} · 1st vs last
										</span>
									</div>
									<div className="space-y-1.5">
										{pairs.map((pairing) => (
											<MatchRow key={pairing.t1.id} match={pairingToMatch(pairing, cat)} />
										))}
									</div>
								</div>
							))}
						</div>
					)
				) : grouped.length === 0 ? (
					<div className="text-center py-20 text-gray-400 text-sm">No matches found.</div>
				) : (
					grouped.map(({ phase, matches: phaseMatches }) => (
						<div key={phase}>
							<div className="flex items-center gap-3 mb-2 pb-2 border-b border-editorial-ink/10">
								<span className="text-[10px] font-black uppercase tracking-widest text-editorial-ink">
									{phase}
								</span>
								<span className="text-[9px] text-gray-400">
									{phaseMatches.length} match{phaseMatches.length !== 1 ? "es" : ""}
								</span>
								{(() => {
									const next = phaseMatches
										.filter((m) => !m.winner_id && m.scheduled_time)
										.sort((a, b) => new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime())[0];
									if (!next) return null;
									return (
										<span className="text-[9px] text-gray-400 ml-auto">
											Next: {formatDate(next.scheduled_time)} {formatTime(next.scheduled_time)}
										</span>
									);
								})()}
							</div>
							<div className="space-y-1.5">
								{phaseMatches.map((m) => <MatchRow key={m.id} match={m} />)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
