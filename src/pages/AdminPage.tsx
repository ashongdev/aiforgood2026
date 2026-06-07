import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	AlertCircle,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	Lock,
	LogOut,
	Plus,
	RefreshCw,
	Trash2,
	Trophy,
	Unlock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { Category, MatchWithTeams, Phase, Team } from "../lib/database.types";

// ─── Types & pure helpers ──────────────────────────────────────────────────────

interface Standing {
	team: Team;
	best_round: number;
	total_points: number;
	rank: number;
}

type AdvanceCount = 4 | 8 | 16;
const ADVANCE_OPTIONS: AdvanceCount[] = [4, 8, 16];

const ELIM_PHASES: Phase[] = [
	"Pre-Quarterfinals",
	"Quarterfinals",
	"Semifinals",
	"Third Place",
	"Finals",
];

function targetPhaseFor(x: AdvanceCount): Phase {
	if (x === 16) return "Pre-Quarterfinals";
	if (x === 8) return "Quarterfinals";
	return "Semifinals";
}

function nextPhaseFor(phase: Phase): Phase | null {
	const chain: Partial<Record<Phase, Phase>> = {
		"Pre-Quarterfinals": "Quarterfinals",
		"Quarterfinals": "Semifinals",
		"Semifinals": "Finals",
	};
	return chain[phase] ?? null;
}

/**
 * Bracket-correct seeding: top qualifier seed faces the lowest seed first
 * so the best two teams cannot meet before the Final.
 */
function seedPairings(n: AdvanceCount): [number, number][] {
	if (n === 16) return [[1,16],[8,9],[4,13],[5,12],[2,15],[7,10],[3,14],[6,11]];
	if (n === 8)  return [[1,8],[4,5],[2,7],[3,6]];
	return [[1,4],[2,3]];
}

function computeStandings(matches: MatchWithTeams[]): Standing[] {
	const map = new Map<string, { team: Team; best_round: number; total: number }>();

	const processTeam = (id: string | null, team: Team | null, rounds: (number | null)[]) => {
		if (!id || !team) return;
		const scored = rounds.filter((v): v is number => v !== null && v > 0);
		if (scored.length === 0) {
			if (!map.has(id)) map.set(id, { team, best_round: 0, total: 0 });
			return;
		}
		const e = map.get(id) ?? { team, best_round: 0, total: 0 };
		e.best_round = Math.max(e.best_round, Math.max(...scored));
		e.total += scored.reduce((a, b) => a + b, 0);
		map.set(id, e);
	};

	for (const m of matches) {
		processTeam(m.team_1_id, m.team_1, [m.team_1_r1, m.team_1_r2, m.team_1_r3, m.team_1_r4]);
		processTeam(m.team_2_id, m.team_2, [m.team_2_r1, m.team_2_r2, m.team_2_r3, m.team_2_r4]);
	}

	return Array.from(map.values())
		.sort((a, b) => b.best_round !== a.best_round ? b.best_round - a.best_round : b.total - a.total)
		.map((e, i) => ({ team: e.team, best_round: e.best_round, total_points: e.total, rank: i + 1 }));
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AdminPage() {
	const { signOut } = useAuth();
	const navigate = useNavigate();

	const [category, setCategory] = useState<Category>("Junior");

	// Data
	const [allTeams, setAllTeams] = useState<Team[]>([]);
	const [qualifierMatches, setQualifierMatches] = useState<MatchWithTeams[]>([]);
	const [elimMatches, setElimMatches] = useState<MatchWithTeams[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Qualifier setup form
	const [newTeam1, setNewTeam1] = useState("");
	const [newTeam2, setNewTeam2] = useState("");
	const [newTable, setNewTable] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);

	// Bracket advancement
	const [advanceCount, setAdvanceCount] = useState<AdvanceCount>(8);
	const [showSeedPreview, setShowSeedPreview] = useState(false);
	const [isAdvancing, setIsAdvancing] = useState(false);
	const [advanceError, setAdvanceError] = useState<string | null>(null);
	const [advanceSuccess, setAdvanceSuccess] = useState<string | null>(null);

	// Bracket winner confirmation
	const [winnerConfirming, setWinnerConfirming] = useState<string | null>(null);
	const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);

	// UI state
	const [standingsOpen, setStandingsOpen] = useState(true);

	// Phase locks (keyed by phase string, value = lock_type)
	const [phaseLocks, setPhaseLocks] = useState<Record<string, string>>({});

	// ── Data loading ────────────────────────────────────────────────────────────

	async function loadData() {
		setIsLoading(true);
		setAdvanceError(null);
		setAdvanceSuccess(null);

		const [teamsRes, qRes, eRes] = await Promise.all([
			supabase.from("teams").select("*").eq("category", category).order("team_name"),
			supabase
				.from("matches")
				.select("*, team_1:team_1_id(id,team_name,category), team_2:team_2_id(id,team_name,category), winner:winner_id(id,team_name,category)")
				.eq("phase", "Qualifiers")
				.eq("category", category)
				.order("match_order"),
			supabase
				.from("matches")
				.select("*, team_1:team_1_id(id,team_name,category), team_2:team_2_id(id,team_name,category), winner:winner_id(id,team_name,category)")
				.in("phase", ELIM_PHASES)
				.eq("category", category)
				.order("match_order"),
		]);

		setAllTeams((teamsRes.data as Team[]) ?? []);
		setQualifierMatches((qRes.data as MatchWithTeams[]) ?? []);
		setElimMatches((eRes.data as MatchWithTeams[]) ?? []);
		setIsLoading(false);
	}

	async function loadPhaseLocks() {
		const { data } = await supabase.from("phase_locks").select("*").eq("category", category);
		if (data) {
			const locks: Record<string, string> = {};
			(data as any[]).forEach((l) => { locks[l.phase] = l.lock_type; });
			setPhaseLocks(locks);
		}
	}

	useEffect(() => {
		loadData();
		loadPhaseLocks();
	}, [category]);

	// Realtime: reload standings as scorekeepers enter scores
	useEffect(() => {
		const channel = supabase
			.channel(`admin-realtime-${category}`)
			.on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => { loadData(); })
			.subscribe();
		return () => { supabase.removeChannel(channel); };
	}, [category]);

	// ── Phase lock management ───────────────────────────────────────────────────

	async function handleLockPhase(phase: string, lockType: "full" | "scores") {
		const { error } = await supabase
			.from("phase_locks")
			.upsert({ phase, category, lock_type: lockType }, { onConflict: "phase,category" });
		if (!error) loadPhaseLocks();
	}

	async function handleUnlockPhase(phase: string) {
		const { error } = await supabase
			.from("phase_locks")
			.delete()
			.eq("phase", phase)
			.eq("category", category);
		if (!error) loadPhaseLocks();
	}

	// ── Qualifier match creation ────────────────────────────────────────────────

	async function handleCreateMatch() {
		setCreateError(null);
		if (!newTeam1 || !newTeam2) { setCreateError("Select both teams."); return; }
		if (newTeam1 === newTeam2) { setCreateError("A team cannot play against itself."); return; }

		setIsCreating(true);
		const { error } = await supabase.from("matches").insert({
			phase: "Qualifiers",
			category,
			team_1_id: newTeam1,
			team_2_id: newTeam2,
			table_number: newTable ? parseInt(newTable, 10) : null,
			match_order: qualifierMatches.length + 1,
		});
		setIsCreating(false);

		if (error) {
			setCreateError(error.message);
		} else {
			setNewTeam1(""); setNewTeam2(""); setNewTable("");
			loadData();
		}
	}

	async function handleAutoGenerate() {
		if (allTeams.length < 2) return;
		if (!confirm(`Auto-generate ${Math.floor(allTeams.length / 2)} qualifier matches by pairing all ${allTeams.length} teams sequentially? Existing qualifier matches will NOT be removed.`)) return;

		const rows = [];
		for (let i = 0; i + 1 < allTeams.length; i += 2) {
			rows.push({
				phase: "Qualifiers",
				category,
				team_1_id: allTeams[i].id,
				team_2_id: allTeams[i + 1].id,
				table_number: Math.floor(i / 2) + 1,
				match_order: qualifierMatches.length + Math.floor(i / 2) + 1,
			});
		}

		const { error } = await supabase.from("matches").insert(rows);
		if (error) { setCreateError(error.message); }
		else { loadData(); }
	}

	async function handleDeleteMatch(matchId: string) {
		if (!confirm("Delete this qualifier match? All entered scores will be permanently lost.")) return;
		const { error } = await supabase.from("matches").delete().eq("id", matchId);
		if (!error) loadData();
	}

	// ── Bracket advancement ─────────────────────────────────────────────────────

	const standings = computeStandings(qualifierMatches);
	const targetPhase = targetPhaseFor(advanceCount);
	const pairings = seedPairings(advanceCount);
	const topTeams = standings.slice(0, advanceCount);
	const elimByPhase = ELIM_PHASES.reduce<Record<string, MatchWithTeams[]>>(
		(acc, p) => { acc[p] = elimMatches.filter((m) => m.phase === p); return acc; },
		{},
	);
	const bracketAlreadyExists = (elimByPhase[targetPhase]?.length ?? 0) > 0;

	async function handleAdvanceTeams() {
		if (topTeams.length < advanceCount) {
			setAdvanceError(`Only ${topTeams.length} teams have scores. Need at least ${advanceCount} to advance.`);
			return;
		}
		if (bracketAlreadyExists) {
			setAdvanceError(`${targetPhase} already has ${elimByPhase[targetPhase].length} match row(s). Delete them in Supabase first to re-seed.`);
			return;
		}

		setIsAdvancing(true);
		setAdvanceError(null);

		const rows = pairings.map(([seedA, seedB], i) => ({
			phase: targetPhase,
			category,
			team_1_id: topTeams[seedA - 1].team.id,
			team_2_id: topTeams[seedB - 1].team.id,
			match_order: i + 1,
		}));

		const { error } = await supabase.from("matches").insert(rows);
		setIsAdvancing(false);

		if (error) {
			setAdvanceError(error.message);
		} else {
			setAdvanceSuccess(`${advanceCount} teams seeded into ${targetPhase}.`);
			setShowSeedPreview(false);
			loadData();
		}
	}

	async function handleAdvanceWinners(fromPhase: Phase) {
		const phaseMatches = elimByPhase[fromPhase] ?? [];
		const unconfirmed = phaseMatches.filter((m) => !m.winner_id);
		if (unconfirmed.length > 0) {
			alert(`${unconfirmed.length} match(es) in ${fromPhase} still need a confirmed winner.`);
			return;
		}

		const toPhase = nextPhaseFor(fromPhase);
		if (!toPhase) return;
		if ((elimByPhase[toPhase]?.length ?? 0) > 0) {
			alert(`${toPhase} already has matches. Delete them in Supabase to re-seed.`);
			return;
		}

		const sorted = [...phaseMatches].sort((a, b) => a.match_order - b.match_order);
		const rows: object[] = [];

		for (let i = 0; i + 1 < sorted.length; i += 2) {
			rows.push({
				phase: toPhase,
				category,
				team_1_id: sorted[i].winner_id,
				team_2_id: sorted[i + 1].winner_id,
				match_order: rows.length + 1,
			});
		}

		if (fromPhase === "Semifinals") {
			const getLoserId = (m: MatchWithTeams) =>
				m.winner_id === m.team_1_id ? m.team_2_id : m.team_1_id;
			if (sorted.length >= 2) {
				rows.push({
					phase: "Third Place" as Phase,
					category,
					team_1_id: getLoserId(sorted[0]),
					team_2_id: getLoserId(sorted[1]),
					match_order: 1,
				});
			}
		}

		const { error } = await supabase.from("matches").insert(rows);
		if (error) { alert(`Advance failed: ${error.message}`); }
		else { loadData(); }
	}

	async function handleSetWinner(matchId: string, winnerId: string) {
		setWinnerConfirming(matchId);
		const { error } = await supabase.from("matches").update({ winner_id: winnerId }).eq("id", matchId);
		setWinnerConfirming(null);
		setOverrideMatchId(null);
		if (error) { alert(`Could not set winner: ${error.message}`); }
		else {
			setElimMatches((prev) =>
				prev.map((m) => m.id === matchId ? { ...m, winner_id: winnerId } : m),
			);
		}
	}

	// ── Render ──────────────────────────────────────────────────────────────────

	return (
		<div className="min-h-screen bg-editorial-bg text-editorial-ink font-sans">

			{/* Top bar */}
			<div className="sticky top-0 z-20 bg-editorial-ink text-white border-b-4 border-editorial-gold px-4 py-3 flex items-center gap-3 flex-wrap">
				<Trophy size={15} className="text-editorial-gold shrink-0" />
				<span className="text-xs font-black uppercase tracking-widest mr-auto">Admin Dashboard</span>

				<div className="flex border border-white/20">
					{(["Junior", "Senior"] as Category[]).map((c) => (
						<button key={c} onClick={() => setCategory(c)}
							className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-colors ${
								category === c ? "bg-editorial-gold text-editorial-ink" : "text-white/60 hover:text-white"
							}`}
						>
							{c}
						</button>
					))}
				</div>

				<button onClick={loadData} className="p-1.5 hover:text-editorial-gold transition-colors">
					<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
				</button>
				<a href="/scorekeeper" className="text-xs text-white/60 hover:text-editorial-gold transition-colors uppercase tracking-widest">
					Score Entry
				</a>
				<a href="/" className="text-xs text-white/60 hover:text-editorial-gold transition-colors uppercase tracking-widest">
					Live View
				</a>
				<button onClick={async () => { await signOut(); navigate("/login"); }}
					className="p-1.5 hover:text-editorial-gold transition-colors">
					<LogOut size={14} />
				</button>
			</div>

			<div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
				{isLoading ? (
					<div className="py-20 text-center text-sm text-gray-400">Loading…</div>
				) : (
					<>
						{/* ① QUALIFIER MATCH SETUP ───────────────────────────── */}
						<section>
							<div className="flex items-start justify-between gap-4 flex-wrap mb-4">
								<SectionHeader
									number="01"
									title="Qualifier Match Setup"
									subtitle={`${qualifierMatches.length} match(es) created · ${allTeams.length} teams in ${category} division`}
								/>
								<LockControl
									phase="Qualifiers"
									lockType={phaseLocks["Qualifiers"] ?? null}
									onLock={(lt) => handleLockPhase("Qualifiers", lt)}
									onUnlock={() => handleUnlockPhase("Qualifiers")}
								/>
							</div>

							{/* Create form */}
							<div className="border-2 border-editorial-ink bg-white p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] space-y-4">
								<p className="text-xs font-black uppercase tracking-widest text-gray-400">
									Add new qualifier match
								</p>

								<div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_auto] gap-3 items-end">
									<div className="space-y-1">
										<label className="text-[10px] font-black uppercase tracking-widest">Team 1</label>
										<select
											value={newTeam1}
											onChange={(e) => setNewTeam1(e.target.value)}
											className="w-full border-2 border-editorial-ink px-2 py-2 text-sm bg-editorial-bg focus:outline-none focus:border-editorial-gold"
										>
											<option value="">Select team…</option>
											{allTeams.map((t) => (
												<option key={t.id} value={t.id}>{t.team_name}</option>
											))}
										</select>
									</div>

									<div className="space-y-1">
										<label className="text-[10px] font-black uppercase tracking-widest">Team 2</label>
										<select
											value={newTeam2}
											onChange={(e) => setNewTeam2(e.target.value)}
											className="w-full border-2 border-editorial-ink px-2 py-2 text-sm bg-editorial-bg focus:outline-none focus:border-editorial-gold"
										>
											<option value="">Select team…</option>
											{allTeams
												.filter((t) => t.id !== newTeam1)
												.map((t) => (
													<option key={t.id} value={t.id}>{t.team_name}</option>
												))}
										</select>
									</div>

									<div className="space-y-1">
										<label className="text-[10px] font-black uppercase tracking-widest">Table #</label>
										<input
											type="number"
											min={1}
											value={newTable}
											onChange={(e) => setNewTable(e.target.value)}
											placeholder="e.g. 1"
											className="w-full border-2 border-editorial-ink px-2 py-2 text-sm bg-editorial-bg focus:outline-none focus:border-editorial-gold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
										/>
									</div>

									<button
										onClick={handleCreateMatch}
										disabled={isCreating}
										className="border-2 border-editorial-ink bg-editorial-gold text-editorial-ink px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-editorial-ink hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
									>
										<Plus size={13} />
										{isCreating ? "Adding…" : "Start Match"}
									</button>
								</div>

								{createError && (
									<p className="text-xs text-red-600 flex items-center gap-1.5">
										<AlertCircle size={12} /> {createError}
									</p>
								)}

								<div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
									<p className="text-xs text-gray-400">
										Quickly pair all {allTeams.length} teams into {Math.floor(allTeams.length / 2)} matches
									</p>
									<button
										onClick={handleAutoGenerate}
										disabled={allTeams.length < 2}
										className="text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 hover:border-editorial-ink hover:text-editorial-ink transition-colors disabled:opacity-40"
									>
										Auto-generate all matches
									</button>
								</div>
							</div>

							{/* Existing qualifier matches */}
							{qualifierMatches.length > 0 && (
								<div className="mt-3 border-2 border-editorial-ink overflow-hidden">
									<div className="bg-editorial-ink text-white px-3 py-2 flex items-center">
										<span className="text-[10px] font-black uppercase tracking-widest flex-1">
											Qualifier Matches ({qualifierMatches.length})
										</span>
										<span className="text-[10px] font-black uppercase tracking-widest w-12 text-center">Table</span>
										<span className="w-8" />
									</div>
									{qualifierMatches.map((m, i) => (
										<div key={m.id}
											className={`flex items-center gap-3 px-3 py-2.5 border-t border-gray-100 text-sm ${
												i % 2 === 0 ? "bg-white" : "bg-editorial-bg/40"
											}`}
										>
											<span className="text-[10px] font-black text-gray-400 w-5 shrink-0">{i + 1}</span>
											<span className="flex-1 font-semibold truncate">
												{m.team_1?.team_name ?? <em className="text-gray-400">TBD</em>}
											</span>
											<span className="text-xs text-gray-400 shrink-0">vs</span>
											<span className="flex-1 font-semibold truncate text-right">
												{m.team_2?.team_name ?? <em className="text-gray-400">TBD</em>}
											</span>
											<span className="text-xs text-gray-500 font-mono w-12 text-center shrink-0">
												{m.table_number ?? "—"}
											</span>
											<button
												onClick={() => handleDeleteMatch(m.id)}
												className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
												title="Delete match"
											>
												<Trash2 size={13} />
											</button>
										</div>
									))}
								</div>
							)}
						</section>

						{/* ② ADVANCE TO BRACKET ───────────────────────────────── */}
						<section>
							<SectionHeader
								number="02"
								title="Advance to Bracket"
								subtitle="Seeding is rank-based: top qualifier seed faces the lowest seed first to protect high performers"
							/>

							{bracketAlreadyExists ? (
								<div className="border-2 border-editorial-green bg-editorial-green/5 p-4">
									<p className="text-xs font-black text-editorial-green uppercase tracking-wider mb-1">
										{targetPhase} already seeded
									</p>
									<p className="text-sm text-gray-600">
										{elimByPhase[targetPhase].length} match(es) exist. Scroll down to manage the bracket.
									</p>
								</div>
							) : (
								<div className="border-2 border-editorial-ink bg-white p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] space-y-5">
									<div className="flex items-center gap-4 flex-wrap">
										<span className="text-xs font-black uppercase tracking-widest">Advance top</span>
										<div className="flex border-2 border-editorial-ink">
											{ADVANCE_OPTIONS.map((n) => (
												<button key={n}
													onClick={() => { setAdvanceCount(n); setShowSeedPreview(false); }}
													className={`px-5 py-2 text-sm font-black transition-colors ${
														advanceCount === n ? "bg-editorial-ink text-white" : "bg-white text-editorial-ink hover:bg-editorial-gold/20"
													}`}
												>
													{n}
												</button>
											))}
										</div>
										<span className="text-xs font-black uppercase tracking-widest">
											teams → <span className="text-editorial-gold">{targetPhase}</span>
										</span>
									</div>

									<div className="bg-editorial-ink/5 border-l-4 border-editorial-gold px-4 py-2 text-xs text-gray-600">
										<strong className="font-black text-editorial-ink">Seeding:</strong>{" "}
										Strictly rank-based — top qualifier seed faces the lowest seed first.{" "}
										{advanceCount === 16
											? "Order (1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11) guarantees seeds 1 & 2 cannot meet before the Final."
											: advanceCount === 8
											? "Order (1v8, 4v5, 2v7, 3v6) guarantees seeds 1 & 2 cannot meet before the Final."
											: "1v4, 2v3 — seeds 1 & 2 meet only in the Final."}
									</div>

									<button onClick={() => setShowSeedPreview((v) => !v)}
										className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-editorial-ink transition-colors"
									>
										<ChevronRight size={14} className={`transition-transform ${showSeedPreview ? "rotate-90" : ""}`} />
										{showSeedPreview ? "Hide" : "Show"} seeding preview
									</button>

									{showSeedPreview && (
										<SeedPreview pairings={pairings} topTeams={topTeams} targetPhase={targetPhase} />
									)}

									{advanceError && (
										<div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3 text-xs text-red-700">
											<AlertCircle size={13} className="mt-0.5 shrink-0" /> {advanceError}
										</div>
									)}
									{advanceSuccess && (
										<div className="bg-editorial-green/10 border border-editorial-green p-3 text-xs text-editorial-green font-semibold">
											{advanceSuccess}
										</div>
									)}

									<button
										onClick={handleAdvanceTeams}
										disabled={isAdvancing || standings.length < advanceCount}
										className="border-2 border-editorial-ink bg-editorial-gold text-editorial-ink px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-editorial-ink hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"
									>
										{isAdvancing ? "Seeding…" : `Advance ${advanceCount} Teams to ${targetPhase} →`}
									</button>

									{standings.length < advanceCount && standings.length > 0 && (
										<p className="text-xs text-gray-400">
											{standings.length} / {advanceCount} teams have scores. All qualifier scores must be entered first.
										</p>
									)}
								</div>
							)}
						</section>

						{/* ③ QUALIFIER STANDINGS (collapsible) ───────────────── */}
						<section>
							<div className="flex items-start justify-between gap-4 flex-wrap mb-4">
								<SectionHeader
									number="03"
									title="Qualifier Standings"
									subtitle={`${standings.length} teams ranked · updates live as scores are entered`}
								/>
								<button
									onClick={() => setStandingsOpen((v) => !v)}
									className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-editorial-ink transition-colors border border-gray-200 px-3 py-1.5"
									title={standingsOpen ? "Collapse standings" : "Expand standings"}
								>
									{standingsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
									{standingsOpen ? "Collapse" : "Expand"}
								</button>
							</div>

							{standingsOpen && (
								standings.length === 0 ? (
									<EmptyState text="No qualifier scores yet. Scorekeepers can enter scores at /scorekeeper once matches are created above." />
								) : (
									<StandingsTable standings={standings} advanceCount={advanceCount} />
								)
							)}
						</section>

						{/* ④ BRACKET PHASES ───────────────────────────────────── */}
						{ELIM_PHASES
							.filter((p) => p !== "Third Place" && (elimByPhase[p]?.length ?? 0) > 0)
							.map((phase) => (
								<BracketSection
									key={phase}
									phase={phase}
									matches={elimByPhase[phase] ?? []}
									thirdPlaceMatches={phase === "Semifinals" ? (elimByPhase["Third Place"] ?? []) : []}
									overrideMatchId={overrideMatchId}
									winnerConfirming={winnerConfirming}
									lockType={phaseLocks[phase] ?? null}
									onSetWinner={handleSetWinner}
									onToggleOverride={setOverrideMatchId}
									onAdvanceWinners={nextPhaseFor(phase) ? () => handleAdvanceWinners(phase) : undefined}
									canAdvance={(elimByPhase[nextPhaseFor(phase)!]?.length ?? 0) === 0}
									onLock={(lt) => handleLockPhase(phase, lt)}
									onUnlock={() => handleUnlockPhase(phase)}
								/>
							))}

						{/* Third Place standalone */}
						{(elimByPhase["Third Place"]?.length ?? 0) > 0 &&
							(elimByPhase["Finals"]?.length ?? 0) > 0 && (
							<BracketSection
								key="Third Place"
								phase="Third Place"
								matches={elimByPhase["Third Place"] ?? []}
								thirdPlaceMatches={[]}
								overrideMatchId={overrideMatchId}
								winnerConfirming={winnerConfirming}
								lockType={phaseLocks["Third Place"] ?? null}
								onSetWinner={handleSetWinner}
								onToggleOverride={setOverrideMatchId}
								onAdvanceWinners={undefined}
								canAdvance={false}
								onLock={(lt) => handleLockPhase("Third Place", lt)}
								onUnlock={() => handleUnlockPhase("Third Place")}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
	return (
		<div className="mb-0">
			<div className="flex items-baseline gap-3 mb-1">
				<span className="text-[10px] font-black text-editorial-gold tracking-widest">{number}</span>
				<h2 className="text-xl font-black uppercase tracking-widest">{title}</h2>
			</div>
			<div className="w-10 h-0.5 bg-editorial-gold mb-1.5" />
			<p className="text-xs text-gray-500">{subtitle}</p>
		</div>
	);
}

function EmptyState({ text }: { text: string }) {
	return (
		<div className="border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
			{text}
		</div>
	);
}

function LockControl({ phase, lockType, onLock, onUnlock }: {
	phase: string;
	lockType: string | null;
	onLock: (lt: "full" | "scores") => void;
	onUnlock: () => void;
}) {
	const [open, setOpen] = useState(false);

	if (lockType) {
		return (
			<div className="flex items-center gap-2 shrink-0">
				<span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 px-2 py-1 border ${
					lockType === "full"
						? "bg-red-50 text-red-600 border-red-200"
						: "bg-amber-50 text-amber-700 border-amber-200"
				}`}>
					<Lock size={9} />
					{lockType === "full" ? "Locked" : "Scores Hidden"}
				</span>
				<button
					onClick={onUnlock}
					className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-editorial-ink transition-colors"
					title="Unlock spectator view"
				>
					<Unlock size={10} /> Unlock
				</button>
			</div>
		);
	}

	return (
		<div className="relative shrink-0">
			<button
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 border border-gray-200 px-2 py-1.5 hover:border-editorial-ink hover:text-editorial-ink transition-colors"
				title={`Lock spectator view for ${phase}`}
			>
				<Lock size={10} /> Lock phase
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-1 z-20 border-2 border-editorial-ink bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-3 space-y-2 w-52">
					<p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
						Spectator lock — {phase}
					</p>
					<button
						onClick={() => { onLock("scores"); setOpen(false); }}
						className="w-full text-left px-3 py-2 text-xs border border-gray-200 hover:border-editorial-gold hover:bg-editorial-gold/10 transition-colors"
					>
						<span className="font-bold block">Hide Scores</span>
						<span className="text-[10px] text-gray-400">Show teams, hide point values</span>
					</button>
					<button
						onClick={() => { onLock("full"); setOpen(false); }}
						className="w-full text-left px-3 py-2 text-xs border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
					>
						<span className="font-bold block">Lock All</span>
						<span className="text-[10px] text-gray-400">Hide everything from spectators</span>
					</button>
					<button
						onClick={() => setOpen(false)}
						className="text-[10px] text-gray-400 underline w-full text-right pt-1 hover:text-editorial-ink"
					>
						Cancel
					</button>
				</div>
			)}
		</div>
	);
}

function StandingsTable({ standings, advanceCount }: { standings: Standing[]; advanceCount: AdvanceCount }) {
	return (
		<div className="border-2 border-editorial-ink overflow-hidden">
			<div className="bg-editorial-ink text-white grid grid-cols-[28px_1fr_80px_88px_48px] px-3 py-2 text-[10px] font-black uppercase tracking-widest">
				<span>#</span>
				<span>Team</span>
				<span className="text-right">Best Rnd</span>
				<span className="text-right">Total (tie)</span>
				<span className="text-center">Adv</span>
			</div>

			{standings.map((s, i) => (
				<div key={s.team.id}
					className={`grid grid-cols-[28px_1fr_80px_88px_48px] px-3 py-2.5 border-t border-gray-100 items-center border-l-4 ${
						i < advanceCount ? "border-l-editorial-gold" : "border-l-transparent"
					} ${i % 2 === 0 ? "bg-white" : "bg-editorial-bg/40"}`}
				>
					<span className="text-xs font-black text-gray-400">{s.rank}</span>
					<span className="text-sm font-semibold truncate">{s.team.team_name}</span>
					<span className={`text-right text-sm font-black font-mono ${s.best_round > 0 ? "text-editorial-green" : "text-gray-300"}`}>
						{s.best_round > 0 ? s.best_round : "—"}
					</span>
					<span className="text-right text-xs font-mono text-gray-400">
						{s.total_points > 0 ? s.total_points : "—"}
					</span>
					<span className="text-center text-[10px] font-black">
						{i < advanceCount ? <span className="text-editorial-gold">ADV</span> : <span className="text-gray-200">—</span>}
					</span>
				</div>
			))}
		</div>
	);
}

function SeedPreview({ pairings, topTeams, targetPhase }: {
	pairings: [number, number][];
	topTeams: Standing[];
	targetPhase: Phase;
}) {
	return (
		<div className="border border-gray-200 bg-editorial-bg/60 p-4 space-y-1.5">
			<p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
				{targetPhase} — {pairings.length} matches
			</p>
			{pairings.map(([seedA, seedB], i) => {
				const tA = topTeams[seedA - 1];
				const tB = topTeams[seedB - 1];
				return (
					<div key={i} className="flex items-center gap-3 text-sm py-0.5">
						<span className="w-16 text-right text-[10px] font-bold text-gray-400 shrink-0">
							Match {i + 1}
						</span>
						<span className={`flex-1 font-semibold ${!tA ? "text-gray-300 italic" : ""}`}>
							{tA ? <><span className="text-xs text-gray-400 mr-1">#{seedA}</span>{tA.team.team_name}</> : `Seed #${seedA} — no score`}
						</span>
						<span className="text-xs text-gray-400 font-bold shrink-0">vs</span>
						<span className={`flex-1 font-semibold ${!tB ? "text-gray-300 italic" : ""}`}>
							{tB ? <><span className="text-xs text-gray-400 mr-1">#{seedB}</span>{tB.team.team_name}</> : `Seed #${seedB} — no score`}
						</span>
					</div>
				);
			})}
		</div>
	);
}

function BracketSection({ phase, matches, thirdPlaceMatches, overrideMatchId, winnerConfirming, lockType, onSetWinner, onToggleOverride, onAdvanceWinners, canAdvance, onLock, onUnlock }: {
	phase: Phase;
	matches: MatchWithTeams[];
	thirdPlaceMatches: MatchWithTeams[];
	overrideMatchId: string | null;
	winnerConfirming: string | null;
	lockType: string | null;
	onSetWinner: (matchId: string, winnerId: string) => void;
	onToggleOverride: (id: string | null) => void;
	onAdvanceWinners?: () => void;
	canAdvance: boolean;
	onLock: (lt: "full" | "scores") => void;
	onUnlock: () => void;
}) {
	const allConfirmed = matches.every((m) => m.winner_id);
	const confirmedCount = matches.filter((m) => m.winner_id).length;
	const phaseNumber = { "Pre-Quarterfinals": "04", "Quarterfinals": "05", "Semifinals": "06", "Finals": "07", "Third Place": "08" }[phase] ?? "—";

	return (
		<section>
			<div className="flex items-start justify-between gap-4 flex-wrap mb-4">
				<SectionHeader
					number={phaseNumber}
					title={phase}
					subtitle={`${matches.length} match(es) · ${allConfirmed ? "All winners confirmed ✓" : `${confirmedCount}/${matches.length} confirmed`}`}
				/>
				<div className="flex items-center gap-3 flex-wrap">
					<LockControl phase={phase} lockType={lockType} onLock={onLock} onUnlock={onUnlock} />
					{onAdvanceWinners && canAdvance && (
						<button
							onClick={onAdvanceWinners}
							disabled={!allConfirmed}
							title={!allConfirmed ? "Confirm all winners first" : undefined}
							className="border-2 border-editorial-ink px-4 py-2 text-xs font-black uppercase tracking-widest bg-white hover:bg-editorial-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] whitespace-nowrap"
						>
							Advance Winners → {nextPhaseFor(phase)}
						</button>
					)}
				</div>
			</div>

			<div className="space-y-2">
				{matches.map((m, i) => (
					<MatchCard key={m.id} match={m} matchNumber={i + 1}
						isOverriding={overrideMatchId === m.id}
						isConfirming={winnerConfirming === m.id}
						onSetWinner={onSetWinner}
						onToggleOverride={onToggleOverride}
					/>
				))}
			</div>

			{thirdPlaceMatches.length > 0 && (
				<div className="mt-6 pt-6 border-t border-gray-100">
					<p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
						Third Place Match
					</p>
					{thirdPlaceMatches.map((m, i) => (
						<MatchCard key={m.id} match={m} matchNumber={i + 1}
							isOverriding={overrideMatchId === m.id}
							isConfirming={winnerConfirming === m.id}
							onSetWinner={onSetWinner}
							onToggleOverride={onToggleOverride}
						/>
					))}
				</div>
			)}
		</section>
	);
}

function MatchCard({ match, matchNumber, isOverriding, isConfirming, onSetWinner, onToggleOverride }: {
	match: MatchWithTeams;
	matchNumber: number;
	isOverriding: boolean;
	isConfirming: boolean;
	onSetWinner: (matchId: string, winnerId: string) => void;
	onToggleOverride: (id: string | null) => void;
}) {
	const t1Score = match.team_1_final_points ?? 0;
	const t2Score = match.team_2_final_points ?? 0;
	const suggestedId = t1Score > t2Score ? match.team_1_id : t2Score > t1Score ? match.team_2_id : null;
	const hasWinner = !!match.winner_id;
	const isTied = match.team_1_id && match.team_2_id && t1Score === t2Score && (t1Score > 0);
	const showPicker = !hasWinner || isOverriding;

	return (
		<div className={`border-2 p-4 transition-colors ${hasWinner ? "border-editorial-green bg-editorial-green/5" : "border-editorial-ink bg-white"}`}>
			<div className="flex items-center gap-3 flex-wrap">
				<span className="text-[10px] font-black text-gray-400 w-14 shrink-0 uppercase tracking-wide">
					Match {matchNumber}
					{match.table_number !== null && (
						<span className="block text-gray-300">Tbl {match.table_number}</span>
					)}
				</span>

				<span className={`flex-1 min-w-25 text-sm font-semibold ${t1Score > t2Score && t1Score > 0 ? "text-editorial-green" : ""}`}>
					{match.team_1?.team_name ?? <span className="text-gray-300 italic">TBD</span>}
				</span>

				<div className="flex items-center gap-2 shrink-0">
					<span className={`text-xl font-black font-mono w-12 text-right ${t1Score > t2Score ? "text-editorial-green" : "text-editorial-ink"}`}>{t1Score}</span>
					<span className="text-gray-300 font-bold text-xs">vs</span>
					<span className={`text-xl font-black font-mono w-12 ${t2Score > t1Score ? "text-editorial-green" : "text-editorial-ink"}`}>{t2Score}</span>
				</div>

				<span className={`flex-1 min-w-25 text-sm font-semibold text-right ${t2Score > t1Score && t2Score > 0 ? "text-editorial-green" : ""}`}>
					{match.team_2?.team_name ?? <span className="text-gray-300 italic">TBD</span>}
				</span>

				<div className="shrink-0 flex items-center gap-2">
					{hasWinner && !isOverriding && (
						<>
							<span className="text-xs font-black text-editorial-green">✓ {match.winner?.team_name}</span>
							<button onClick={() => onToggleOverride(match.id)} className="text-[10px] text-gray-400 underline hover:text-editorial-ink">
								Override
							</button>
						</>
					)}
				</div>
			</div>

			{showPicker && (
				<div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
					<span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
						{isOverriding ? "Override winner:" : "Confirm winner:"}
					</span>

					{([
						{ team: match.team_1, id: match.team_1_id, score: t1Score },
						{ team: match.team_2, id: match.team_2_id, score: t2Score },
					] as const).map(({ team, id, score }) => {
						if (!id || !team) return null;
						const suggested = id === suggestedId;
						return (
							<button key={id} onClick={() => onSetWinner(match.id, id)} disabled={isConfirming}
								className={`px-4 py-2 border-2 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50 ${
									suggested
										? "border-editorial-gold bg-editorial-gold/10 hover:bg-editorial-gold"
										: "border-gray-300 text-gray-600 hover:border-editorial-ink hover:text-editorial-ink"
								}`}
							>
								{suggested ? "★ " : ""}{team.team_name} <span className="font-mono">({score})</span>
							</button>
						);
					})}

					{isTied && (
						<span className="text-[10px] text-editorial-gold font-semibold">Tied — admin must decide</span>
					)}
					{isOverriding && (
						<button onClick={() => onToggleOverride(null)} className="text-[10px] text-gray-400 underline hover:text-editorial-ink">
							Cancel
						</button>
					)}
					{isConfirming && <span className="text-[10px] text-editorial-gold animate-pulse">Saving…</span>}
				</div>
			)}
		</div>
	);
}
