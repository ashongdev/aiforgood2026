import {
	AlertCircle,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	Clock,
	Copy,
	Eye,
	EyeOff,
	Loader2,
	Lock,
	LogOut,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	ShieldCheck,
	Trash2,
	Trophy,
	Unlock,
	Upload,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { SelectOption } from "../components/CustomSelect";
import { CustomSelect } from "../components/CustomSelect";
import { useAuth } from "../contexts/AuthContext";
import { useEdgeColumnResize } from "../hooks/useEdgeColumnResize";
import type {
	Category,
	MatchWithTeams,
	Phase,
	ScoreAuditLog,
	ScorekeeperProfile,
	Team,
} from "../lib/database.types";
import { supabase } from "../lib/supabase";

// ─── Bulk-add types & helpers ─────────────────────────────────────────────────

interface BulkRow {
	_id: string;
	team_name: string;
	category: Category;
	country: string;
	coach_name: string;
	team_members: string;
	team_description: string;
}

const BULK_COLS = [
	"team_name",
	"category",
	"country",
	"coach_name",
	"team_members",
	"team_description",
] as const;
type BulkCol = (typeof BULK_COLS)[number];
// Columns that are text inputs (exclude category select) — used for arrow-key col count
const BULK_INPUT_COUNT = BULK_COLS.length;

function makeEmptyBulkRow(cat: Category): BulkRow {
	return {
		_id: crypto.randomUUID(),
		team_name: "",
		category: cat,
		country: "",
		coach_name: "",
		team_members: "",
		team_description: "",
	};
}

function bulkRowHasData(r: BulkRow): boolean {
	return !!(
		r.country ||
		r.coach_name ||
		r.team_members ||
		r.team_description
	);
}

function focusBulkCell(row: number, col: number) {
	document
		.querySelector<HTMLElement>(
			`[data-bulk-row="${row}"][data-bulk-col="${col}"]`,
		)
		?.focus();
}

function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let cur = "";
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				cur += '"';
				i++;
			} else inQuotes = !inQuotes;
		} else if (ch === "," && !inQuotes) {
			result.push(cur);
			cur = "";
		} else {
			cur += ch;
		}
	}
	result.push(cur);
	return result.map((s) => s.trim().replace(/^"|"$/g, ""));
}

function parseCSV(text: string, defaultCategory: Category): BulkRow[] {
	const lines = text
		.trim()
		.split(/\r?\n/)
		.filter((l) => l.trim());
	if (lines.length < 2) return [];
	const rawHeaders = parseCSVLine(lines[0]).map((h) =>
		h
			.toLowerCase()
			.replace(/\s+/g, "_")
			.replace(/[^a-z_]/g, ""),
	);
	const colMap: Record<string, BulkCol> = {
		team_name: "team_name",
		team: "team_name",
		name: "team_name",
		category: "category",
		country: "country",
		coach_name: "coach_name",
		coach: "coach_name",
		team_members: "team_members",
		members: "team_members",
		team_description: "team_description",
		description: "team_description",
	};
	return lines
		.slice(1)
		.map((line) => {
			const cells = parseCSVLine(line);
			const row = makeEmptyBulkRow(defaultCategory);
			rawHeaders.forEach((h, i) => {
				const col = colMap[h];
				if (!col || cells[i] === undefined) return;
				if (col === "category") {
					row.category = cells[i] === "Senior" ? "Senior" : "Junior";
				} else {
					row[col] = cells[i];
				}
			});
			return row;
		})
		.filter((r) => r.team_name || bulkRowHasData(r));
}

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
		Quarterfinals: "Semifinals",
		Semifinals: "Finals",
	};
	return chain[phase] ?? null;
}

function seedPairings(n: AdvanceCount): [number, number][] {
	if (n === 16)
		return [
			[1, 16],
			[8, 9],
			[4, 13],
			[5, 12],
			[2, 15],
			[7, 10],
			[3, 14],
			[6, 11],
		];
	if (n === 8)
		return [
			[1, 8],
			[4, 5],
			[2, 7],
			[3, 6],
		];
	return [
		[1, 4],
		[2, 3],
	];
}

function computeStandings(matches: MatchWithTeams[]): Standing[] {
	const map = new Map<
		string,
		{ team: Team; best_round: number; total: number }
	>();

	const processTeam = (
		id: string | null,
		team: Team | null,
		rounds: (number | null)[],
	) => {
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
		processTeam(m.team_1_id, m.team_1, [
			m.team_1_r1,
			m.team_1_r2,
			m.team_1_r3,
			m.team_1_r4,
		]);
		processTeam(m.team_2_id, m.team_2, [
			m.team_2_r1,
			m.team_2_r2,
			m.team_2_r3,
			m.team_2_r4,
		]);
	}

	return Array.from(map.values())
		.sort((a, b) =>
			b.best_round !== a.best_round
				? b.best_round - a.best_round
				: b.total - a.total,
		)
		.map((e, i) => ({
			team: e.team,
			best_round: e.best_round,
			total_points: e.total,
			rank: i + 1,
		}));
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AdminPage() {
	const { signOut } = useAuth();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	const [category, setCategory] = useState<Category>(() => {
		const c = searchParams.get("category");
		return c === "Senior" ? "Senior" : "Junior";
	});
	const [activeTab, setActiveTab] = useState<
		"qualifiers" | "bracket" | "teams" | "scorekeepers"
	>(() => {
		const t = searchParams.get("tab");
		return (
			["qualifiers", "bracket", "teams", "scorekeepers"] as const
		).includes(t as never)
			? (t as "qualifiers" | "bracket" | "teams" | "scorekeepers")
			: "qualifiers";
	});

	function changeTab(
		tab: "qualifiers" | "bracket" | "teams" | "scorekeepers",
	) {
		setActiveTab(tab);
		setSearchParams(
			(prev) => {
				prev.set("tab", tab);
				return prev;
			},
			{ replace: true },
		);
	}

	function changeCategory(cat: Category) {
		setCategory(cat);
		setSearchParams(
			(prev) => {
				prev.set("category", cat);
				return prev;
			},
			{ replace: true },
		);
	}

	// Data
	const [allTeams, setAllTeams] = useState<Team[]>([]);
	const [qualifierMatches, setQualifierMatches] = useState<MatchWithTeams[]>(
		[],
	);
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
	const [winnerConfirming, setWinnerConfirming] = useState<string | null>(
		null,
	);
	const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);

	// Panel open states
	const [addMatchOpen, setAddMatchOpen] = useState(false);
	const [matchListOpen, setMatchListOpen] = useState(false);
	const [standingsOpen, setStandingsOpen] = useState(false);
	const [advancePanelOpen, setAdvancePanelOpen] = useState(true);
	const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

	// Phase locks — spectator (phase → lock_type) and scorekeeper (phase → locked)
	const [phaseLocks, setPhaseLocks] = useState<Record<string, string>>({});
	const [scorekeeperLocks, setScorekeeperLocks] = useState<
		Record<string, boolean>
	>({});

	// ── Data loading ────────────────────────────────────────────────────────────

	async function loadData(silent = false) {
		if (!silent) setIsLoading(true);
		setAdvanceError(null);
		setAdvanceSuccess(null);

		const [teamsRes, qRes, eRes] = await Promise.all([
			supabase
				.from("teams")
				.select("*")
				.eq("category", category)
				.order("team_name"),
			supabase
				.from("matches")
				.select(
					"*, team_1:team_1_id(id,team_name,category), team_2:team_2_id(id,team_name,category), winner:winner_id(id,team_name,category)",
				)
				.eq("phase", "Qualifiers")
				.eq("category", category)
				.order("match_order"),
			supabase
				.from("matches")
				.select(
					"*, team_1:team_1_id(id,team_name,category), team_2:team_2_id(id,team_name,category), winner:winner_id(id,team_name,category)",
				)
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
		const { data } = await supabase
			.from("phase_locks")
			.select("*")
			.eq("category", category);
		if (data) {
			const spectator: Record<string, string> = {};
			const scorekeeper: Record<string, boolean> = {};
			(data as any[]).forEach((l) => {
				if (l.lock_type) spectator[l.phase] = l.lock_type;
				scorekeeper[l.phase] = l.scorekeeper_locked ?? false;
			});
			setPhaseLocks(spectator);
			setScorekeeperLocks(scorekeeper);
		}
	}

	useEffect(() => {
		loadData();
		loadPhaseLocks();
	}, [category]);

	useEffect(() => {
		const channel = supabase
			.channel(`admin-realtime-${category}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "matches" },
				() => {
					loadData(true);
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [category]);

	// ── Phase lock management ───────────────────────────────────────────────────

	async function handleLockPhase(phase: string, lockType: "full" | "scores") {
		const { error } = await supabase
			.from("phase_locks")
			.upsert(
				{ phase, category, lock_type: lockType },
				{ onConflict: "phase,category" },
			);
		if (!error) loadPhaseLocks();
	}

	async function handleUnlockPhase(phase: string) {
		// If the scorekeeper lock is still active, keep the row but clear lock_type.
		// Otherwise delete the whole row.
		const skStillLocked = scorekeeperLocks[phase] === true;
		const { error } = skStillLocked
			? await supabase
					.from("phase_locks")
					.update({ lock_type: null })
					.eq("phase", phase)
					.eq("category", category)
			: await supabase
					.from("phase_locks")
					.delete()
					.eq("phase", phase)
					.eq("category", category);
		if (!error) loadPhaseLocks();
	}

	async function handleLockScorekeepers(phase: string) {
		await supabase.from("phase_locks").upsert(
			{
				phase,
				category,
				lock_type: phaseLocks[phase] ?? null,
				scorekeeper_locked: true,
			},
			{ onConflict: "phase,category" },
		);
		loadPhaseLocks();
	}

	async function handleUnlockScorekeepers(phase: string) {
		// If the spectator lock is still active, keep the row but clear scorekeeper_locked.
		// Otherwise delete the whole row.
		const spectatorStillLocked = !!phaseLocks[phase];
		const { error } = spectatorStillLocked
			? await supabase
					.from("phase_locks")
					.update({ scorekeeper_locked: false })
					.eq("phase", phase)
					.eq("category", category)
			: await supabase
					.from("phase_locks")
					.delete()
					.eq("phase", phase)
					.eq("category", category);
		if (!error) loadPhaseLocks();
	}

	// ── Qualifier match management ──────────────────────────────────────────────

	async function handleCreateMatch() {
		setCreateError(null);
		if (!newTeam1 || !newTeam2) {
			setCreateError("Select both teams.");
			return;
		}
		if (newTeam1 === newTeam2) {
			setCreateError("A team cannot play against itself.");
			return;
		}

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
			setNewTeam1("");
			setNewTeam2("");
			setNewTable("");
			loadData();
		}
	}

	async function handleAutoGenerate() {
		if (allTeams.length < 2) return;
		if (
			!confirm(
				`Auto-generate ${Math.floor(allTeams.length / 2)} qualifier matches by pairing all ${allTeams.length} teams sequentially? Existing qualifier matches will NOT be removed.`,
			)
		)
			return;

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
		if (error) {
			setCreateError(error.message);
		} else {
			loadData();
		}
	}

	async function handleDeleteMatch(matchId: string) {
		if (
			!confirm(
				"Delete this qualifier match? All entered scores will be permanently lost.",
			)
		)
			return;
		const { error } = await supabase
			.from("matches")
			.delete()
			.eq("id", matchId);
		if (!error) loadData();
	}

	async function handleSaveScheduledTime(matchId: string, value: string) {
		const scheduled_time = value ? new Date(value).toISOString() : null;
		await supabase.from("matches").update({ scheduled_time }).eq("id", matchId);
		setEditingScheduleId(null);
		setQualifierMatches((prev) =>
			prev.map((m) => (m.id === matchId ? { ...m, scheduled_time } : m)),
		);
		setElimMatches((prev) =>
			prev.map((m) => (m.id === matchId ? { ...m, scheduled_time } : m)),
		);
	}

	// ── Bracket advancement ─────────────────────────────────────────────────────

	const standings = computeStandings(qualifierMatches);
	const targetPhase = targetPhaseFor(advanceCount);
	const pairings = seedPairings(advanceCount);
	const topTeams = standings.slice(0, advanceCount);
	const elimByPhase = ELIM_PHASES.reduce<Record<string, MatchWithTeams[]>>(
		(acc, p) => {
			acc[p] = elimMatches.filter((m) => m.phase === p);
			return acc;
		},
		{},
	);
	const bracketAlreadyExists = (elimByPhase[targetPhase]?.length ?? 0) > 0;
	const activeBracketPhases = ELIM_PHASES.filter(
		(p) => (elimByPhase[p]?.length ?? 0) > 0,
	);
	const pendingWinners = activeBracketPhases.reduce(
		(n, p) => n + (elimByPhase[p]?.filter((m) => !m.winner_id).length ?? 0),
		0,
	);
	const scoredTeams = standings.filter((s) => s.best_round > 0).length;

	async function handleAdvanceTeams() {
		if (topTeams.length < advanceCount) {
			setAdvanceError(
				`Only ${topTeams.length} teams have scores. Need at least ${advanceCount} to advance.`,
			);
			return;
		}
		if (bracketAlreadyExists) {
			setAdvanceError(
				`${targetPhase} already has ${elimByPhase[targetPhase].length} match row(s). Delete them in Supabase first to re-seed.`,
			);
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
			setAdvanceSuccess(
				`${advanceCount} teams seeded into ${targetPhase}.`,
			);
			setShowSeedPreview(false);
			loadData();
			changeTab("bracket");
		}
	}

	async function handleAdvanceWinners(fromPhase: Phase) {
		const phaseMatches = elimByPhase[fromPhase] ?? [];
		const unconfirmed = phaseMatches.filter((m) => !m.winner_id);

		if (unconfirmed.length > 0) {
			alert(
				`${unconfirmed.length} match(es) in ${fromPhase} still need a confirmed winner.`,
			);
			return;
		}

		const toPhase = nextPhaseFor(fromPhase);
		if (!toPhase) return;
		if ((elimByPhase[toPhase]?.length ?? 0) > 0) {
			alert(
				`${toPhase} already has matches. Delete them in Supabase to re-seed.`,
			);
			return;
		}

		const sorted = [...phaseMatches].sort(
			(a, b) => a.match_order - b.match_order,
		);
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
		if (error) {
			alert(`Advance failed: ${error.message}`);
		} else {
			loadData();
		}
	}

	async function handleSetWinner(matchId: string, winnerId: string) {
		setWinnerConfirming(matchId);
		const { error } = await supabase
			.from("matches")
			.update({ winner_id: winnerId })
			.eq("id", matchId);
		setWinnerConfirming(null);
		setOverrideMatchId(null);
		if (error) {
			alert(`Could not set winner: ${error.message}`);
		} else {
			setElimMatches((prev) =>
				prev.map((m) =>
					m.id === matchId ? { ...m, winner_id: winnerId } : m,
				),
			);
		}
	}

	// ── Render ──────────────────────────────────────────────────────────────────

	return (
		<div className="min-h-screen bg-editorial-bg text-editorial-ink font-sans">
			{/* Sticky header: top bar + tab bar */}
			<div className="sticky top-0 z-20">
				{/* Top bar */}
				<div className="bg-editorial-ink text-white border-b border-white/10 px-4 py-3 flex items-center gap-3 flex-wrap">
					<Trophy
						size={15}
						className="text-editorial-gold shrink-0"
					/>
					<span className="text-xs font-black uppercase tracking-widest mr-auto">
						Admin Dashboard
					</span>

					<div className="flex border border-white/20">
						{(["Junior", "Senior"] as Category[]).map((c) => (
							<button
								key={c}
								onClick={() => changeCategory(c)}
								className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-colors ${
									category === c
										? "bg-editorial-gold text-editorial-ink"
										: "text-white/60 hover:text-white"
								}`}
							>
								{c}
							</button>
						))}
					</div>

					<button
						onClick={() => loadData()}
						className="p-1.5 hover:text-editorial-gold transition-colors"
						title="Refresh"
					>
						<RefreshCw
							size={14}
							className={isLoading ? "animate-spin" : ""}
						/>
					</button>
					<a
						href="/scorekeeper"
						className="text-xs text-white/60 hover:text-editorial-gold transition-colors uppercase tracking-widest"
					>
						Scores
					</a>
					<a
						href="/"
						className="text-xs text-white/60 hover:text-editorial-gold transition-colors uppercase tracking-widest"
					>
						Live
					</a>
					<button
						onClick={async () => {
							await signOut();
							navigate("/login");
						}}
						className="p-1.5 hover:text-editorial-gold transition-colors"
					>
						<LogOut size={14} />
					</button>
				</div>

				{/* Tab bar */}
				<div className="bg-editorial-ink border-b-4 border-editorial-gold flex">
					<button
						onClick={() => changeTab("qualifiers")}
						className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-colors border-r border-white/10 ${
							activeTab === "qualifiers"
								? "bg-editorial-gold text-editorial-ink"
								: "text-white/60 hover:text-white hover:bg-white/5"
						}`}
					>
						Qualifiers
					</button>
					<button
						onClick={() => changeTab("bracket")}
						className={`relative px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
							activeTab === "bracket"
								? "bg-editorial-gold text-editorial-ink"
								: "text-white/60 hover:text-white hover:bg-white/5"
						}`}
					>
						Bracket
						{pendingWinners > 0 && (
							<span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
								{pendingWinners}
							</span>
						)}
					</button>
					<button
						onClick={() => changeTab("teams")}
						className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-colors border-l border-white/10 ${
							activeTab === "teams"
								? "bg-editorial-gold text-editorial-ink"
								: "text-white/60 hover:text-white hover:bg-white/5"
						}`}
					>
						<Users size={12} /> Teams
					</button>
					<button
						onClick={() => changeTab("scorekeepers")}
						className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-colors border-l border-white/10 ${
							activeTab === "scorekeepers"
								? "bg-editorial-gold text-editorial-ink"
								: "text-white/60 hover:text-white hover:bg-white/5"
						}`}
					>
						<ShieldCheck size={12} /> Staff
					</button>
				</div>
			</div>

			{isLoading ? (
				<div className="py-20 text-center text-sm text-gray-400">
					Loading…
				</div>
			) : (
				<div className="w-full px-4 py-6 space-y-3">
					{/* ─ QUALIFIERS TAB ─────────────────────────────────────── */}
					{activeTab === "qualifiers" && (
						<>
							{/* Start Tournament CTA — shown only before any matches exist */}
							{qualifierMatches.length === 0 &&
								allTeams.length > 0 && (
									<div className="border-2 border-editorial-gold bg-editorial-gold/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(212,175,55,0.5)]">
										<div>
											<p className="text-xs font-black uppercase tracking-widest text-editorial-gold mb-1">
												Ready to begin?
											</p>
											<h3 className="text-xl font-black uppercase tracking-widest text-editorial-ink">
												Start the Tournament
											</h3>
											<p className="text-sm text-gray-500 mt-1">
												{allTeams.length} {category}{" "}
												team
												{allTeams.length !== 1
													? "s"
													: ""}{" "}
												registered. Auto-generate all
												qualifier matches to kick things
												off.
											</p>
										</div>
										<button
											onClick={handleAutoGenerate}
											disabled={allTeams.length < 2}
											className="shrink-0 border-2 border-editorial-ink bg-editorial-ink text-white px-8 py-3 text-sm font-black uppercase tracking-widest hover:bg-editorial-gold hover:text-editorial-ink transition-colors disabled:opacity-40 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] whitespace-nowrap"
										>
											Start Tournament →
										</button>
									</div>
								)}

							{/* Stats strip */}
							<div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 pb-1 flex-wrap">
								<span>{qualifierMatches.length} matches</span>
								<span className="text-gray-200">·</span>
								<span>{allTeams.length} teams</span>
								<span className="text-gray-200">·</span>
								<span>{scoredTeams} scored</span>
								{bracketAlreadyExists && (
									<>
										<span className="text-gray-200">·</span>
										<button
											onClick={() => changeTab("bracket")}
											className="text-editorial-gold hover:underline"
										>
											Bracket → {targetPhase}
										</button>
									</>
								)}
								<div className="ml-auto flex items-center gap-2">
									<ScorekeeperLockControl
										phase="Qualifiers"
										locked={
											scorekeeperLocks["Qualifiers"] ??
											false
										}
										onLock={() =>
											handleLockScorekeepers("Qualifiers")
										}
										onUnlock={() =>
											handleUnlockScorekeepers(
												"Qualifiers",
											)
										}
									/>
									<LockControl
										phase="Qualifiers"
										lockType={
											phaseLocks["Qualifiers"] ?? null
										}
										onLock={(lt) =>
											handleLockPhase("Qualifiers", lt)
										}
										onUnlock={() =>
											handleUnlockPhase("Qualifiers")
										}
									/>
								</div>
							</div>

							{/* Panel: Advance to Bracket */}
							<CollapsiblePanel
								title="Advance to Bracket"
								open={advancePanelOpen}
								onToggle={() => setAdvancePanelOpen((v) => !v)}
								accent={!bracketAlreadyExists}
							>
								<div className="p-5 space-y-5">
									<div className="flex items-center gap-4 flex-wrap">
										<span className="text-xs font-black uppercase tracking-widest">
											Advance top
										</span>
										<div className="flex border-2 border-editorial-ink">
											{ADVANCE_OPTIONS.map((n) => (
												<button
													key={n}
													onClick={() => {
														setAdvanceCount(n);
														setShowSeedPreview(
															false,
														);
													}}
													className={`px-5 py-2 text-sm font-black transition-colors ${
														advanceCount === n
															? "bg-editorial-ink text-white"
															: "bg-white text-editorial-ink hover:bg-editorial-gold/20"
													}`}
												>
													{n}
												</button>
											))}
										</div>
										<span className="text-xs font-black uppercase tracking-widest">
											teams →{" "}
											<span className="text-editorial-gold">
												{targetPhase}
											</span>
										</span>
									</div>

									{bracketAlreadyExists ? (
										<div className="flex items-center justify-between gap-3 bg-editorial-green/8 border border-editorial-green/30 px-4 py-3">
											<div>
												<p className="text-xs font-black text-editorial-green uppercase tracking-wider">
													{targetPhase} already seeded
													—{" "}
													{
														elimByPhase[targetPhase]
															.length
													}{" "}
													match(es)
												</p>
											</div>
											<button
												onClick={() =>
													changeTab("bracket")
												}
												className="text-xs font-semibold text-editorial-green border border-editorial-green px-3 py-1.5 hover:bg-editorial-green hover:text-white transition-colors whitespace-nowrap shrink-0"
											>
												Go to Bracket →
											</button>
										</div>
									) : (
										<>
											<div className="bg-editorial-ink/5 border-l-4 border-editorial-gold px-4 py-2 text-xs text-gray-600">
												<strong className="font-black text-editorial-ink">
													Seeding:
												</strong>{" "}
												{advanceCount === 16
													? "1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11 — seeds 1 & 2 cannot meet before the Final."
													: advanceCount === 8
														? "1v8, 4v5, 2v7, 3v6 — seeds 1 & 2 cannot meet before the Final."
														: "1v4, 2v3 — seeds 1 & 2 meet only in the Final."}
											</div>

											<button
												onClick={() =>
													setShowSeedPreview(
														(v) => !v,
													)
												}
												className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-editorial-ink transition-colors"
											>
												<ChevronRight
													size={14}
													className={`transition-transform ${showSeedPreview ? "rotate-90" : ""}`}
												/>
												{showSeedPreview
													? "Hide"
													: "Show"}{" "}
												seeding preview
											</button>

											{showSeedPreview && (
												<SeedPreview
													pairings={pairings}
													topTeams={topTeams}
													targetPhase={targetPhase}
												/>
											)}

											{advanceError && (
												<div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3 text-xs text-red-700">
													<AlertCircle
														size={13}
														className="mt-0.5 shrink-0"
													/>{" "}
													{advanceError}
												</div>
											)}
											{advanceSuccess && (
												<div className="bg-editorial-green/10 border border-editorial-green p-3 text-xs text-editorial-green font-semibold">
													{advanceSuccess}
												</div>
											)}

											<div className="flex items-center gap-3 flex-wrap">
												<button
													onClick={handleAdvanceTeams}
													disabled={
														isAdvancing ||
														standings.length <
															advanceCount
													}
													className="border-2 border-editorial-ink bg-editorial-gold text-editorial-ink px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-editorial-ink hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"
												>
													{isAdvancing
														? "Seeding…"
														: `Advance ${advanceCount} Teams →`}
												</button>
												{standings.length <
													advanceCount &&
													standings.length > 0 && (
														<p className="text-xs text-gray-400">
															{standings.length} /{" "}
															{advanceCount} teams
															scored
														</p>
													)}
											</div>
										</>
									)}
								</div>
							</CollapsiblePanel>

							{/* Panel: Add Match */}
							<CollapsiblePanel
								title="Add Qualifier Match"
								open={addMatchOpen}
								onToggle={() => setAddMatchOpen((v) => !v)}
							>
								<div className="p-5 space-y-4">
									<div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_auto] gap-3 items-end">
										<div className="space-y-1">
											<label className="text-[10px] font-black uppercase tracking-widest">
												Team 1
											</label>
											<CustomSelect
												value={newTeam1}
												defaultValue=""
												placeholder="Select team…"
												options={[
													{
														value: "",
														label: "Select team…",
													},
													...allTeams.map((t) => ({
														value: t.id,
														label: t.team_name,
													})),
												]}
												onChange={setNewTeam1}
												className="w-full"
											/>
										</div>
										<div className="space-y-1">
											<label className="text-[10px] font-black uppercase tracking-widest">
												Team 2
											</label>
											<CustomSelect
												value={newTeam2}
												defaultValue=""
												placeholder="Select team…"
												options={[
													{
														value: "",
														label: "Select team…",
													},
													...allTeams
														.filter(
															(t) =>
																t.id !==
																newTeam1,
														)
														.map((t) => ({
															value: t.id,
															label: t.team_name,
														})),
												]}
												onChange={setNewTeam2}
												className="w-full"
											/>
										</div>
										<div className="space-y-1">
											<label className="text-[10px] font-black uppercase tracking-widest">
												Table #
											</label>
											<input
												type="number"
												min={1}
												value={newTable}
												onChange={(e) =>
													setNewTable(e.target.value)
												}
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
											{isCreating
												? "Adding…"
												: "Add Match"}
										</button>
									</div>

									{createError && (
										<p className="text-xs text-red-600 flex items-center gap-1.5">
											<AlertCircle size={12} />{" "}
											{createError}
										</p>
									)}

									<div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
										<p className="text-xs text-gray-400">
											Pair all {allTeams.length} teams
											into{" "}
											{Math.floor(allTeams.length / 2)}{" "}
											matches automatically
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
							</CollapsiblePanel>

							{/* Panel: Qualifier Matches */}
							<CollapsiblePanel
								title={`Qualifier Matches (${qualifierMatches.length})`}
								open={matchListOpen}
								onToggle={() => setMatchListOpen((v) => !v)}
							>
								{qualifierMatches.length === 0 ? (
									<div className="p-6 text-center text-sm text-gray-400">
										No matches yet. Add one above or use
										auto-generate.
									</div>
								) : (
									<div>
										<div className="bg-editorial-ink/5 px-3 py-1.5 flex items-center border-b border-gray-100">
											<span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex-1">
												Teams
											</span>
											<span className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-12 text-center">
												Table
											</span>
											<span className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-36 text-center hidden sm:block">
												Scheduled
											</span>
											<span className="w-8" />
										</div>
										{qualifierMatches.map((m, i) => (
											<div
												key={m.id}
												className={`flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 text-sm last:border-b-0 ${
													i % 2 === 0
														? "bg-white"
														: "bg-editorial-bg/30"
												}`}
											>
												<span className="text-[10px] font-black text-gray-300 w-5 shrink-0">
													{i + 1}
												</span>
												<span className="flex-1 font-semibold truncate">
													{m.team_1?.team_name ?? (
														<em className="text-gray-400">
															TBD
														</em>
													)}
												</span>
												<span className="text-xs text-gray-300 shrink-0">
													vs
												</span>
												<span className="flex-1 font-semibold truncate text-right">
													{m.team_2?.team_name ?? (
														<em className="text-gray-400">
															TBD
														</em>
													)}
												</span>
												<span className="text-xs text-gray-400 font-mono w-12 text-center shrink-0">
													{m.table_number ?? "—"}
												</span>
												<div className="hidden sm:block w-36 shrink-0">
													{editingScheduleId === m.id ? (
														<input
															type="datetime-local"
															defaultValue={m.scheduled_time ? new Date(m.scheduled_time).toISOString().slice(0, 16) : ""}
															onBlur={(e) => handleSaveScheduledTime(m.id, e.target.value)}
															onKeyDown={(e) => {
																if (e.key === "Enter") handleSaveScheduledTime(m.id, (e.target as HTMLInputElement).value);
																if (e.key === "Escape") setEditingScheduleId(null);
															}}
															autoFocus
															className="w-full border border-editorial-gold px-1.5 py-0.5 text-xs focus:outline-none"
														/>
													) : (
														<button
															onClick={() => setEditingScheduleId(m.id)}
															className="text-xs text-gray-400 hover:text-editorial-ink transition-colors truncate w-full text-left"
															title="Click to set scheduled time"
														>
															{m.scheduled_time
																? new Date(m.scheduled_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
																: <span className="text-gray-200">Set time…</span>}
														</button>
													)}
												</div>
												<button
													onClick={() =>
														handleDeleteMatch(m.id)
													}
													className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
													title="Delete match"
												>
													<Trash2 size={13} />
												</button>
											</div>
										))}
									</div>
								)}
							</CollapsiblePanel>

							{/* Panel: Standings */}
							<CollapsiblePanel
								title={`Qualifier Standings (${standings.length} teams)`}
								open={standingsOpen}
								onToggle={() => setStandingsOpen((v) => !v)}
							>
								{standings.length === 0 ? (
									<div className="p-6 text-center text-sm text-gray-400">
										No qualifier scores yet. Scorekeepers
										can enter scores at /scorekeeper once
										matches are created.
									</div>
								) : (
									<StandingsTable
										standings={standings}
										advanceCount={advanceCount}
									/>
								)}
							</CollapsiblePanel>
						</>
					)}

					{/* ─ BRACKET TAB ────────────────────────────────────────── */}
					{activeTab === "bracket" && (
						<>
							{activeBracketPhases.length === 0 ? (
								<div className="py-16 text-center space-y-3">
									<p className="text-sm text-gray-400">
										No bracket matches yet.
									</p>
									<button
										onClick={() => changeTab("qualifiers")}
										className="text-xs font-semibold text-editorial-ink border-2 border-editorial-ink px-4 py-2 hover:bg-editorial-gold transition-colors"
									>
										← Go to Qualifiers to advance teams
									</button>
								</div>
							) : (
								<>
									{/* Bracket stats strip */}
									<div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 pb-1 flex-wrap">
										<span>
											{activeBracketPhases.length} active
											phase
											{activeBracketPhases.length !== 1
												? "s"
												: ""}
										</span>
										{pendingWinners > 0 && (
											<>
												<span className="text-gray-200">
													·
												</span>
												<span className="text-amber-600">
													{pendingWinners} pending
													winner
													{pendingWinners !== 1
														? "s"
														: ""}
												</span>
											</>
										)}
										{pendingWinners === 0 && (
											<>
												<span className="text-gray-200">
													·
												</span>
												<span className="text-editorial-green">
													All confirmed ✓
												</span>
											</>
										)}
									</div>

									{/* Phase accordions (main phases except Third Place) */}
									{ELIM_PHASES.filter(
										(p) =>
											p !== "Third Place" &&
											(elimByPhase[p]?.length ?? 0) > 0,
									).map((phase) => (
										<PhaseAccordion
											key={phase}
											phase={phase}
											matches={elimByPhase[phase] ?? []}
											thirdPlaceMatches={
												phase === "Semifinals"
													? (elimByPhase[
															"Third Place"
														] ?? [])
													: []
											}
											overrideMatchId={overrideMatchId}
											winnerConfirming={winnerConfirming}
											lockType={phaseLocks[phase] ?? null}
											scorekeeperLocked={
												scorekeeperLocks[phase] ?? false
											}
											onSetWinner={handleSetWinner}
											onToggleOverride={
												setOverrideMatchId
											}
											onAdvanceWinners={
												nextPhaseFor(phase)
													? () =>
															handleAdvanceWinners(
																phase,
															)
													: undefined
											}
											canAdvance={
												(elimByPhase[
													nextPhaseFor(phase)!
												]?.length ?? 0) === 0
											}
											onLock={(lt) =>
												handleLockPhase(phase, lt)
											}
											onUnlock={() =>
												handleUnlockPhase(phase)
											}
											onLockScorekeeper={() =>
												handleLockScorekeepers(phase)
											}
											onUnlockScorekeeper={() =>
												handleUnlockScorekeepers(phase)
											}
										/>
									))}

									{/* Third Place standalone (only shown when Finals exists too) */}
									{(elimByPhase["Third Place"]?.length ?? 0) >
										0 &&
										(elimByPhase["Finals"]?.length ?? 0) >
											0 && (
											<PhaseAccordion
												key="Third Place"
												phase="Third Place"
												matches={
													elimByPhase[
														"Third Place"
													] ?? []
												}
												thirdPlaceMatches={[]}
												overrideMatchId={
													overrideMatchId
												}
												winnerConfirming={
													winnerConfirming
												}
												lockType={
													phaseLocks["Third Place"] ??
													null
												}
												scorekeeperLocked={
													scorekeeperLocks[
														"Third Place"
													] ?? false
												}
												onSetWinner={handleSetWinner}
												onToggleOverride={
													setOverrideMatchId
												}
												onAdvanceWinners={undefined}
												canAdvance={false}
												onLock={(lt) =>
													handleLockPhase(
														"Third Place",
														lt,
													)
												}
												onUnlock={() =>
													handleUnlockPhase(
														"Third Place",
													)
												}
												onLockScorekeeper={() =>
													handleLockScorekeepers(
														"Third Place",
													)
												}
												onUnlockScorekeeper={() =>
													handleUnlockScorekeepers(
														"Third Place",
													)
												}
											/>
										)}
								</>
							)}
						</>
					)}

					{/* ─ TEAMS TAB ──────────────────────────────────────────── */}
					{activeTab === "teams" && (
						<TeamsTab
							category={category}
							onTeamsChanged={loadData}
						/>
					)}

					{/* ─ SCOREKEEPERS TAB ───────────────────────────────────── */}
					{activeTab === "scorekeepers" && <ScoreekeepersTab />}
				</div>
			)}
		</div>
	);
}

// ─── TeamsTab ─────────────────────────────────────────────────────────────────

function TeamsTab({
	category,
	onTeamsChanged,
}: {
	category: Category;
	onTeamsChanged: () => void;
}) {
	const teamsResize = useEdgeColumnResize({
		columnCount: 6,
		minColumnWidth: 56,
	});
	const bulkResize = useEdgeColumnResize({
		columnCount: 8,
		minColumnWidth: 56,
	});

	const [teams, setTeams] = useState<Team[]>([]);
	const [teamSearch, setTeamSearch] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editDraft, setEditDraft] = useState<Partial<Team>>({});
	const [editError, setEditError] = useState<string | null>(null);
	const [bulkRows, setBulkRows] = useState<BulkRow[]>(() =>
		Array.from({ length: 2 }, () => makeEmptyBulkRow(category)),
	);
	const [bulkSaving, setBulkSaving] = useState(false);
	const [bulkError, setBulkError] = useState<string | null>(null);
	const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
	const [panelTeamsOpen, setPanelTeamsOpen] = useState(false);
	const [panelBulkOpen, setPanelBulkOpen] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	async function loadTeams() {
		setIsLoading(true);
		const { data } = await supabase
			.from("teams")
			.select("*")
			.eq("category", category)
			.order("team_name");
		setTeams((data as Team[]) ?? []);
		setIsLoading(false);
	}

	useEffect(() => {
		loadTeams();
	}, [category]);

	// Reset bulk row category defaults when category prop changes
	useEffect(() => {
		setBulkRows((rows) =>
			rows.map((r) =>
				!r.team_name && !bulkRowHasData(r) ? { ...r, category } : r,
			),
		);
	}, [category]);

	// ── Edit existing team ──────────────────────────────────────────────────────

	async function handleSaveEdit() {
		if (!editingId) return;
		if (!editDraft.team_name?.trim()) {
			setEditError("Team name is required.");
			return;
		}
		const membersRaw =
			typeof editDraft.team_members === "string"
				? (editDraft.team_members as unknown as string)
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean)
				: (editDraft.team_members ?? null);
		const { error } = await supabase
			.from("teams")
			.update({
				team_name: editDraft.team_name.trim(),
				country: editDraft.country || null,
				coach_name: editDraft.coach_name || null,
				team_members: membersRaw?.length ? membersRaw : null,
				team_description: editDraft.team_description || null,
			})
			.eq("id", editingId);
		if (error) {
			setEditError(error.message);
			return;
		}
		setEditingId(null);
		setEditDraft({});
		setEditError(null);
		loadTeams();
		onTeamsChanged();
	}

	async function handleDelete(id: string, name: string) {
		if (
			!confirm(
				`Delete "${name}"? This cannot be undone and will affect any matches using this team.`,
			)
		)
			return;
		const { error } = await supabase.from("teams").delete().eq("id", id);
		if (!error) {
			loadTeams();
			onTeamsChanged();
		}
	}

	// ── Bulk add ────────────────────────────────────────────────────────────────

	function handleBulkChange(rowIndex: number, col: BulkCol, value: string) {
		setBulkRows((prev) => {
			const next = [...prev];
			next[rowIndex] = { ...next[rowIndex], [col]: value };
			// Auto-append a new row when something is typed in the last row
			if (rowIndex === next.length - 1 && value.trim()) {
				next.push(makeEmptyBulkRow(category));
			}
			return next;
		});
		setBulkSuccess(null);
	}

	function handleBulkKeyDown(
		e: React.KeyboardEvent,
		rowIndex: number,
		colIndex: number,
	) {
		const totalRows = bulkRows.length;
		if (e.key === "Tab") {
			e.preventDefault();
			const nextCol = colIndex + 1;
			if (nextCol < BULK_INPUT_COUNT) focusBulkCell(rowIndex, nextCol);
			else if (rowIndex + 1 < totalRows) focusBulkCell(rowIndex + 1, 0);
		} else if (e.key === "Enter" || e.key === "ArrowDown") {
			e.preventDefault();
			if (rowIndex + 1 < totalRows) focusBulkCell(rowIndex + 1, colIndex);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (rowIndex > 0) focusBulkCell(rowIndex - 1, colIndex);
		}
	}

	function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const text = ev.target?.result as string;
			const parsed = parseCSV(text, category);
			if (parsed.length === 0) {
				setBulkError(
					"No valid rows found in CSV. Check headers: team_name, category, country, coach_name, team_members, team_description",
				);
				return;
			}
			setBulkRows((prev) => {
				const nonEmpty = prev.filter(
					(r) => r.team_name.trim() || bulkRowHasData(r),
				);
				return [...nonEmpty, ...parsed, makeEmptyBulkRow(category)];
			});
			setBulkError(null);
		};
		reader.readAsText(file);
		e.target.value = "";
	}

	async function handleBulkSubmit() {
		const valid = bulkRows.filter((r) => r.team_name.trim());
		if (valid.length === 0) {
			setBulkError("No rows with team names to save.");
			return;
		}
		setBulkSaving(true);
		setBulkError(null);
		const rows = valid.map((r) => ({
			team_name: r.team_name.trim(),
			category: r.category,
			country: r.country.trim() || null,
			coach_name: r.coach_name.trim() || null,
			team_members: r.team_members.trim()
				? r.team_members
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean)
				: null,
			team_description: r.team_description.trim() || null,
		}));
		const { error } = await supabase.from("teams").insert(rows);
		setBulkSaving(false);
		if (error) {
			setBulkError(error.message);
			return;
		}
		setBulkSuccess(`${valid.length} team(s) added successfully.`);
		setBulkRows(
			Array.from({ length: 5 }, () => makeEmptyBulkRow(category)),
		);
		loadTeams();
		onTeamsChanged();
	}

	// ── Render ──────────────────────────────────────────────────────────────────

	const readyCount = bulkRows.filter((r) => r.team_name.trim()).length;

	const filteredTeams = teamSearch.trim()
		? teams.filter(
				(t) =>
					t.team_name
						.toLowerCase()
						.includes(teamSearch.toLowerCase()) ||
					t.country
						?.toLowerCase()
						.includes(teamSearch.toLowerCase()) ||
					t.coach_name
						?.toLowerCase()
						.includes(teamSearch.toLowerCase()),
			)
		: teams;

	return (
		<>
			{/* Stats strip + search */}
			<div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 pb-1 flex-wrap">
				<Users size={11} />
				<span>
					{teams.length} {category} team
					{teams.length !== 1 ? "s" : ""} registered
				</span>
				<div className="ml-auto flex items-center gap-2 border border-gray-200 bg-white px-2 py-1 min-w-48 normal-case">
					<Search size={11} className="text-gray-300 shrink-0" />
					<input
						type="text"
						placeholder="Search teams…"
						value={teamSearch}
						onChange={(e) => setTeamSearch(e.target.value)}
						className="flex-1 text-xs text-editorial-ink placeholder:text-gray-300 focus:outline-none font-normal tracking-normal"
					/>
					{teamSearch && (
						<button
							onClick={() => setTeamSearch("")}
							className="text-gray-300 hover:text-gray-500 text-[10px] font-black"
						>
							✕
						</button>
					)}
				</div>
			</div>

			{/* Existing teams */}
			<CollapsiblePanel
				title={
					teamSearch.trim()
						? `${category} Teams (${filteredTeams.length} of ${teams.length})`
						: `${category} Teams (${teams.length})`
				}
				open={panelTeamsOpen}
				onToggle={() => setPanelTeamsOpen((v) => !v)}
			>
				{isLoading ? (
					<div className="p-6 text-center text-sm text-gray-400">
						Loading…
					</div>
				) : teams.length === 0 ? (
					<div className="p-6 text-center text-sm text-gray-400">
						No {category} teams yet. Add some below.
					</div>
				) : filteredTeams.length === 0 ? (
					<div className="p-6 text-center text-sm text-gray-400">
						No teams match &ldquo;{teamSearch}&rdquo;.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table
							className="w-full text-sm border-collapse [&_th:not(:last-child)]:border-r [&_th:not(:last-child)]:border-gray-200/70 [&_td:not(:last-child)]:border-r [&_td:not(:last-child)]:border-gray-200/70"
							{...teamsResize.tableProps}
						>
							<colgroup>
								{Array.from({ length: 6 }, (_, i) => (
									<col
										key={i}
										style={teamsResize.getColumnStyle(i)}
									/>
								))}
							</colgroup>
							<thead>
								<tr className="bg-editorial-ink text-white text-[10px] uppercase tracking-widest">
									<th className="px-3 py-2 text-left font-black w-8">
										#
									</th>
									<th className="px-3 py-2 text-left font-black min-w-[160px]">
										Team Name
									</th>
									<th className="px-3 py-2 text-left font-black w-28">
										Country
									</th>
									<th className="px-3 py-2 text-left font-black w-36">
										Coach
									</th>
									<th className="px-3 py-2 text-left font-black w-44">
										Members
									</th>
									<th className="px-2 py-2 text-center font-black w-20">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{filteredTeams.map((team, i) => {
									const isEditing = editingId === team.id;
									const rowClass = `border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-editorial-bg/50"}`;
									return (
										<tr key={team.id} className={rowClass}>
											<td className="px-3 py-2 text-[10px] text-gray-300 font-mono">
												{i + 1}
											</td>
											{isEditing ? (
												<>
													<td className="px-2 py-1.5">
														<input
															autoFocus
															value={
																editDraft.team_name ??
																""
															}
															onChange={(e) =>
																setEditDraft(
																	(d) => ({
																		...d,
																		team_name:
																			e
																				.target
																				.value,
																	}),
																)
															}
															className="w-full border-2 border-editorial-ink px-2 py-1 text-sm font-semibold focus:outline-none focus:border-editorial-gold"
														/>
													</td>
													<td className="px-2 py-1.5">
														<input
															value={
																editDraft.country ??
																""
															}
															onChange={(e) =>
																setEditDraft(
																	(d) => ({
																		...d,
																		country:
																			e
																				.target
																				.value,
																	}),
																)
															}
															placeholder="—"
															className="w-full border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:border-editorial-gold"
														/>
													</td>
													<td className="px-2 py-1.5">
														<input
															value={
																editDraft.coach_name ??
																""
															}
															onChange={(e) =>
																setEditDraft(
																	(d) => ({
																		...d,
																		coach_name:
																			e
																				.target
																				.value,
																	}),
																)
															}
															placeholder="—"
															className="w-full border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:border-editorial-gold"
														/>
													</td>
													<td className="px-2 py-1.5">
														<input
															value={
																Array.isArray(
																	editDraft.team_members,
																)
																	? editDraft.team_members.join(
																			", ",
																		)
																	: ((editDraft.team_members as unknown as string) ??
																		"")
															}
															onChange={(e) =>
																setEditDraft(
																	(d) => ({
																		...d,
																		team_members:
																			e
																				.target
																				.value as unknown as string[],
																	}),
																)
															}
															placeholder="Alice, Bob, …"
															className="w-full border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:border-editorial-gold"
														/>
													</td>
													<td className="px-2 py-1.5">
														<div className="flex gap-1.5 items-center justify-center flex-wrap">
															<button
																onClick={
																	handleSaveEdit
																}
																className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-editorial-green text-white hover:opacity-80 transition-opacity"
															>
																Save
															</button>
															<button
																onClick={() => {
																	setEditingId(
																		null,
																	);
																	setEditDraft(
																		{},
																	);
																	setEditError(
																		null,
																	);
																}}
																className="px-3 py-1 text-[10px] text-gray-400 border border-gray-200 hover:border-editorial-ink transition-colors"
															>
																Cancel
															</button>
														</div>
													</td>
												</>
											) : (
												<>
													<td className="px-3 py-2.5 font-semibold">
														{team.team_name}
													</td>
													<td className="px-3 py-2.5 text-xs text-gray-500">
														{team.country ?? (
															<span className="text-gray-300">
																—
															</span>
														)}
													</td>
													<td className="px-3 py-2.5 text-xs text-gray-500">
														{team.coach_name ?? (
															<span className="text-gray-300">
																—
															</span>
														)}
													</td>
													<td className="px-3 py-2.5 text-xs text-gray-500 max-w-[176px] truncate">
														{team.team_members?.join(
															", ",
														) ?? (
															<span className="text-gray-300">
																—
															</span>
														)}
													</td>
													<td className="px-2 py-2.5 text-center">
														<div className="flex items-center justify-center gap-2">
															<button
																onClick={() => {
																	setEditingId(
																		team.id,
																	);
																	setEditDraft(
																		{
																			...team,
																		},
																	);
																	setEditError(
																		null,
																	);
																}}
																className="p-1 text-gray-300 hover:text-editorial-ink transition-colors"
																title="Edit"
															>
																<Pencil
																	size={13}
																/>
															</button>
															<button
																onClick={() =>
																	handleDelete(
																		team.id,
																		team.team_name,
																	)
																}
																className="p-1 text-gray-300 hover:text-red-500 transition-colors"
																title="Delete"
															>
																<Trash2
																	size={13}
																/>
															</button>
														</div>
													</td>
												</>
											)}
										</tr>
									);
								})}
							</tbody>
						</table>
						{editError && (
							<p className="px-4 py-2 text-xs text-red-600 flex items-center gap-1.5 border-t border-red-100">
								<AlertCircle size={11} /> {editError}
							</p>
						)}
					</div>
				)}
			</CollapsiblePanel>

			{/* Bulk add */}
			<CollapsiblePanel
				title="Bulk Add Teams"
				open={panelBulkOpen}
				onToggle={() => setPanelBulkOpen((v) => !v)}
				accent
			>
				<div className="p-4 space-y-3">
					{/* CSV upload row */}
					<div className="flex items-start justify-between gap-3 flex-wrap">
						<div className="space-y-0.5">
							<p className="text-xs text-gray-600 font-semibold">
								Type directly or upload a CSV to populate this
								table.
							</p>
							<p className="text-[10px] text-gray-400">
								CSV headers:{" "}
								<code className="bg-gray-100 px-1">
									team_name, category, country, coach_name,
									team_members, team_description
								</code>
							</p>
							<p className="text-[10px] text-gray-400">
								team_members: comma-separated names within the
								cell. Use quotes in CSV if needed.
							</p>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<input
								ref={fileRef}
								type="file"
								accept=".csv,.txt"
								className="hidden"
								onChange={handleCsvUpload}
							/>
							<button
								onClick={() => fileRef.current?.click()}
								className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 px-3 py-1.5 hover:border-editorial-ink hover:text-editorial-ink transition-colors"
							>
								<Upload size={12} /> Upload CSV
							</button>
							<button
								onClick={() => {
									setBulkRows(
										Array.from({ length: 5 }, () =>
											makeEmptyBulkRow(category),
										),
									);
									setBulkError(null);
									setBulkSuccess(null);
								}}
								className="text-[10px] text-gray-400 underline hover:text-red-500 transition-colors"
							>
								Clear all
							</button>
						</div>
					</div>

					{/* Spreadsheet table */}
					<div className="overflow-x-auto border border-gray-200">
						<table
							className="w-full text-sm border-collapse [&_th:not(:last-child)]:border-r [&_th:not(:last-child)]:border-gray-200/70 [&_td:not(:last-child)]:border-r [&_td:not(:last-child)]:border-gray-200/70"
							{...bulkResize.tableProps}
						>
							<colgroup>
								{Array.from({ length: 8 }, (_, i) => (
									<col
										key={i}
										style={bulkResize.getColumnStyle(i)}
									/>
								))}
							</colgroup>
							<thead>
								<tr className="bg-editorial-ink text-white text-[10px] uppercase tracking-widest">
									<th className="px-2 py-2 text-center font-black w-8">
										#
									</th>
									<th className="px-3 py-2 text-left font-black min-w-[180px]">
										Team Name{" "}
										<span className="text-editorial-gold/80">
											*
										</span>
									</th>
									<th className="px-3 py-2 text-left font-black w-28">
										Category
									</th>
									<th className="px-3 py-2 text-left font-black w-28">
										Country
									</th>
									<th className="px-3 py-2 text-left font-black w-36">
										Coach
									</th>
									<th className="px-3 py-2 text-left font-black w-48">
										Members (comma-sep)
									</th>
									<th className="px-3 py-2 text-left font-black w-48">
										Description
									</th>
									<th className="w-8" />
								</tr>
							</thead>
							<tbody>
								{bulkRows.map((row, rowIndex) => {
									const hasData = bulkRowHasData(row);
									const nameEmpty = !row.team_name.trim();
									const nameError = hasData && nameEmpty;
									const rowFilled =
										row.team_name.trim() || hasData;

									return (
										<tr
											key={row._id}
											className={`border-b border-gray-100 ${rowIndex % 2 === 0 ? "bg-white" : "bg-editorial-bg/30"}`}
										>
											<td className="px-2 py-0 text-[10px] text-gray-300 font-mono text-center">
												{rowIndex + 1}
											</td>

											{/* Team Name */}
											<td
												className={
													nameError
														? "bg-red-50 border border-red-300"
														: ""
												}
											>
												<input
													type="text"
													data-bulk-row={rowIndex}
													data-bulk-col={0}
													value={row.team_name}
													placeholder="Team name…"
													onChange={(e) =>
														handleBulkChange(
															rowIndex,
															"team_name",
															e.target.value,
														)
													}
													onKeyDown={(e) =>
														handleBulkKeyDown(
															e,
															rowIndex,
															0,
														)
													}
													className={`w-full px-3 py-2 bg-transparent text-sm font-semibold focus:outline-none focus:bg-editorial-gold/10 placeholder:text-gray-300 ${
														nameError
															? "text-red-600"
															: ""
													}`}
												/>
											</td>

											{/* Category */}
											<td>
												<select
													data-bulk-row={rowIndex}
													data-bulk-col={1}
													value={row.category}
													onChange={(e) =>
														handleBulkChange(
															rowIndex,
															"category",
															e.target.value,
														)
													}
													className="w-full px-3 py-2 bg-transparent text-sm font-semibold focus:outline-none focus:bg-editorial-gold/10 appearance-none cursor-pointer"
												>
													<option value="Junior">
														Junior
													</option>
													<option value="Senior">
														Senior
													</option>
												</select>
											</td>

											{/* Country */}
											<td
												className={
													!row.country && rowFilled
														? "bg-amber-50/60"
														: ""
												}
											>
												<input
													type="text"
													data-bulk-row={rowIndex}
													data-bulk-col={2}
													value={row.country}
													placeholder="—"
													onChange={(e) =>
														handleBulkChange(
															rowIndex,
															"country",
															e.target.value,
														)
													}
													onKeyDown={(e) =>
														handleBulkKeyDown(
															e,
															rowIndex,
															2,
														)
													}
													className="w-full px-3 py-2 bg-transparent text-sm focus:outline-none focus:bg-editorial-gold/10 placeholder:text-gray-300"
												/>
											</td>

											{/* Coach */}
											<td
												className={
													!row.coach_name && rowFilled
														? "bg-amber-50/60"
														: ""
												}
											>
												<input
													type="text"
													data-bulk-row={rowIndex}
													data-bulk-col={3}
													value={row.coach_name}
													placeholder="—"
													onChange={(e) =>
														handleBulkChange(
															rowIndex,
															"coach_name",
															e.target.value,
														)
													}
													onKeyDown={(e) =>
														handleBulkKeyDown(
															e,
															rowIndex,
															3,
														)
													}
													className="w-full px-3 py-2 bg-transparent text-sm focus:outline-none focus:bg-editorial-gold/10 placeholder:text-gray-300"
												/>
											</td>

											{/* Members */}
											<td>
												<input
													type="text"
													data-bulk-row={rowIndex}
													data-bulk-col={4}
													value={row.team_members}
													placeholder="Alice, Bob, …"
													onChange={(e) =>
														handleBulkChange(
															rowIndex,
															"team_members",
															e.target.value,
														)
													}
													onKeyDown={(e) =>
														handleBulkKeyDown(
															e,
															rowIndex,
															4,
														)
													}
													className="w-full px-3 py-2 bg-transparent text-sm focus:outline-none focus:bg-editorial-gold/10 placeholder:text-gray-300"
												/>
											</td>

											{/* Description */}
											<td>
												<input
													type="text"
													data-bulk-row={rowIndex}
													data-bulk-col={5}
													value={row.team_description}
													placeholder="—"
													onChange={(e) =>
														handleBulkChange(
															rowIndex,
															"team_description",
															e.target.value,
														)
													}
													onKeyDown={(e) =>
														handleBulkKeyDown(
															e,
															rowIndex,
															5,
														)
													}
													className="w-full px-3 py-2 bg-transparent text-sm focus:outline-none focus:bg-editorial-gold/10 placeholder:text-gray-300"
												/>
											</td>

											{/* Delete row */}
											<td className="px-1 text-center">
												<button
													tabIndex={-1}
													onClick={() =>
														setBulkRows((prev) =>
															prev.length > 1
																? prev.filter(
																		(
																			_,
																			i,
																		) =>
																			i !==
																			rowIndex,
																	)
																: prev,
														)
													}
													className="text-gray-200 hover:text-red-400 transition-colors"
													title="Remove row"
												>
													<Trash2 size={12} />
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Hints row */}
					<div className="flex items-center gap-6 text-[10px] text-gray-400 flex-wrap">
						<span>
							<kbd className="font-mono bg-gray-100 px-1">
								Tab
							</kbd>{" "}
							next cell
						</span>
						<span>
							<kbd className="font-mono bg-gray-100 px-1">
								Enter
							</kbd>{" "}
							/{" "}
							<kbd className="font-mono bg-gray-100 px-1">↓</kbd>{" "}
							next row
						</span>
						<span>
							<kbd className="font-mono bg-gray-100 px-1">↑</kbd>{" "}
							prev row
						</span>
						<button
							onClick={() =>
								setBulkRows((prev) => [
									...prev,
									makeEmptyBulkRow(category),
								])
							}
							className="ml-auto flex items-center gap-1 text-gray-400 hover:text-editorial-ink transition-colors"
						>
							<Plus size={11} /> Add row
						</button>
					</div>

					{bulkError && (
						<p className="text-xs text-red-600 flex items-center gap-1.5">
							<AlertCircle size={11} /> {bulkError}
						</p>
					)}
					{bulkSuccess && (
						<p className="text-xs text-editorial-green font-semibold">
							{bulkSuccess}
						</p>
					)}

					<div className="flex items-center gap-3 pt-1 flex-wrap">
						<button
							onClick={handleBulkSubmit}
							disabled={bulkSaving || readyCount === 0}
							className="border-2 border-editorial-ink bg-editorial-gold text-editorial-ink px-5 py-2 text-xs font-black uppercase tracking-widest hover:bg-editorial-ink hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
						>
							{bulkSaving
								? "Saving…"
								: `Save ${readyCount || ""} Team${readyCount !== 1 ? "s" : ""} →`}
						</button>
						{readyCount > 0 && (
							<span className="text-xs text-gray-400">
								{readyCount} row{readyCount !== 1 ? "s" : ""}{" "}
								with team names ready
							</span>
						)}
					</div>
				</div>
			</CollapsiblePanel>
		</>
	);
}

// ─── CollapsiblePanel ─────────────────────────────────────────────────────────

function CollapsiblePanel({
	title,
	open,
	onToggle,
	accent = false,
	children,
}: {
	title: string;
	open: boolean;
	onToggle: () => void;
	accent?: boolean;
	children: React.ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<number | "auto">("auto");

	useEffect(() => {
		if (ref.current) {
			setHeight(open ? ref.current.scrollHeight : 0);
		}
	}, [open, children]);

	return (
		<div
			className={`border bg-white overflow-hidden ${accent ? "border-editorial-gold/60" : "border-gray-200"}`}
		>
			<button
				onClick={onToggle}
				className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-editorial-ink/5 transition-colors"
			>
				{open ? (
					<ChevronUp size={14} className="shrink-0 text-gray-400" />
				) : (
					<ChevronDown size={14} className="shrink-0 text-gray-400" />
				)}
				<span className="text-xs font-black uppercase tracking-widest flex-1">
					{title}
				</span>
			</button>
			<div
				style={{
					height: typeof height === "number" ? `${height}px` : height,
					overflow: "hidden",
					transition: "height 200ms ease",
				}}
			>
				<div ref={ref} className="border-t border-gray-100">
					{children}
				</div>
			</div>
		</div>
	);
}

// ─── PhaseAccordion ───────────────────────────────────────────────────────────

function PhaseAccordion({
	phase,
	matches,
	thirdPlaceMatches,
	overrideMatchId,
	winnerConfirming,
	lockType,
	scorekeeperLocked,
	onSetWinner,
	onToggleOverride,
	onAdvanceWinners,
	canAdvance,
	onLock,
	onUnlock,
	onLockScorekeeper,
	onUnlockScorekeeper,
}: {
	phase: Phase;
	matches: MatchWithTeams[];
	thirdPlaceMatches: MatchWithTeams[];
	overrideMatchId: string | null;
	winnerConfirming: string | null;
	lockType: string | null;
	scorekeeperLocked: boolean;
	onSetWinner: (matchId: string, winnerId: string) => void;
	onToggleOverride: (id: string | null) => void;
	onAdvanceWinners?: () => void;
	canAdvance: boolean;
	onLock: (lt: "full" | "scores") => void;
	onUnlock: () => void;
	onLockScorekeeper: () => void;
	onUnlockScorekeeper: () => void;
}) {
	const allConfirmed = matches.every((m) => m.winner_id);
	const confirmedCount = matches.filter((m) => m.winner_id).length;
	const [open, setOpen] = useState(false);

	return (
		<div
			className={`border-2 bg-white overflow-hidden ${allConfirmed ? "border-editorial-green/40" : "border-editorial-ink"}`}
		>
			{/* Accordion header */}
			<div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
				<button
					onClick={(e) => {
						e.stopPropagation();
						setOpen((v) => !v);
					}}
					className="flex items-center gap-3 flex-1 text-left min-w-0"
				>
					{open ? (
						<ChevronUp
							size={14}
							className="shrink-0 text-gray-400"
						/>
					) : (
						<ChevronDown
							size={14}
							className="shrink-0 text-gray-400"
						/>
					)}
					<span className="text-xs font-black uppercase tracking-widest flex-1 truncate">
						{phase}
					</span>
					<span
						className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 shrink-0 ${
							allConfirmed
								? "bg-editorial-green/10 text-editorial-green border border-editorial-green/30"
								: "bg-amber-50 text-amber-600 border border-amber-200"
						}`}
					>
						{allConfirmed
							? `All confirmed`
							: `${confirmedCount}/${matches.length}`}
					</span>
				</button>

				{/* Actions (stopPropagation to avoid toggle) */}
				<div
					className="flex items-center gap-2 shrink-0"
					onClick={(e) => e.stopPropagation()}
				>
					<ScorekeeperLockControl
						phase={phase}
						locked={scorekeeperLocked}
						onLock={onLockScorekeeper}
						onUnlock={onUnlockScorekeeper}
					/>
					<LockControl
						phase={phase}
						lockType={lockType}
						onLock={onLock}
						onUnlock={onUnlock}
					/>
					{onAdvanceWinners && canAdvance && (
						<button
							onClick={onAdvanceWinners}
							disabled={!allConfirmed}
							title={
								!allConfirmed
									? "Confirm all winners first"
									: undefined
							}
							className="border-2 border-editorial-ink px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-white hover:bg-editorial-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] whitespace-nowrap"
						>
							Advance → {nextPhaseFor(phase)}
						</button>
					)}
				</div>
			</div>

			{/* Accordion body */}
			{open && (
				<div className="divide-y divide-gray-300">
					{matches.map((m, i) => (
						<MatchCard
							key={m.id}
							match={m}
							matchNumber={i + 1}
							isOverriding={overrideMatchId === m.id}
							isConfirming={winnerConfirming === m.id}
							onSetWinner={onSetWinner}
							onToggleOverride={onToggleOverride}
						/>
					))}

					{thirdPlaceMatches.length > 0 && (
						<div className="bg-gray-50 px-4 pt-3 pb-1">
							<p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
								Third Place Match
							</p>
							{thirdPlaceMatches.map((m, i) => (
								<MatchCard
									key={m.id}
									match={m}
									matchNumber={i + 1}
									isOverriding={overrideMatchId === m.id}
									isConfirming={winnerConfirming === m.id}
									onSetWinner={onSetWinner}
									onToggleOverride={onToggleOverride}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ─── ScorekeeperLockControl ───────────────────────────────────────────────────

function ScorekeeperLockControl({
	phase: _phase,
	locked,
	onLock,
	onUnlock,
}: {
	phase: string;
	locked: boolean;
	onLock: () => void;
	onUnlock: () => void;
}) {
	if (locked) {
		return (
			<div className="flex items-center gap-2 shrink-0">
				<span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 px-2 py-1 border bg-orange-50 text-orange-700 border-orange-200">
					<Lock size={9} />
					SK Locked
				</span>
				<button
					onClick={onUnlock}
					className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-editorial-ink transition-colors"
				>
					<Unlock size={10} /> Unlock
				</button>
			</div>
		);
	}

	return (
		<button
			onClick={onLock}
			className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-600 transition-colors shrink-0"
			title="Lock score entry for this phase"
		>
			<Lock size={10} />
			Lock SK
		</button>
	);
}

// ─── LockControl ─────────────────────────────────────────────────────────────

function LockControl({
	phase,
	lockType,
	onLock,
	onUnlock,
}: {
	phase: string;
	lockType: string | null;
	onLock: (lt: "full" | "scores") => void;
	onUnlock: () => void;
}) {
	const [open, setOpen] = useState(false);

	if (lockType) {
		return (
			<div className="flex items-center gap-2 shrink-0">
				<span
					className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 px-2 py-1 border ${
						lockType === "full"
							? "bg-red-50 text-red-600 border-red-200"
							: "bg-amber-50 text-amber-700 border-amber-200"
					}`}
				>
					<Lock size={9} />
					{lockType === "full" ? "Locked" : "Scores Hidden"}
				</span>
				<button
					onClick={onUnlock}
					className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-editorial-ink transition-colors"
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
			>
				<Lock size={10} /> Lock
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-1 z-20 border-2 border-editorial-ink bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-3 space-y-2 w-52">
					<p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
						Spectator lock — {phase}
					</p>
					<button
						onClick={() => {
							onLock("scores");
							setOpen(false);
						}}
						className="w-full text-left px-3 py-2 text-xs border border-gray-200 hover:border-editorial-gold hover:bg-editorial-gold/10 transition-colors"
					>
						<span className="font-bold block">Hide Scores</span>
						<span className="text-[10px] text-gray-400">
							Show teams, hide point values
						</span>
					</button>
					<button
						onClick={() => {
							onLock("full");
							setOpen(false);
						}}
						className="w-full text-left px-3 py-2 text-xs border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
					>
						<span className="font-bold block">Lock All</span>
						<span className="text-[10px] text-gray-400">
							Hide everything from spectators
						</span>
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

// ─── StandingsTable ───────────────────────────────────────────────────────────

function StandingsTable({
	standings,
	advanceCount,
}: {
	standings: Standing[];
	advanceCount: AdvanceCount;
}) {
	return (
		<div className="overflow-hidden">
			<div className="bg-editorial-ink text-white grid grid-cols-[28px_1fr_80px_88px_48px] px-3 py-2 text-[10px] font-black uppercase tracking-widest">
				<span>#</span>
				<span>Team</span>
				<span className="text-right">Best Rnd</span>
				<span className="text-right">Total</span>
				<span className="text-center">Adv</span>
			</div>

			{standings.map((s, i) => (
				<div
					key={s.team.id}
					className={`grid grid-cols-[28px_1fr_80px_88px_48px] px-3 py-2.5 border-t border-gray-100 items-center border-l-4 ${
						i < advanceCount
							? "border-l-editorial-gold"
							: "border-l-transparent"
					} ${i % 2 === 0 ? "bg-white" : "bg-editorial-bg/40"}`}
				>
					<span className="text-xs font-black text-gray-400">
						{s.rank}
					</span>
					<span className="text-sm font-semibold truncate">
						{s.team.team_name}
					</span>
					<span
						className={`text-right text-sm font-black font-mono ${s.best_round > 0 ? "text-editorial-green" : "text-gray-300"}`}
					>
						{s.best_round > 0 ? s.best_round : "—"}
					</span>
					<span className="text-right text-xs font-mono text-gray-400">
						{s.total_points > 0 ? s.total_points : "—"}
					</span>
					<span className="text-center text-[10px] font-black">
						{i < advanceCount ? (
							<span className="text-editorial-gold">ADV</span>
						) : (
							<span className="text-gray-200">—</span>
						)}
					</span>
				</div>
			))}
		</div>
	);
}

// ─── SeedPreview ──────────────────────────────────────────────────────────────

function SeedPreview({
	pairings,
	topTeams,
	targetPhase,
}: {
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
					<div
						key={i}
						className="flex items-center gap-3 text-sm py-0.5"
					>
						<span className="w-16 text-right text-[10px] font-bold text-gray-400 shrink-0">
							Match {i + 1}
						</span>
						<span
							className={`flex-1 font-semibold ${!tA ? "text-gray-300 italic" : ""}`}
						>
							{tA ? (
								<>
									<span className="text-xs text-gray-400 mr-1">
										#{seedA}
									</span>
									{tA.team.team_name}
								</>
							) : (
								`Seed #${seedA} — no score`
							)}
						</span>
						<span className="text-xs text-gray-400 font-bold shrink-0">
							vs
						</span>
						<span
							className={`flex-1 font-semibold ${!tB ? "text-gray-300 italic" : ""}`}
						>
							{tB ? (
								<>
									<span className="text-xs text-gray-400 mr-1">
										#{seedB}
									</span>
									{tB.team.team_name}
								</>
							) : (
								`Seed #${seedB} — no score`
							)}
						</span>
					</div>
				);
			})}
		</div>
	);
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({
	match,
	matchNumber,
	isOverriding,
	isConfirming,
	onSetWinner,
	onToggleOverride,
}: {
	match: MatchWithTeams;
	matchNumber: number;
	isOverriding: boolean;
	isConfirming: boolean;
	onSetWinner: (matchId: string, winnerId: string) => void;
	onToggleOverride: (id: string | null) => void;
}) {
	const t1Score = match.team_1_final_points ?? 0;
	const t2Score = match.team_2_final_points ?? 0;
	const suggestedId =
		t1Score > t2Score
			? match.team_1_id
			: t2Score > t1Score
				? match.team_2_id
				: null;
	const hasWinner = !!match.winner_id;
	const isTied =
		match.team_1_id &&
		match.team_2_id &&
		t1Score === t2Score &&
		t1Score > 0;
	const showPicker = !hasWinner || isOverriding;
	const [editingTime, setEditingTime] = useState(false);
	const [localSchedule, setLocalSchedule] = useState<string | null>(match.scheduled_time);

	async function saveTime(value: string) {
		const t = value ? new Date(value).toISOString() : null;
		setLocalSchedule(t);
		setEditingTime(false);
		await supabase.from("matches").update({ scheduled_time: t }).eq("id", match.id);
	}

	return (
		<div
			className={`px-4 py-3.5 transition-colors ${hasWinner ? "bg-editorial-green/5" : "bg-white"}`}
		>
			<div className="flex items-center gap-3 flex-wrap">
				<span className="text-[10px] font-black text-gray-300 w-10 shrink-0 uppercase tracking-wide">
					M{matchNumber}
					{match.table_number !== null && (
						<span className="block text-gray-200">
							T{match.table_number}
						</span>
					)}
				</span>

				<span
					className={`flex-1 min-w-[6rem] text-sm font-semibold truncate ${t1Score > t2Score && t1Score > 0 ? "text-editorial-green" : ""}`}
				>
					{match.team_1?.team_name ?? (
						<span className="text-gray-300 italic">TBD</span>
					)}
				</span>

				<div className="flex items-center gap-2 shrink-0">
					<span
						className={`text-lg font-black font-mono w-10 text-right ${t1Score > t2Score ? "text-editorial-green" : "text-editorial-ink"}`}
					>
						{t1Score}
					</span>
					<span className="text-gray-200 font-bold text-xs">vs</span>
					<span
						className={`text-lg font-black font-mono w-10 ${t2Score > t1Score ? "text-editorial-green" : "text-editorial-ink"}`}
					>
						{t2Score}
					</span>
				</div>

				<span
					className={`flex-1 min-w-[6rem] text-sm font-semibold text-right truncate ${t2Score > t1Score && t2Score > 0 ? "text-editorial-green" : ""}`}
				>
					{match.team_2?.team_name ?? (
						<span className="text-gray-300 italic">TBD</span>
					)}
				</span>

				<div className="shrink-0 flex items-center gap-2">
					{editingTime ? (
						<input
							type="datetime-local"
							defaultValue={localSchedule ? new Date(localSchedule).toISOString().slice(0, 16) : ""}
							onBlur={(e) => saveTime(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") saveTime((e.target as HTMLInputElement).value);
								if (e.key === "Escape") setEditingTime(false);
							}}
							autoFocus
							className="border border-editorial-gold px-1.5 py-0.5 text-xs focus:outline-none w-40"
						/>
					) : (
						<button
							onClick={() => setEditingTime(true)}
							className="text-[10px] text-gray-300 hover:text-editorial-ink transition-colors"
							title="Set scheduled time"
						>
							{localSchedule
								? new Date(localSchedule).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
								: "＋ time"}
						</button>
					)}
					{hasWinner && !isOverriding && (
						<>
							<span className="text-xs font-black text-editorial-green">
								✓ {match.winner?.team_name}
							</span>
							<button
								onClick={() => onToggleOverride(match.id)}
								className="text-[10px] text-gray-400 underline hover:text-editorial-ink"
							>
								Edit
							</button>
						</>
					)}
				</div>
			</div>

			{showPicker && (
				<div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center gap-3 flex-wrap">
					<span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
						{isOverriding ? "Override:" : "Winner:"}
					</span>

					{(
						[
							{
								team: match.team_1,
								id: match.team_1_id,
								score: t1Score,
							},
							{
								team: match.team_2,
								id: match.team_2_id,
								score: t2Score,
							},
						] as const
					).map(({ team, id, score }) => {
						if (!id || !team) return null;
						const suggested = id === suggestedId;
						return (
							<button
								key={id}
								onClick={() => onSetWinner(match.id, id)}
								disabled={isConfirming}
								className={`px-3 py-1.5 border-2 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50 ${
									suggested
										? "border-editorial-gold bg-editorial-gold/10 hover:bg-editorial-gold"
										: "border-gray-200 text-gray-600 hover:border-editorial-ink hover:text-editorial-ink"
								}`}
							>
								{suggested ? "★ " : ""}
								{team.team_name}{" "}
								<span className="font-mono">({score})</span>
							</button>
						);
					})}

					{isTied && (
						<span className="text-[10px] text-editorial-gold font-semibold">
							Tied — admin must decide
						</span>
					)}
					{isOverriding && (
						<button
							onClick={() => onToggleOverride(null)}
							className="text-[10px] text-gray-400 underline hover:text-editorial-ink"
						>
							Cancel
						</button>
					)}
					{isConfirming && (
						<span className="text-[10px] text-editorial-gold animate-pulse">
							Saving…
						</span>
					)}
				</div>
			)}
		</div>
	);
}

// ─── ScoreekeepersTab ─────────────────────────────────────────────────────────

function ScoreekeepersTab() {
	const [scorekeepers, setScorekeepers] = useState<ScorekeeperProfile[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [addOpen, setAddOpen] = useState(false);
	const [addEmail, setAddEmail] = useState("");
	const [addTable, setAddTable] = useState("");
	const [addRole, setAddRole] = useState<"scorekeeper" | "referee">("scorekeeper");
	const [isAdding, setIsAdding] = useState(false);
	const [addError, setAddError] = useState<string | null>(null);
	const [newCred, setNewCred] = useState<{
		email: string;
		password: string;
		emailSent: boolean;
	} | null>(null);
	const [showPwd, setShowPwd] = useState(false);
	const [copied, setCopied] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTable, setEditTable] = useState("");
	const [isSavingEdit, setIsSavingEdit] = useState(false);
	const [lockingId, setLockingId] = useState<string | null>(null);

	// Bulk import state
	type BulkStaffRow = { email: string; role: "scorekeeper" | "referee"; table_number: string; status: "pending" | "ok" | "error"; message: string };
	const [bulkOpen, setBulkOpen] = useState(false);
	const [bulkRows, setBulkRows] = useState<BulkStaffRow[]>([]);
	const [isBulkImporting, setIsBulkImporting] = useState(false);
	const [bulkSummary, setBulkSummary] = useState<string | null>(null);

	function parseBulkCSV(text: string): BulkStaffRow[] {
		const lines = text.split(/\r?\n/).filter((l) => l.trim());
		if (!lines.length) return [];
		const firstCols = lines[0].toLowerCase().split(",").map((c) => c.trim());
		const startIdx = firstCols.includes("email") ? 1 : 0;
		return lines.slice(startIdx).map((line) => {
			const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
			return {
				email: cols[0] ?? "",
				role: (cols[1] === "referee" ? "referee" : "scorekeeper") as "scorekeeper" | "referee",
				table_number: cols[2] ?? "",
				status: "pending" as const,
				message: "",
			};
		}).filter((r) => r.email);
	}

	async function handleBulkImport() {
		if (!bulkRows.length) return;
		setIsBulkImporting(true);
		setBulkSummary(null);
		let created = 0;
		let failed = 0;
		const updated = [...bulkRows];
		for (let i = 0; i < updated.length; i++) {
			if (updated[i].status === "ok") { created++; continue; }
			const row = updated[i];
			const tableNum = row.table_number.trim() ? parseInt(row.table_number, 10) : null;
			const { data, error } = await supabase.functions.invoke("manage-scorekeepers", {
				body: { action: "create", email: row.email, role: row.role, table_number: tableNum },
			});
			if (error || (data as { error?: string })?.error) {
				updated[i] = { ...row, status: "error", message: (data as { error?: string })?.error ?? error?.message ?? "Failed" };
				failed++;
			} else {
				updated[i] = { ...row, status: "ok", message: `Created (pwd: ${(data as { password: string }).password})` };
				created++;
			}
			setBulkRows([...updated]);
		}
		setBulkSummary(`${created} created, ${failed} failed`);
		setIsBulkImporting(false);
		await loadScorekeepers();
	}

	async function loadScorekeepers() {
		setIsLoading(true);
		const { data } = await supabase
			.from("user_profiles")
			.select("id, email, table_number, created_at, role, locked")
			.in("role", ["scorekeeper", "referee"])
			.order("created_at", { ascending: false });
		setScorekeepers((data as ScorekeeperProfile[]) ?? []);
		setIsLoading(false);
	}

	useEffect(() => {
		loadScorekeepers();
	}, []);

	async function handleAdd() {
		const trimmed = addEmail.trim();
		if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
			setAddError("Enter a valid email address.");
			return;
		}
		setIsAdding(true);
		setAddError(null);
		const tableNum = addTable.trim() ? parseInt(addTable, 10) : null;
		const { data, error } = await supabase.functions.invoke(
			"manage-scorekeepers",
			{
				body: {
					action: "create",
					email: trimmed,
					table_number: tableNum,
					role: addRole,
				},
			},
		);
		if (error || (data as { error?: string })?.error) {
			setAddError(
				(data as { error?: string })?.error ??
					error?.message ??
					"Failed to create scorekeeper.",
			);
		} else {
			setNewCred({
				email: trimmed,
				password: (data as { password: string }).password,
				emailSent: (data as { emailSent: boolean }).emailSent,
			});
			setAddEmail("");
			setAddTable("");
			setAddOpen(false);
			await loadScorekeepers();
		}
		setIsAdding(false);
	}

	async function handleDelete(userId: string) {
		setIsDeleting(true);
		await supabase.functions.invoke("manage-scorekeepers", {
			body: { action: "delete", userId },
		});
		setDeletingId(null);
		setIsDeleting(false);
		await loadScorekeepers();
	}

	async function handleSaveEdit(userId: string) {
		setIsSavingEdit(true);
		const tableNum = editTable.trim() ? parseInt(editTable, 10) : null;
		await supabase.functions.invoke("manage-scorekeepers", {
			body: { action: "update", userId, table_number: tableNum },
		});
		setEditingId(null);
		setIsSavingEdit(false);
		await loadScorekeepers();
	}

	async function handleToggleLock(userId: string, currentlyLocked: boolean) {
		setLockingId(userId);
		await supabase
			.from("user_profiles")
			.update({ locked: !currentlyLocked })
			.eq("id", userId);
		setLockingId(null);
		await loadScorekeepers();
	}

	function copyCredentials(email: string, password: string) {
		navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<div className="space-y-4">
			{/* ── New credential banner ──────────────────────────────────── */}
			{newCred && (
				<div className="border border-editorial-green/40 bg-editorial-green/5 p-4 space-y-3">
					<div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-editorial-green">
						<ShieldCheck size={14} />
						Scorekeeper Account Created
					</div>
					<p className="text-xs text-gray-600">
						{newCred.emailSent ? (
							<>
								Credentials were emailed to{" "}
								<strong>{newCred.email}</strong>.
							</>
						) : (
							<>
								Email sending is not configured — share these
								credentials manually with the scorekeeper:
							</>
						)}
					</p>
					<div className="bg-white border border-gray-200 p-3 font-mono text-sm space-y-2">
						<div className="flex items-center gap-3">
							<span className="text-gray-400 w-20 text-xs font-sans tracking-wide">
								Email
							</span>
							<span className="text-editorial-ink font-semibold flex-1">
								{newCred.email}
							</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="text-gray-400 w-20 text-xs font-sans tracking-wide">
								Password
							</span>
							<span className="flex-1 text-editorial-ink font-semibold tracking-wider text-base">
								{showPwd
									? newCred.password
									: "•".repeat(newCred.password.length)}
							</span>
							<button
								onClick={() => setShowPwd((v) => !v)}
								className="p-1 text-gray-400 hover:text-editorial-ink transition-colors"
								title={showPwd ? "Hide" : "Reveal"}
							>
								{showPwd ? (
									<EyeOff size={13} />
								) : (
									<Eye size={13} />
								)}
							</button>
							<button
								onClick={() =>
									copyCredentials(
										newCred.email,
										newCred.password,
									)
								}
								className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-200 hover:border-editorial-gold hover:bg-editorial-gold/5 transition-colors"
							>
								<Copy size={11} />
								{copied ? "Copied!" : "Copy"}
							</button>
						</div>
					</div>
					<button
						onClick={() => setNewCred(null)}
						className="text-xs text-gray-400 hover:text-gray-600 underline"
					>
						Dismiss
					</button>
				</div>
			)}

			{/* ── Add staff panel ──────────────────────────────────────── */}
			<CollapsiblePanel
				title="Add Staff Member"
				open={addOpen}
				onToggle={() => setAddOpen((v) => !v)}
				accent
			>
				<div className="p-4 space-y-3">
					<div className="flex gap-3 flex-wrap">
						<div className="flex-1 min-w-52">
							<label className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1 block">
								Email *
							</label>
							<input
								type="email"
								placeholder="staff@example.com"
								value={addEmail}
								onChange={(e) => setAddEmail(e.target.value)}
								onKeyDown={(e) =>
									e.key === "Enter" && handleAdd()
								}
								className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-editorial-gold text-editorial-ink placeholder:text-gray-300"
							/>
						</div>
						<div className="w-40">
							<label className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1 block">
								Role *
							</label>
							<select
								value={addRole}
								onChange={(e) => setAddRole(e.target.value as "scorekeeper" | "referee")}
								className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-editorial-gold text-editorial-ink bg-white"
							>
								<option value="scorekeeper">Scorekeeper</option>
								<option value="referee">Referee</option>
							</select>
						</div>
						<div className="w-32">
							<label className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1 block">
								Table # (opt.)
							</label>
							<input
								type="number"
								placeholder="—"
								value={addTable}
								onChange={(e) => setAddTable(e.target.value)}
								className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-editorial-gold text-editorial-ink placeholder:text-gray-300"
							/>
						</div>
					</div>
					{addError && (
						<p className="text-xs text-red-600 flex items-center gap-1">
							<AlertCircle size={11} /> {addError}
						</p>
					)}
					<button
						onClick={handleAdd}
						disabled={isAdding}
						className="flex items-center gap-1.5 px-4 py-2 bg-editorial-ink text-white text-xs font-black uppercase tracking-widest hover:bg-editorial-gold hover:text-editorial-ink transition-colors disabled:opacity-40"
					>
						{isAdding ? (
							<Loader2 size={12} className="animate-spin" />
						) : (
							<Plus size={12} />
						)}
						{isAdding ? "Creating…" : "Create Account"}
					</button>
				</div>
			</CollapsiblePanel>

			{/* ── Scorekeepers list ──────────────────────────────────────── */}
			<div className="border border-gray-200 bg-white">
				<div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
					<span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
						Staff ({scorekeepers.length})
					</span>
					<button
						onClick={loadScorekeepers}
						className="text-gray-400 hover:text-editorial-ink transition-colors p-1"
					>
						<RefreshCw
							size={12}
							className={isLoading ? "animate-spin" : ""}
						/>
					</button>
				</div>

				{isLoading ? (
					<div className="py-10 text-center text-sm text-gray-400">
						Loading…
					</div>
				) : scorekeepers.length === 0 ? (
					<div className="py-10 text-center text-sm text-gray-400">
						No staff yet. Add one above.
					</div>
				) : (
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100 bg-gray-50/50">
								<th className="text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
									Email
								</th>
								<th className="text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 w-24">
									Role
								</th>
								<th className="text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 w-28">
									Table
								</th>
								<th className="text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 w-28">
									Added
								</th>
								<th className="px-4 py-2 w-20" />
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{scorekeepers.map((sk) => (
								<tr
									key={sk.id}
									className={`hover:bg-gray-50/60 ${sk.locked ? "bg-red-50/40" : ""}`}
								>
									<td className="px-4 py-2.5">
										<div className="flex items-center gap-2 min-w-0">
											{sk.locked && (
												<span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-200 bg-red-50 px-1.5 py-0.5">
													<Lock size={9} />
													Locked
												</span>
											)}
											<span
												className={`font-medium truncate ${sk.locked ? "text-gray-400" : "text-editorial-ink"}`}
											>
												{sk.email ?? (
													<span className="text-gray-300 italic text-xs">
														no email
													</span>
												)}
											</span>
										</div>
									</td>
									<td className="px-4 py-2.5">
										<span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 border ${
											sk.role === "referee"
												? "text-blue-700 border-blue-200 bg-blue-50"
												: "text-gray-500 border-gray-200 bg-gray-50"
										}`}>
											{sk.role === "referee" ? "Referee" : "Scorekeeper"}
										</span>
									</td>
									<td className="px-4 py-2.5">
										{editingId === sk.id ? (
											<div className="flex items-center gap-1.5">
												<input
													type="number"
													value={editTable}
													onChange={(e) =>
														setEditTable(
															e.target.value,
														)
													}
													onKeyDown={(e) => {
														if (e.key === "Enter")
															handleSaveEdit(
																sk.id,
															);
														if (e.key === "Escape")
															setEditingId(null);
													}}
													autoFocus
													className="w-16 border border-editorial-gold px-2 py-1 text-sm focus:outline-none"
													placeholder="—"
												/>
												<button
													onClick={() =>
														handleSaveEdit(sk.id)
													}
													disabled={isSavingEdit}
													className="text-xs px-2 py-1 bg-editorial-green text-white font-bold hover:opacity-90 disabled:opacity-40"
												>
													{isSavingEdit
														? "…"
														: "Save"}
												</button>
												<button
													onClick={() =>
														setEditingId(null)
													}
													className="text-xs text-gray-400 hover:text-gray-600 px-1"
												>
													✕
												</button>
											</div>
										) : (
											<span className="text-gray-600">
												{sk.table_number ?? (
													<span className="text-gray-300">
														—
													</span>
												)}
											</span>
										)}
									</td>
									<td className="px-4 py-2.5 text-gray-400 text-xs">
										{new Date(
											sk.created_at,
										).toLocaleDateString()}
									</td>
									<td className="px-4 py-2.5">
										<div className="flex items-center gap-0.5 justify-end">
											{/* Lock / Unlock toggle */}
											<button
												onClick={() =>
													handleToggleLock(
														sk.id,
														sk.locked,
													)
												}
												disabled={lockingId === sk.id}
												title={
													sk.locked
														? "Unlock scorekeeper"
														: "Lock scorekeeper"
												}
												className={`p-1.5 transition-colors disabled:opacity-40 ${
													sk.locked
														? "text-red-500 hover:text-editorial-ink"
														: "text-gray-400 hover:text-red-500"
												}`}
											>
												{lockingId === sk.id ? (
													<Loader2
														size={13}
														className="animate-spin"
													/>
												) : sk.locked ? (
													<Unlock size={13} />
												) : (
													<Lock size={13} />
												)}
											</button>
											{editingId !== sk.id && (
												<button
													onClick={() => {
														setEditingId(sk.id);
														setEditTable(
															String(
																sk.table_number ??
																	"",
															),
														);
													}}
													className="p-1.5 text-gray-400 hover:text-editorial-ink transition-colors"
													title="Edit table assignment"
												>
													<Pencil size={13} />
												</button>
											)}
											<button
												onClick={() =>
													setDeletingId(sk.id)
												}
												className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
												title="Remove scorekeeper"
											>
												<Trash2 size={13} />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{/* ── Bulk import staff ──────────────────────────────────────── */}
			<CollapsiblePanel
				title="Bulk Import Staff"
				open={bulkOpen}
				onToggle={() => { setBulkOpen((v) => !v); setBulkSummary(null); }}
			>
				<div className="p-4 space-y-3">
					<p className="text-xs text-gray-500">
						Upload a CSV with columns: <code className="bg-gray-100 px-1">email, role, table_number</code> (role: <em>scorekeeper</em> or <em>referee</em>; table_number optional).
					</p>
					<input
						type="file"
						accept=".csv,.txt"
						onChange={async (e) => {
							const file = e.target.files?.[0];
							if (!file) return;
							const text = await file.text();
							setBulkRows(parseBulkCSV(text));
							setBulkSummary(null);
						}}
						className="text-sm text-gray-600"
					/>
					{bulkRows.length > 0 && (
						<div className="overflow-x-auto border border-gray-200">
							<table className="w-full text-xs">
								<thead>
									<tr className="bg-gray-50 border-b border-gray-200">
										<th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-400">Email</th>
										<th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-400 w-32">Role</th>
										<th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-400 w-24">Table</th>
										<th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-400 w-36">Status</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{bulkRows.map((row, i) => (
										<tr key={i} className={row.status === "ok" ? "bg-green-50/40" : row.status === "error" ? "bg-red-50/40" : ""}>
											<td className="px-3 py-2 text-editorial-ink">{row.email}</td>
											<td className="px-3 py-2">
												<select
													value={row.role}
													disabled={isBulkImporting || row.status === "ok"}
													onChange={(e) => setBulkRows((prev) => prev.map((r, idx) => idx === i ? { ...r, role: e.target.value as "scorekeeper" | "referee" } : r))}
													className="border border-gray-200 px-1 py-0.5 text-xs bg-white disabled:opacity-60"
												>
													<option value="scorekeeper">Scorekeeper</option>
													<option value="referee">Referee</option>
												</select>
											</td>
											<td className="px-3 py-2">
												<input
													type="number"
													value={row.table_number}
													disabled={isBulkImporting || row.status === "ok"}
													onChange={(e) => setBulkRows((prev) => prev.map((r, idx) => idx === i ? { ...r, table_number: e.target.value } : r))}
													placeholder="—"
													className="w-16 border border-gray-200 px-1 py-0.5 text-xs disabled:opacity-60"
												/>
											</td>
											<td className="px-3 py-2">
												{row.status === "ok" && <span className="text-green-700 font-bold">✓ {row.message}</span>}
												{row.status === "error" && <span className="text-red-600">✗ {row.message}</span>}
												{row.status === "pending" && <span className="text-gray-400">—</span>}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					{bulkSummary && (
						<p className="text-xs font-bold text-editorial-ink">{bulkSummary}</p>
					)}
					<div className="flex items-center gap-3">
						<button
							onClick={handleBulkImport}
							disabled={isBulkImporting || bulkRows.filter((r) => r.status !== "ok").length === 0}
							className="flex items-center gap-1.5 px-4 py-2 bg-editorial-ink text-white text-xs font-black uppercase tracking-widest hover:bg-editorial-gold hover:text-editorial-ink transition-colors disabled:opacity-40"
						>
							{isBulkImporting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
							{isBulkImporting ? "Importing…" : `Import ${bulkRows.filter((r) => r.status !== "ok").length} Staff`}
						</button>
						{bulkRows.length > 0 && !isBulkImporting && (
							<button
								onClick={() => { setBulkRows([]); setBulkSummary(null); }}
								className="text-xs text-gray-400 hover:text-gray-600 underline"
							>
								Clear
							</button>
						)}
					</div>
				</div>
			</CollapsiblePanel>

			{/* ── Audit trail ────────────────────────────────────────────── */}
			<AuditTrailPanel />

			{/* ── Delete confirmation modal ──────────────────────────────── */}
			{deletingId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="bg-white border-2 border-editorial-ink p-6 max-w-sm w-full mx-4 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
						<p className="font-black text-editorial-ink mb-1">
							Remove scorekeeper?
						</p>
						<p className="text-sm text-gray-600 mb-5">
							<strong>
								{scorekeepers.find((s) => s.id === deletingId)
									?.email ?? "This user"}
							</strong>{" "}
							will lose access immediately and cannot sign in.
						</p>
						<div className="flex gap-3">
							<button
								onClick={() => handleDelete(deletingId)}
								disabled={isDeleting}
								className="flex-1 px-4 py-2 bg-red-600 text-white text-xs font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-40 transition-colors"
							>
								{isDeleting ? "Removing…" : "Remove"}
							</button>
							<button
								onClick={() => setDeletingId(null)}
								disabled={isDeleting}
								className="flex-1 px-4 py-2 border border-gray-300 text-xs font-black uppercase tracking-widest hover:border-editorial-ink transition-colors"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// StyledSelect and SearchableSelect removed — now using shared CustomSelect component.

// ─── AuditTrailPanel ──────────────────────────────────────────────────────────

const SCORE_COL_LABELS: Record<string, string> = {
	team_1_r1: "Team 1 R1",
	team_1_r2: "Team 1 R2",
	team_1_r3: "Team 1 R3",
	team_1_r4: "Team 1 R4",
	team_2_r1: "Team 2 R1",
	team_2_r2: "Team 2 R2",
	team_2_r3: "Team 2 R3",
	team_2_r4: "Team 2 R4",
};

function formatRelTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const s = Math.floor(diff / 1000);
	if (s < 60) return "just now";
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return new Date(iso).toLocaleDateString();
}

function AuditTrailPanel() {
	const [open, setOpen] = useState(true);
	const [logs, setLogs] = useState<ScoreAuditLog[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [categoryFilter, setCategoryFilter] = useState<"all" | Category>(
		"all",
	);
	const [scorekeeperFilter, setScorekeeperFilter] = useState("");
	const [teamFilter, setTeamFilter] = useState("");

	async function loadLogs() {
		setIsLoading(true);
		let q = supabase
			.from("score_audit_log")
			.select("*")
			.order("changed_at", { ascending: false })
			.limit(200);
		if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
		const { data } = await q;
		setLogs((data as ScoreAuditLog[]) ?? []);
		setIsLoading(false);
	}

	useEffect(() => {
		if (open) loadLogs();
	}, [open, categoryFilter]);

	// Options derived from the loaded batch
	const scorekeeperOptions = useMemo(
		() =>
			[
				...new Set(logs.map((l) => l.scorer_email).filter(Boolean)),
			] as string[],
		[logs],
	);

	const teamOptions = useMemo(
		() =>
			[
				...new Set(
					[
						...logs.map((l) => l.team_1_name),
						...logs.map((l) => l.team_2_name),
					].filter(Boolean),
				),
			].sort() as string[],
		[logs],
	);

	// Client-side filter on top of the server-fetched batch
	const filteredLogs = useMemo(
		() =>
			logs.filter((log) => {
				if (scorekeeperFilter && log.scorer_email !== scorekeeperFilter)
					return false;
				if (
					teamFilter &&
					log.team_1_name !== teamFilter &&
					log.team_2_name !== teamFilter
				)
					return false;
				return true;
			}),
		[logs, scorekeeperFilter, teamFilter],
	);

	const activeFilterCount =
		(categoryFilter !== "all" ? 1 : 0) +
		(scorekeeperFilter ? 1 : 0) +
		(teamFilter ? 1 : 0);

	return (
		<CollapsiblePanel
			title={`Audit Trail${activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""}` : ""}`}
			open={open}
			onToggle={() => setOpen((v) => !v)}
		>
			<div className="p-4 space-y-3">
				{/* Filter row */}
				<div className="flex items-center gap-2 flex-wrap">
					{/* Category */}
					<CustomSelect
						value={categoryFilter}
						defaultValue="all"
						options={[
							{ value: "all", label: "All categories" },
							{ value: "Junior", label: "Junior" },
							{ value: "Senior", label: "Senior" },
						]}
						onChange={(v) =>
							setCategoryFilter(v as "all" | Category)
						}
						showSearch={false}
					/>

					{/* Scorekeeper */}
					<CustomSelect
						value={scorekeeperFilter}
						defaultValue=""
						placeholder="All scorekeepers"
						options={scorekeeperOptions.map(
							(s): SelectOption => ({ value: s, label: s }),
						)}
						onChange={setScorekeeperFilter}
						className="min-w-44"
					/>

					{/* Team */}
					<CustomSelect
						value={teamFilter}
						defaultValue=""
						placeholder="All teams"
						options={teamOptions.map(
							(s): SelectOption => ({ value: s, label: s }),
						)}
						onChange={setTeamFilter}
						className="min-w-44"
					/>

					<button
						onClick={loadLogs}
						className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-editorial-ink transition-colors h-[30px] px-1"
					>
						<RefreshCw
							size={11}
							className={isLoading ? "animate-spin" : ""}
						/>
						Refresh
					</button>

					{logs.length > 0 && (
						<span className="text-[10px] text-gray-400 ml-auto self-center">
							{filteredLogs.length}
							{filteredLogs.length !== logs.length
								? ` of ${logs.length}`
								: ""}{" "}
							entr
							{filteredLogs.length !== 1 ? "ies" : "y"}
						</span>
					)}
				</div>

				{/* Log entries */}
				{isLoading ? (
					<div className="py-6 text-center text-sm text-gray-400">
						Loading…
					</div>
				) : filteredLogs.length === 0 ? (
					<div className="py-6 text-center text-sm text-gray-400">
						{logs.length === 0
							? "No score changes recorded yet."
							: "No entries match the current filters."}
					</div>
				) : (
					<div className="space-y-1.5 max-h-96 overflow-y-auto">
						{filteredLogs.map((log) => (
							<div
								key={log.id}
								className="flex gap-3 p-3 border border-gray-100 bg-white hover:border-gray-200 text-xs"
							>
								{/* Left: who + when */}
								<div className="shrink-0 w-40">
									<p className="font-semibold text-editorial-ink truncate">
										{log.scorer_email ?? (
											<span className="text-gray-400 italic">
												Unknown
											</span>
										)}
									</p>
									<p className="text-gray-400 flex items-center gap-1 mt-0.5">
										<Clock size={9} />
										{formatRelTime(log.changed_at)}
									</p>
									{log.phase && (
										<p className="text-gray-400 text-[10px] mt-0.5 uppercase tracking-wide">
											{log.phase} · {log.category}
										</p>
									)}
								</div>

								{/* Right: match + changes */}
								<div className="flex-1 min-w-0">
									{(log.team_1_name || log.team_2_name) && (
										<p className="font-semibold text-editorial-ink mb-1 truncate">
											{log.team_1_name ?? "TBD"} vs{" "}
											{log.team_2_name ?? "TBD"}
										</p>
									)}
									<div className="flex flex-wrap gap-x-3 gap-y-0.5">
										{Object.entries(log.changes).map(
											([col, diff]) => (
												<span
													key={col}
													className="text-gray-600"
												>
													<span className="font-medium text-gray-500">
														{SCORE_COL_LABELS[
															col
														] ?? col}
													</span>{" "}
													<span className="text-gray-400">
														{diff.from ?? "—"}
													</span>{" "}
													→{" "}
													<span className="font-semibold text-editorial-ink">
														{diff.to ?? "—"}
													</span>
												</span>
											),
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</CollapsiblePanel>
	);
}
