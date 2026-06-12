import { useEffect, useMemo, useState } from "react";
import { LogOut, Mic, RefreshCw, Search, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { CustomSelect } from "../components/CustomSelect";
import { getCountryFlag } from "../lib/countryFlag";
import { tc } from "../lib/format";
import type { Category, MatchWithTeams, Phase } from "../lib/database.types";

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

const STATUS_LABEL: Record<MatchStatus, string> = {
	upcoming: "Upcoming",
	live: "LIVE",
	done: "Done",
};

const STATUS_STYLE: Record<MatchStatus, string> = {
	upcoming: "bg-gray-100 text-gray-500",
	live: "bg-editorial-gold text-white animate-pulse font-black",
	done: "bg-green-50 text-green-700 border border-green-200",
};

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({ match }: { match: MatchWithTeams }) {
	const status = matchStatus(match);
	const team1 = match.team_1;
	const team2 = match.team_2;
	const winner = match.winner_id;
	const t1Wins = winner && match.team_1_id === winner;
	const t2Wins = winner && match.team_2_id === winner;

	return (
		<div className={`border-2 bg-white overflow-hidden ${
			status === "live"
				? "border-editorial-gold shadow-[4px_4px_0px_0px_rgba(212,160,23,1)]"
				: "border-editorial-ink/20"
		}`}>
			{/* Phase / table header */}
			<div className={`flex items-center justify-between px-4 py-2 ${
				status === "live" ? "bg-editorial-gold" : "bg-editorial-ink"
			}`}>
				<div className="flex items-center gap-2">
					<span className="text-[10px] font-black uppercase tracking-widest text-white/70">
						{PHASE_SHORT[match.phase] ?? match.phase}
					</span>
					{match.table_number && (
						<span className="text-[10px] font-black uppercase tracking-widest text-white">
							· Table {match.table_number}
						</span>
					)}
				</div>
				<div className="flex items-center gap-3">
					{match.scheduled_time && (
						<span className="text-[10px] font-mono text-white/80">
							{formatTime(match.scheduled_time)}
						</span>
					)}
					<span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 ${STATUS_STYLE[status]}`}>
						{STATUS_LABEL[status]}
					</span>
				</div>
			</div>

			{/* Teams — horizontal split */}
			<div className="flex min-h-20">
				{/* Team 1 */}
				<div className={`flex-1 flex flex-col items-center justify-center gap-1 px-4 py-5 text-center ${
					t2Wins ? "opacity-35" : ""
				} ${t1Wins ? "bg-editorial-gold/5 border-r-2 border-editorial-gold" : "border-r border-editorial-ink/10"}`}>
					{team1 ? (
						<>
							{getCountryFlag((team1 as { team_name: string; country?: string | null }).country) && (
								<span className="text-xl leading-none">
									{getCountryFlag((team1 as { team_name: string; country?: string | null }).country)}
								</span>
							)}
							<span className="text-base font-black text-editorial-ink leading-tight">
								{tc(team1.team_name)}
							</span>
							{t1Wins && (
								<span className="text-[9px] font-black uppercase tracking-widest text-editorial-gold mt-0.5">
									Winner
								</span>
							)}
						</>
					) : (
						<span className="text-sm text-gray-300 italic">TBD</span>
					)}
				</div>

				{/* VS */}
				<div className="flex flex-col items-center justify-center px-3 bg-gray-50 border-x border-editorial-ink/10">
					<span className="text-[11px] font-black italic text-gray-400">VS</span>
				</div>

				{/* Team 2 */}
				<div className={`flex-1 flex flex-col items-center justify-center gap-1 px-4 py-5 text-center ${
					t1Wins ? "opacity-35" : ""
				} ${t2Wins ? "bg-editorial-gold/5 border-l-2 border-editorial-gold" : "border-l border-editorial-ink/10"}`}>
					{team2 ? (
						<>
							{getCountryFlag((team2 as { team_name: string; country?: string | null }).country) && (
								<span className="text-xl leading-none">
									{getCountryFlag((team2 as { team_name: string; country?: string | null }).country)}
								</span>
							)}
							<span className="text-base font-black text-editorial-ink leading-tight">
								{tc(team2.team_name)}
							</span>
							{t2Wins && (
								<span className="text-[9px] font-black uppercase tracking-widest text-editorial-gold mt-0.5">
									Winner
								</span>
							)}
						</>
					) : (
						<span className="text-sm text-gray-300 italic">TBD</span>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MCPage() {
	const { profile, isLoading: authLoading, signOut } = useAuth();

	const [matches, setMatches] = useState<MatchWithTeams[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [category, setCategory] = useState<Category | "All">("All");
	const [phaseFilter, setPhaseFilter] = useState<Phase | "All">("All");
	const [search, setSearch] = useState("");
	const [isRefreshing, setIsRefreshing] = useState(false);

	if (authLoading) {
		return (
			<div className="min-h-screen bg-editorial-ink flex items-center justify-center">
				<Loader2 size={32} className="animate-spin text-editorial-gold" />
			</div>
		);
	}

	if (!profile) {
		return <Navigate to="/login" replace />;
	}

	async function loadMatches() {
		setIsLoading(true);
		const { data } = await supabase
			.from("matches")
			.select("*, team_1:team_1_id(id,team_name,category,country), team_2:team_2_id(id,team_name,category,country), winner:winner_id(id,team_name,category)")
			.order("phase", { ascending: true })
			.order("match_order", { ascending: true });
		setMatches((data as MatchWithTeams[]) ?? []);
		setIsLoading(false);
	}

	// eslint-disable-next-line react-hooks/rules-of-hooks
	useEffect(() => {
		loadMatches();
	}, []);

	// eslint-disable-next-line react-hooks/rules-of-hooks
	const filtered = useMemo(() => {
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
	}, [matches, category, phaseFilter, search]);

	// Group by phase
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const grouped = useMemo(() => {
		const map = new Map<Phase, MatchWithTeams[]>();
		for (const m of filtered) {
			if (!map.has(m.phase)) map.set(m.phase, []);
			map.get(m.phase)!.push(m);
		}
		// Return in canonical phase order
		return PHASES.filter((p) => map.has(p)).map((p) => ({ phase: p, matches: map.get(p)! }));
	}, [filtered]);

	// Live matches for the banner
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const liveMatches = useMemo(() => matches.filter((m) => matchStatus(m) === "live"), [matches]);

	async function handleRefresh() {
		setIsRefreshing(true);
		await loadMatches();
		setIsRefreshing(false);
	}

	return (
		<div className="min-h-screen bg-editorial-bg">
			{/* ── Header ──────────────────────────────────────────────── */}
			<header className="bg-editorial-ink sticky top-0 z-30">
				<div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<Mic size={16} className="text-editorial-gold shrink-0" />
						<span className="text-xs font-black uppercase tracking-widest text-white">
							MC View
						</span>
					</div>

					{/* Category toggle */}
					<div className="flex items-center gap-1 bg-white/10 p-0.5">
						{(["All", "Junior", "Senior"] as const).map((c) => (
							<button
								key={c}
								onClick={() => setCategory(c)}
								className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors ${
									category === c
										? "bg-editorial-gold text-white"
										: "text-white/60 hover:text-white"
								}`}
							>
								{c}
							</button>
						))}
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={handleRefresh}
							disabled={isRefreshing}
							className="p-1.5 text-white/60 hover:text-editorial-gold transition-colors disabled:opacity-40"
						>
							<RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
						</button>
						<button
							onClick={signOut}
							className="p-1.5 text-white/60 hover:text-red-400 transition-colors"
						>
							<LogOut size={14} />
						</button>
					</div>
				</div>
			</header>

			{/* ── Live banner ──────────────────────────────────────────── */}
			{liveMatches.length > 0 && (
				<div className="bg-editorial-gold text-white px-4 py-2.5">
					<div className="max-w-5xl mx-auto">
						<p className="text-[11px] font-black uppercase tracking-widest">
							🔴 NOW ON COURT —{" "}
							{liveMatches.map((m) => {
								const t1 = (m.team_1 as { team_name: string } | null)?.team_name ?? "TBD";
								const t2 = (m.team_2 as { team_name: string } | null)?.team_name ?? "TBD";
								return `${t1} vs ${t2} (Table ${m.table_number ?? "?"})`;
							}).join("   ·   ")}
						</p>
					</div>
				</div>
			)}

			<div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
				{/* ── Filters ──────────────────────────────────────────── */}
				<div className="flex flex-col sm:flex-row gap-3">
					{/* Search */}
					<div className="relative flex-1">
						<Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
						<input
							type="text"
							placeholder="Search team name…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full pl-8 pr-3 py-2 text-sm border-2 border-editorial-ink/20 focus:outline-none focus:border-editorial-gold bg-white text-editorial-ink placeholder:text-gray-300"
						/>
					</div>

					{/* Phase filter */}
					<CustomSelect
						value={phaseFilter}
						options={[{ value: "All", label: "All Phases" }, ...PHASES.map(p => ({ value: p, label: p }))]}
						onChange={(v) => setPhaseFilter(v as Phase | "All")}
						showSearch={false}
						defaultValue="All"
					/>
				</div>

				{/* ── Matches ──────────────────────────────────────────── */}
				{isLoading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 size={28} className="animate-spin text-editorial-gold" />
					</div>
				) : grouped.length === 0 ? (
					<div className="text-center py-20 text-gray-400 text-sm">
						No matches found.
					</div>
				) : (
					grouped.map(({ phase, matches: phaseMatches }) => (
						<div key={phase}>
							{/* Phase heading */}
							<div className="flex items-center gap-3 mb-3">
								<h2 className="text-lg font-black uppercase tracking-widest text-editorial-ink">
									{phase}
								</h2>
								<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
									{phaseMatches.length} match{phaseMatches.length !== 1 ? "es" : ""}
								</span>
								{/* Show next scheduled time in this phase */}
								{(() => {
									const next = phaseMatches
										.filter((m) => !m.winner_id && m.scheduled_time)
										.sort((a, b) => new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime())[0];
									if (!next) return null;
									return (
										<span className="text-[10px] text-gray-400">
											Next: {formatDate(next.scheduled_time)} {formatTime(next.scheduled_time)}
										</span>
									);
								})()}
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{phaseMatches.map((m) => (
									<MatchCard key={m.id} match={m} />
								))}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
