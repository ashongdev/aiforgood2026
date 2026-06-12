import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import ReactGA from "react-ga4";
import { BookOpen, CalendarDays, CloudOff, RotateCcw } from "lucide-react";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { BracketList } from "./components/BracketList";
import { CategoryToggle } from "./components/CategoryToggle";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { LockedScoreboardScreen } from "./components/LockedScoreboardScreen";
import { MatchDetailView } from "./components/MatchDetailView";
import { PhaseNavigation } from "./components/PhaseNavigation";
import { QualifiersTable } from "./components/QualifiersTable";
import type { SpectatorStanding } from "./components/QualifiersTable";
import { RulesPage } from "./components/RulesPage";
import { ScheduleView } from "./components/ScheduleView";
import { TeamBreakdownModal } from "./components/TeamBreakdownModal";
import { TeamShowcase } from "./components/TeamShowcase";
import { useEffects } from "./hooks/useEffects";
import { supabase } from "./lib/supabase";
import { tc } from "./lib/format";
import type { Category, MatchWithTeams, Phase, Team } from "./lib/database.types";
import type { Match as LegacyMatch } from "./lib/matchService";

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECTATOR_CACHE_PREFIX = "spectator_cache";

const PHASES: Phase[] = [
	"Qualifiers",
	"Pre-Quarterfinals",
	"Quarterfinals",
	"Semifinals",
	"Third Place",
	"Finals",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// rankByTotal=true for Pre-Quarters/Quarters (rulebook §h.4.2: ranked by total points)
// rankByTotal=false for Qualifiers (ranked by best single round, total as tie-breaker)
function computeSpectatorStandings(matches: MatchWithTeams[], rankByTotal = false): SpectatorStanding[] {
	const map = new Map<string, {
		team_name: string;
		country: string | null;
		r1: number | null; r2: number | null; r3: number | null; r4: number | null;
		best_round: number; total: number;
	}>();

	function processTeam(
		id: string | null, team: { team_name: string; country?: string | null } | null,
		r1: number | null, r2: number | null, r3: number | null, r4: number | null,
	) {
		if (!id || !team) return;
		const scored = [r1, r2, r3, r4].filter((v): v is number => v !== null && v > 0);
		const e = map.get(id) ?? { team_name: tc(team.team_name), country: tc(team.country), r1: null, r2: null, r3: null, r4: null, best_round: 0, total: 0 };
		if (e.r1 === null && r1 !== null) e.r1 = r1;
		if (e.r2 === null && r2 !== null) e.r2 = r2;
		if (e.r3 === null && r3 !== null) e.r3 = r3;
		if (e.r4 === null && r4 !== null) e.r4 = r4;
		if (scored.length > 0) {
			e.best_round = Math.max(e.best_round, ...scored);
			e.total += scored.reduce((a, b) => a + b, 0);
		}
		map.set(id, e);
	}

	for (const m of matches) {
		processTeam(m.team_1_id, m.team_1, m.team_1_r1, m.team_1_r2, m.team_1_r3, m.team_1_r4);
		processTeam(m.team_2_id, m.team_2, m.team_2_r1, m.team_2_r2, m.team_2_r3, m.team_2_r4);
	}

	return Array.from(map.entries())
		.sort(([, a], [, b]) => rankByTotal
			? (b.total !== a.total ? b.total - a.total : b.best_round - a.best_round)
			: (b.best_round !== a.best_round ? b.best_round - a.best_round : b.total - a.total))
		.map(([id, e], i) => ({ ...e, teamId: id, rank: i + 1 }));
}

function sumRounds(...vals: (number | null)[]): number | null {
	const nums = vals.filter((v): v is number => v !== null);
	return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null;
}

function toMatch(m: MatchWithTeams): LegacyMatch {
	return {
		id: m.id,
		team1: tc(m.team_1?.team_name) || "TBD",
		team2: tc(m.team_2?.team_name) || "TBD",
		team1Id: m.team_1_id,
		team2Id: m.team_2_id,
		team1Country: (m.team_1 as { country?: string | null } | null)?.country ?? null,
		team2Country: (m.team_2 as { country?: string | null } | null)?.country ?? null,
		team1Score: sumRounds(m.team_1_r1, m.team_1_r2, m.team_1_r3, m.team_1_r4) ?? m.team_1_final_points,
		team2Score: sumRounds(m.team_2_r1, m.team_2_r2, m.team_2_r3, m.team_2_r4) ?? m.team_2_final_points,
		team1R1: m.team_1_r1,
		team1R2: m.team_1_r2,
		team1R3: m.team_1_r3,
		team1R4: m.team_1_r4,
		team2R1: m.team_2_r1,
		team2R2: m.team_2_r2,
		team2R3: m.team_2_r3,
		team2R4: m.team_2_r4,
		winner: m.winner_id ? (m.winner_id === m.team_1_id ? 0 : 1) : null,
		station: m.table_number !== null ? String(m.table_number) : String(m.match_order),
		isBye: false,
	};
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
	useEffect(() => {
		ReactGA.initialize("G-Z8EWG2FKDC");
		ReactGA.send({ hitType: "pageview", page: window.location.pathname });
	}, []);

	const [phaseIndex, setPhaseIndex] = useState(() => {
		const saved = localStorage.getItem("spectator_phase_idx");
		const n = saved ? parseInt(saved, 10) : 0;
		return isNaN(n) ? 0 : Math.max(0, Math.min(n, PHASES.length - 1));
	});
	// CategoryToggle uses lowercase; Supabase uses capitalized
	const [category, setCategory] = useState<"junior" | "senior">(() => {
		return (localStorage.getItem("selectedCategory") as "junior" | "senior") ?? "junior";
	});
	const isOnline = useOnlineStatus();
	const [matches, setMatches] = useState<MatchWithTeams[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [cachedAt, setCachedAt] = useState<Date | null>(null);
	const [advanceCount, setAdvanceCount] = useState(0);
	const [phaseLocks, setPhaseLocks] = useState<Record<string, string>>({});
	const [selectedMatch, setSelectedMatch] = useState<LegacyMatch | null>(null);
	const [currentPage, setCurrentPage] = useState<"bracket" | "rules" | "schedule">("bracket");
	const [breakdownTeam, setBreakdownTeam] = useState<{ id: string; name: string; phase: string } | null>(null);
	const { effects, triggerEffect } = useEffects();

	const currentPhase = PHASES[phaseIndex];
	const supabaseCategory: Category = category === "junior" ? "Junior" : "Senior";
	const isQualifiers = currentPhase === "Qualifiers";
	// Pre-Quarters and Quarters are NOT H2H — teams compete independently, ranked by total (§h.4.2-4.3)
	const isLeaderboardPhase = isQualifiers || currentPhase === "Pre-Quarterfinals" || currentPhase === "Quarterfinals";
	// How many teams advance from each leaderboard phase
	const phaseAdvanceCount = isQualifiers ? advanceCount
		: currentPhase === "Pre-Quarterfinals" ? 8
		: currentPhase === "Quarterfinals" ? 4
		: 0;
	const lockType = phaseLocks[`${currentPhase}_${supabaseCategory}`] ?? null;

	useEffect(() => { localStorage.setItem("selectedCategory", category); }, [category]);
	useEffect(() => { localStorage.setItem("spectator_phase_idx", String(phaseIndex)); }, [phaseIndex]);

	// ── Data loading ──────────────────────────────────────────────────────────

	function loadFromCache(cacheKey: string) {
		try {
			const raw = localStorage.getItem(cacheKey);
			if (!raw) return false;
			const { matches: m, teams: t, timestamp } = JSON.parse(raw) as {
				matches: MatchWithTeams[];
				teams: Team[];
				timestamp: number;
			};
			setMatches(m ?? []);
			if (t?.length > 0) setTeams(t);
			setCachedAt(new Date(timestamp));
			return true;
		} catch {
			return false;
		}
	}

	async function loadMatches() {
		setIsLoading(true);
		const cacheKey = `${SPECTATOR_CACHE_PREFIX}_${currentPhase}_${supabaseCategory}`;

		try {
			const [matchRes, teamRes] = await Promise.all([
				supabase
					.from("matches")
					.select("*, team_1:team_1_id(id,team_name,category,country), team_2:team_2_id(id,team_name,category,country), winner:winner_id(id,team_name,category)")
					.eq("phase", currentPhase)
					.eq("category", supabaseCategory)
					.order("match_order", { ascending: true }),
				isQualifiers
					? supabase.from("teams").select("*").eq("category", supabaseCategory).order("team_name")
					: Promise.resolve({ data: null, error: null }),
			]);

			if (matchRes.error) {
				loadFromCache(cacheKey);
			} else {
				const matchData = (matchRes.data as MatchWithTeams[]) ?? [];
				const teamData = (teamRes.data as Team[]) ?? [];
				setMatches(matchData);
				if (teamData.length > 0) setTeams(teamData);
				setCachedAt(null);
				// Persist to cache for offline use
				localStorage.setItem(cacheKey, JSON.stringify({
					matches: matchData,
					teams: teamData,
					timestamp: Date.now(),
				}));
			}
		} catch {
			loadFromCache(cacheKey);
		}

		setIsLoading(false);
	}

	useEffect(() => { loadMatches(); }, [phaseIndex, category]);

	// Realtime: live score updates for current view
	useEffect(() => {
		const channel = supabase
			.channel(`spectator-${currentPhase}-${supabaseCategory}`)
			.on("postgres_changes", {
				event: "*", schema: "public", table: "matches",
				filter: `phase=eq.${currentPhase}`,
			}, () => { loadMatches(); })
			.subscribe();
		return () => { supabase.removeChannel(channel); };
	}, [phaseIndex, category]);

	// Load and subscribe to phase locks
	useEffect(() => {
		supabase.from("phase_locks").select("*").then(({ data }) => {
			if (data) {
				const locks: Record<string, string> = {};
				(data as any[]).forEach((l) => { locks[`${l.phase}_${l.category}`] = l.lock_type; });
				setPhaseLocks(locks);
			}
		});

		const lockChannel = supabase
			.channel("spectator-phase-locks")
			.on("postgres_changes", { event: "*", schema: "public", table: "phase_locks" }, (payload) => {
				if (payload.eventType === "DELETE") {
					const { phase, category: cat } = payload.old as any;
					setPhaseLocks((prev) => {
						const next = { ...prev };
						delete next[`${phase}_${cat}`];
						return next;
					});
				} else {
					const { phase, category: cat, lock_type } = payload.new as any;
					setPhaseLocks((prev) => ({ ...prev, [`${phase}_${cat}`]: lock_type }));
				}
			})
			.subscribe();
		return () => { supabase.removeChannel(lockChannel); };
	}, []);

	// Determine how many qualifier teams advance (based on what bracket phase exists)
	useEffect(() => {
		if (!isQualifiers) return;
		(async () => {
			const checks: [Phase, number][] = [
				["Pre-Quarterfinals", 16],
				["Quarterfinals", 8],
				["Semifinals", 4],
			];
			for (const [phase, count] of checks) {
				const { count: n } = await supabase
					.from("matches")
					.select("*", { count: "exact", head: true })
					.eq("phase", phase)
					.eq("category", supabaseCategory);
				if ((n ?? 0) > 0) { setAdvanceCount(count); return; }
			}
			setAdvanceCount(0);
		})();
	}, [isQualifiers, category]);

	// ── Navigation ────────────────────────────────────────────────────────────

	const prevPhase = () => setPhaseIndex((i) => (i - 1 + PHASES.length) % PHASES.length);
	const nextPhase = () => setPhaseIndex((i) => (i + 1) % PHASES.length);

	// ── Derived data ──────────────────────────────────────────────────────────

	const spectatorStandings = useMemo(
		() => isLeaderboardPhase ? computeSpectatorStandings(matches, !isQualifiers) : [],
		[matches, currentPhase],
	);
	const legacyMatches = useMemo(() => matches.map(toMatch), [matches]);

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="min-h-screen bg-editorial-bg text-editorial-ink font-sans selection:bg-editorial-gold selection:text-white border-12 md:border-24 border-editorial-ink flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] p-6 overflow-x-hidden relative">

			{/* FAB buttons */}
			<div className="fixed bottom-6 right-6 z-30 flex gap-3">
				<button
					onClick={loadMatches}
					disabled={isLoading}
					title="Refresh scores"
					className={`border-2 border-editorial-ink p-3 transition-all shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] ${
						isLoading
							? "bg-editorial-green text-white"
							: "bg-editorial-gold text-editorial-ink hover:bg-editorial-ink hover:text-editorial-gold"
					}`}
					aria-label="Refresh scores"
				>
					<RotateCcw size={24} className={isLoading ? "animate-spin" : ""} />
				</button>
				<button
					onClick={() => setCurrentPage(currentPage === "schedule" ? "bracket" : "schedule")}
					className={`border-2 border-editorial-ink p-3 hover:bg-editorial-ink hover:text-editorial-gold transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] ${
						currentPage === "schedule" ? "bg-editorial-ink text-white" : "bg-editorial-gold text-editorial-ink"
					}`}
					aria-label="Toggle schedule"
					title={currentPage === "schedule" ? "View Bracket" : "View Schedule"}
				>
					<CalendarDays size={24} />
				</button>
				<button
					onClick={() => {
						ReactGA.event({ category: "User", action: "Scoring Rules Button Clicked" });
						setCurrentPage(currentPage === "rules" ? "bracket" : "rules");
					}}
					className={`border-2 border-editorial-ink p-3 hover:bg-editorial-ink hover:text-editorial-gold transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] ${
						currentPage === "rules" ? "bg-editorial-ink text-white" : "bg-editorial-gold text-editorial-ink"
					}`}
					aria-label="Toggle rules"
					title={currentPage === "rules" ? "View Bracket" : "View Scoring Rules"}
				>
					<BookOpen size={24} />
				</button>
			</div>

			{currentPage === "rules" ? (
				<RulesPage />
			) : currentPage === "schedule" ? (
				<div className="w-full flex flex-col items-center px-4">
					<CategoryToggle category={category} onChange={setCategory} />
					<ScheduleView category={supabaseCategory} />
				</div>
			) : (
				<AnimatePresence mode="wait">
					{!selectedMatch ? (
						<div className="w-full flex flex-col items-center">
							<CategoryToggle category={category} onChange={setCategory} />

							{/* Offline / cached data banner */}
							{(!isOnline || cachedAt) && (
								<div className="w-full max-w-2xl mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
									<CloudOff size={13} className="shrink-0" />
									<span>
										{!isOnline && !cachedAt && "Offline — connecting to last known scores…"}
										{cachedAt && (
											<>
												{!isOnline ? "Offline · " : ""}
												Showing cached scores from{" "}
												{cachedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
											</>
										)}
									</span>
								</div>
							)}

							{isLoading && <LoadingSpinner />}

							{!isLoading && (
								<>
									<PhaseNavigation
										currentPhase={phaseIndex}
										phaseName={currentPhase}
										onPrevPhase={prevPhase}
										onNextPhase={nextPhase}
									/>

									{lockType === "full" ? (
										<LockedScoreboardScreen />
									) : isQualifiers && matches.length === 0 ? (
										<TeamShowcase teams={teams} category={supabaseCategory} />
									) : isLeaderboardPhase ? (
										<QualifiersTable
											standings={spectatorStandings}
											advanceCount={phaseAdvanceCount}
											scoresHidden={lockType === "scores"}
											onViewBreakdown={(id, name) => setBreakdownTeam({ id, name, phase: currentPhase })}
										/>
									) : matches.length === 0 ? (
										<div className="text-center py-16 text-sm text-gray-400">
											No matches scheduled for {currentPhase} yet.
										</div>
									) : (
										<BracketList
											matches={legacyMatches}
											onSelectMatch={setSelectedMatch}
											onTeamBreakdown={(id, name) => setBreakdownTeam({ id, name, phase: currentPhase })}
										/>
									)}
								</>
							)}
						</div>
					) : (
						<MatchDetailView
							match={selectedMatch}
							currentPhase={phaseIndex}
							shared={false}
							effects={effects}
							onBack={() => setSelectedMatch(null)}
							onCheerLeft={() => triggerEffect("cheer", "left")}
							onBooLeft={() => triggerEffect("boo", "left")}
							onCheerRight={() => triggerEffect("cheer", "right")}
							onBooRight={() => triggerEffect("boo", "right")}
						/>
					)}
				</AnimatePresence>
			)}

		{breakdownTeam && (
			<TeamBreakdownModal
				teamId={breakdownTeam.id}
				teamName={breakdownTeam.name}
				phase={breakdownTeam.phase}
				category={supabaseCategory}
				onClose={() => setBreakdownTeam(null)}
			/>
		)}
		</div>
	);
}
