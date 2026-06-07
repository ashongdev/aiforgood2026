import { CloudOff, Lock, Loader2, LogOut, RefreshCw, Wifi } from "lucide-react";
import { CustomSelect } from "../components/CustomSelect";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEdgeColumnResize } from "../hooks/useEdgeColumnResize";
import { useOfflineQueue } from "../hooks/useOfflineQueue";
import type { Category, MatchWithTeams, Phase } from "../lib/database.types";
import { supabase } from "../lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES: Phase[] = [
	"Qualifiers",
	"Pre-Quarterfinals",
	"Quarterfinals",
	"Semifinals",
	"Third Place",
	"Finals",
];

const QUALIFIER_SCORE_COLS = [
	"team_1_r1",
	"team_1_r2",
	"team_1_r3",
	"team_1_r4",
	"team_2_r1",
	"team_2_r2",
	"team_2_r3",
	"team_2_r4",
] as const;

type QualifierCol = (typeof QUALIFIER_SCORE_COLS)[number];
type ScoreCol = QualifierCol;

// ─── Types ─────────────────────────────────────────────────────────────────────

// Local draft state tracks unsaved edits per cell before flush
type DraftState = Record<string, Record<ScoreCol, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcFinalPoints(
	r1: number | null,
	r2: number | null,
	r3: number | null,
	r4: number | null,
): number | null {
	const vals = [r1, r2, r3, r4].filter((v): v is number => v !== null);
	return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
}

function parseIntOrNull(raw: string): number | null {
	const trimmed = raw.trim();
	if (trimmed === "") return null;
	const n = parseInt(trimmed, 10);
	return isNaN(n) ? null : n;
}

// ─── Cell input component ──────────────────────────────────────────────────────

interface ScoreCellProps {
	matchId: string;
	col: ScoreCol;
	value: number | null;
	draft: string | undefined;
	rowIndex: number;
	colIndex: number;
	totalCols: number;
	totalRows: number;
	onChange: (matchId: string, col: ScoreCol, raw: string) => void;
	onCommit: (matchId: string, col: ScoreCol, raw: string) => void;
}

function ScoreCell({
	matchId,
	col,
	value,
	draft,
	rowIndex,
	colIndex,
	totalCols,
	totalRows,
	onChange,
	onCommit,
}: ScoreCellProps) {
	const displayValue =
		draft !== undefined ? draft : value !== null ? String(value) : "";

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" || e.key === "ArrowDown") {
			e.preventDefault();
			onCommit(matchId, col, (e.target as HTMLInputElement).value);
			// Move focus down one row, same column
			const nextRow = rowIndex + 1;
			if (nextRow < totalRows) {
				focusCell(nextRow, colIndex);
			}
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			onCommit(matchId, col, (e.target as HTMLInputElement).value);
			const prevRow = rowIndex - 1;
			if (prevRow >= 0) {
				focusCell(prevRow, colIndex);
			}
		} else if (e.key === "ArrowRight" || e.key === "Tab") {
			if (e.key === "Tab") e.preventDefault();
			onCommit(matchId, col, (e.target as HTMLInputElement).value);
			const nextCol = colIndex + 1;
			if (nextCol < totalCols) {
				focusCell(rowIndex, nextCol);
			} else if (rowIndex + 1 < totalRows) {
				focusCell(rowIndex + 1, 0);
			}
		} else if (e.key === "ArrowLeft") {
			onCommit(matchId, col, (e.target as HTMLInputElement).value);
			const prevCol = colIndex - 1;
			if (prevCol >= 0) {
				focusCell(rowIndex, prevCol);
			}
		}
	}

	return (
		<input
			type="text"
			inputMode="numeric"
			data-row={rowIndex}
			data-col={colIndex}
			value={displayValue}
			placeholder="—"
			onChange={(e) => {
				const val = e.target.value;
				// Allow empty, a lone minus, or a valid integer (positive or negative)
				if (/^-?\d*$/.test(val)) {
					onChange(matchId, col, val);
				}
			}}
			onBlur={(e) => onCommit(matchId, col, e.target.value)}
			onKeyDown={handleKeyDown}
			className="w-full h-full min-w-[52px] bg-transparent text-center text-sm font-mono font-semibold text-editorial-ink focus:outline-none focus:bg-editorial-gold/15 focus:shadow-[inset_0_0_0_2px_#d4af37] placeholder:text-gray-300"
		/>
	);
}

function focusCell(row: number, col: number) {
	const el = document.querySelector<HTMLInputElement>(
		`[data-row="${row}"][data-col="${col}"]`,
	);
	el?.focus();
	el?.select();
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function ScorekeeperPage() {
	const { profile, role, signOut } = useAuth();
	const navigate = useNavigate();

	const [phase, setPhase] = useState<Phase>("Qualifiers");
	const [category, setCategory] = useState<Category>("Junior");
	const [tableFilter, setTableFilter] = useState<string>(
		// Default to their assigned table if set, otherwise "All"
		profile?.table_number !== null ? String(profile?.table_number) : "all",
	);
	const [matches, setMatches] = useState<MatchWithTeams[]>([]);
	const [draft, setDraft] = useState<DraftState>({});
	const [saving, setSaving] = useState<Record<string, boolean>>({});
	const [saveError, setSaveError] = useState<Record<string, string>>({});
	const [isLoading, setIsLoading] = useState(true);
	const [elimActiveRounds, setElimActiveRounds] = useState(1);

	const { isOnline, pendingCount, isFlushing, enqueue } = useOfflineQueue(loadMatches);

	// ── Lock state ────────────────────────────────────────────────────────────

	const [isLocked, setIsLocked] = useState<boolean>(
		() => profile?.locked ?? false,
	);

	// Sync initial lock state when profile loads
	useEffect(() => {
		if (profile) setIsLocked(profile.locked ?? false);
	}, [profile?.id]);

	// Realtime: push lock changes instantly without needing a page refresh
	useEffect(() => {
		if (!profile?.id) return;
		const channel = supabase
			.channel(`lock-${profile.id}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "user_profiles",
					filter: `id=eq.${profile.id}`,
				},
				(payload) => {
					setIsLocked((payload.new as { locked: boolean }).locked ?? false);
				},
			)
			.subscribe();
		return () => { supabase.removeChannel(channel); };
	}, [profile?.id]);

	const isQualifiers = phase === "Qualifiers";

	// ── Data fetching ─────────────────────────────────────────────────────────

	async function loadMatches() {
		setIsLoading(true);
		const { data, error } = await supabase
			.from("matches")
			.select(
				`
				*,
				team_1:team_1_id ( id, team_name, category ),
				team_2:team_2_id ( id, team_name, category ),
				winner:winner_id ( id, team_name, category )
			`,
			)
			.eq("phase", phase)
			.eq("category", category)
			.order("match_order", { ascending: true });

		if (error) {
			console.error("[Scorekeeper] Load error:", error.message);
		} else {
			setMatches((data as MatchWithTeams[]) ?? []);
		}
		setIsLoading(false);
	}

	useEffect(() => {
		loadMatches();
	}, [phase, category]);

	useEffect(() => {
		setElimActiveRounds(1);
	}, [phase]);

	// ── Realtime subscription ─────────────────────────────────────────────────

	useEffect(() => {
		const channel = supabase
			.channel(`scorekeeper-matches-${phase}-${category}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "matches",
					filter: `phase=eq.${phase}`,
				},
				(payload) => {
					if (payload.eventType === "UPDATE") {
						setMatches((prev) =>
							prev.map((m) =>
								m.id === payload.new.id
									? {
											...m,
											...(payload.new as MatchWithTeams),
										}
									: m,
							),
						);
					}
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [phase, category]);

	// ── Draft management ──────────────────────────────────────────────────────

	function handleChange(matchId: string, col: ScoreCol, raw: string) {
		setDraft((prev) => ({
			...prev,
			[matchId]: { ...(prev[matchId] ?? {}), [col]: raw } as Record<
				ScoreCol,
				string
			>,
		}));
	}

	async function handleCommit(matchId: string, col: ScoreCol, raw: string) {
		// Remove from draft regardless of outcome
		setDraft((prev) => {
			const updated = { ...prev };
			if (updated[matchId]) {
				delete updated[matchId][col];
				if (Object.keys(updated[matchId]).length === 0)
					delete updated[matchId];
			}
			return updated;
		});

		const parsed = parseIntOrNull(raw);
		const match = matches.find((m) => m.id === matchId);
		if (!match) return;

		// Skip if value didn't change
		const current = match[col as keyof typeof match] as number | null;
		if (parsed === current) return;

		// Build the update payload; recalculate final_points from active rounds
		const update: Record<string, number | null> = { [col]: parsed };

		const activeRoundsCount = isQualifiers ? 4 : elimActiveRounds;
		const r1 = col === "team_1_r1" ? parsed : match.team_1_r1;
		const r2 = col === "team_1_r2" ? parsed : match.team_1_r2;
		const r3 = col === "team_1_r3" ? parsed : match.team_1_r3;
		const r4 = col === "team_1_r4" ? parsed : match.team_1_r4;
		const t1r = [r1, r2, r3, r4].map((r, i): number | null =>
			i < activeRoundsCount ? r : null,
		);
		update.team_1_final_points = calcFinalPoints(
			t1r[0],
			t1r[1],
			t1r[2],
			t1r[3],
		);

		const r1b = col === "team_2_r1" ? parsed : match.team_2_r1;
		const r2b = col === "team_2_r2" ? parsed : match.team_2_r2;
		const r3b = col === "team_2_r3" ? parsed : match.team_2_r3;
		const r4b = col === "team_2_r4" ? parsed : match.team_2_r4;
		const t2r = [r1b, r2b, r3b, r4b].map((r, i): number | null =>
			i < activeRoundsCount ? r : null,
		);
		update.team_2_final_points = calcFinalPoints(
			t2r[0],
			t2r[1],
			t2r[2],
			t2r[3],
		);

		// Optimistic local update (always — even offline)
		setMatches((prev) =>
			prev.map((m) => (m.id === matchId ? { ...m, ...update } : m)),
		);

		// If offline, queue the write and return — will sync on reconnect
		if (enqueue(matchId, update)) return;

		// Persist to Supabase
		setSaving((prev) => ({ ...prev, [matchId]: true }));
		const { error } = await supabase
			.from("matches")
			.update(update)
			.eq("id", matchId);

		setSaving((prev) => {
			const next = { ...prev };
			delete next[matchId];
			return next;
		});

		if (error) {
			console.error("[Scorekeeper] Save error:", error.message);
			setSaveError((prev) => ({ ...prev, [matchId]: error.message }));
			// Revert optimistic update
			setMatches((prev) =>
				prev.map((m) =>
					m.id === matchId ? { ...m, [col]: current } : m,
				),
			);
		} else {
			setSaveError((prev) => {
				const next = { ...prev };
				delete next[matchId];
				return next;
			});
		}
	}

	// ── Derived display data ──────────────────────────────────────────────────

	const availableTables = [
		...new Set(
			matches
				.map((m) => m.table_number)
				.filter((t): t is number => t !== null),
		),
	].sort((a, b) => a - b);

	const visibleMatches =
		tableFilter === "all"
			? matches
			: matches.filter(
					(m) => m.table_number === parseInt(tableFilter, 10),
				);

	// For inline total display as user types
	function getLiveTotal(
		match: MatchWithTeams,
		team: 1 | 2,
		activeRoundsCount: number = 4,
	): number | null {
		const prefix = team === 1 ? "team_1" : "team_2";
		const matchDraft = draft[match.id] ?? {};
		const get = (col: string) => {
			const draftVal = matchDraft[col as ScoreCol];
			if (draftVal !== undefined) return parseIntOrNull(draftVal);
			return (
				(match[col as keyof MatchWithTeams] as number | null) ?? null
			);
		};
		const rounds = [
			get(`${prefix}_r1`),
			get(`${prefix}_r2`),
			get(`${prefix}_r3`),
			get(`${prefix}_r4`),
		].map((r, i): number | null => (i < activeRoundsCount ? r : null));
		return calcFinalPoints(rounds[0], rounds[1], rounds[2], rounds[3]);
	}

	// Suggested winner for elimination phases
	function getSuggestedWinner(match: MatchWithTeams): string | null {
		if (isQualifiers) return null;
		const t1 = getLiveTotal(match, 1, elimActiveRounds) ?? 0;
		const t2 = getLiveTotal(match, 2, elimActiveRounds) ?? 0;
		if (t1 === t2) return null;
		return t1 > t2
			? (match.team_1?.team_name ?? null)
			: (match.team_2?.team_name ?? null);
	}

	// ── Render ────────────────────────────────────────────────────────────────

	// ── Lock overlay ──────────────────────────────────────────────────────────
	if (isLocked) {
		return (
			<div className="fixed inset-0 z-50 bg-editorial-ink flex flex-col items-center justify-center text-white px-6 text-center">
				<div className="border-4 border-editorial-gold p-6 mb-8">
					<Lock size={40} className="text-editorial-gold mx-auto" />
				</div>
				<h1 className="text-xl font-black uppercase tracking-widest mb-3">
					Access Suspended
				</h1>
				<p className="text-white/50 text-sm max-w-xs leading-relaxed">
					Your scorekeeper access has been temporarily suspended by
					the tournament administrator. Please reach out to them to
					regain access.
				</p>
				{profile?.email && (
					<p className="text-white/25 text-xs mt-8 font-mono">
						{profile.email}
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-editorial-bg text-editorial-ink font-sans">
			{/* ── Top bar ─────────────────────────────────────────────────── */}
			<div className="sticky top-0 z-20 bg-editorial-ink text-white border-b-4 border-editorial-gold px-4 py-3 flex items-center gap-3 flex-wrap">
				<span className="text-xs font-black uppercase tracking-widest mr-auto">
					Score Entry
					{profile?.table_number !== null && (
						<span className="ml-2 text-editorial-gold">
							· Table {profile?.table_number}
						</span>
					)}
				</span>

				{/* Phase selector */}
				<CustomSelect
					theme="dark"
					value={phase}
					options={PHASES.map((p) => ({ value: p, label: p }))}
					onChange={(v) => setPhase(v as Phase)}
				/>

				{/* Category selector */}
				<CustomSelect
					theme="dark"
					value={category}
					options={[
						{ value: "Junior", label: "Junior" },
						{ value: "Senior", label: "Senior" },
					]}
					onChange={(v) => setCategory(v as Category)}
					showSearch={false}
				/>

				{/* Table filter */}
				<CustomSelect
					theme="dark"
					value={tableFilter}
					options={[
						{ value: "all", label: "All Tables" },
						...availableTables.map((t) => ({
							value: String(t),
							label: `Table ${t}`,
						})),
					]}
					onChange={setTableFilter}
					showSearch={false}
				/>

				{/* Refresh */}
				<button
					onClick={loadMatches}
					title="Reload matches"
					className="p-1.5 hover:text-editorial-gold transition-colors"
				>
					<RefreshCw
						size={15}
						className={isLoading ? "animate-spin" : ""}
					/>
				</button>

				{/* Sign out */}
				<button
					onClick={async () => {
						await signOut();
						navigate("/login");
					}}
					title="Sign out"
					className="p-1.5 hover:text-editorial-gold transition-colors"
				>
					<LogOut size={15} />
				</button>
			</div>

			{/* ── Offline / sync banner ────────────────────────────────── */}
			{(!isOnline || pendingCount > 0) && (
				<div
					className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold ${
						isOnline
							? "bg-editorial-green/10 text-editorial-green border-b border-editorial-green/20"
							: "bg-amber-50 text-amber-800 border-b border-amber-200"
					}`}
				>
					{isOnline ? (
						isFlushing ? (
							<Loader2 size={13} className="animate-spin shrink-0" />
						) : (
							<Wifi size={13} className="shrink-0" />
						)
					) : (
						<CloudOff size={13} className="shrink-0" />
					)}
					<span>
						{!isOnline && pendingCount === 0 && "Offline — scores saved locally"}
						{!isOnline && pendingCount > 0 && `Offline · ${pendingCount} change${pendingCount !== 1 ? "s" : ""} pending`}
						{isOnline && isFlushing && `Syncing ${pendingCount} pending change${pendingCount !== 1 ? "s" : ""}…`}
						{isOnline && !isFlushing && pendingCount > 0 && `${pendingCount} change${pendingCount !== 1 ? "s" : ""} queued — will sync shortly`}
					</span>
				</div>
			)}

			{/* ── Grid ────────────────────────────────────────────────────── */}
			<div className="overflow-x-auto">
				{isLoading ? (
					<div className="flex items-center justify-center py-20 text-sm text-gray-400">
						Loading matches…
					</div>
				) : visibleMatches.length === 0 ? (
					<div className="flex items-center justify-center py-20 text-sm text-gray-400">
						No matches found for {phase} · {category}
						{tableFilter !== "all" ? ` · Table ${tableFilter}` : ""}
					</div>
				) : isQualifiers ? (
					<QualifiersGrid
						matches={visibleMatches}
						draft={draft}
						saving={saving}
						saveError={saveError}
						onChange={handleChange}
						onCommit={handleCommit}
						getLiveTotal={(m, t) => getLiveTotal(m, t, 4)}
					/>
				) : (
					<EliminationGrid
						matches={visibleMatches}
						draft={draft}
						saving={saving}
						saveError={saveError}
						activeRounds={elimActiveRounds}
						onAddRound={() =>
							setElimActiveRounds((n) => Math.min(n + 1, 4))
						}
						onRemoveRound={() =>
							setElimActiveRounds((n) => Math.max(n - 1, 1))
						}
						onChange={handleChange}
						onCommit={handleCommit}
						getLiveTotal={(m, t) =>
							getLiveTotal(m, t, elimActiveRounds)
						}
						getSuggestedWinner={getSuggestedWinner}
					/>
				)}
			</div>

			{/* ── Footer hint ──────────────────────────────────────────────── */}
			<div className="px-4 py-3 text-[10px] text-gray-400 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1">
				<span>
					<kbd className="font-mono bg-gray-100 px-1">Enter</kbd> /{" "}
					<kbd className="font-mono bg-gray-100 px-1">↓</kbd> next row
				</span>
				<span>
					<kbd className="font-mono bg-gray-100 px-1">Tab</kbd> /{" "}
					<kbd className="font-mono bg-gray-100 px-1">→</kbd> next
					cell
				</span>
				<span>
					<kbd className="font-mono bg-gray-100 px-1">↑ ↓ ← →</kbd>{" "}
					navigate
				</span>
				<span>Click out of a cell to save instantly</span>
			</div>
		</div>
	);
}

// ─── Qualifiers grid ──────────────────────────────────────────────────────────

interface QualifiersGridProps {
	matches: MatchWithTeams[];
	draft: DraftState;
	saving: Record<string, boolean>;
	saveError: Record<string, string>;
	onChange: (matchId: string, col: ScoreCol, raw: string) => void;
	onCommit: (matchId: string, col: ScoreCol, raw: string) => void;
	getLiveTotal: (match: MatchWithTeams, team: 1 | 2) => number | null;
}

function QualifiersGrid({
	matches,
	draft,
	saving,
	saveError,
	onChange,
	onCommit,
	getLiveTotal,
}: QualifiersGridProps) {
	const qualifiersResize = useEdgeColumnResize({
		columnCount: 16,
		minColumnWidth: 52,
	});

	const COL_ORDER: QualifierCol[] = [
		"team_1_r1",
		"team_1_r2",
		"team_1_r3",
		"team_1_r4",
		"team_2_r1",
		"team_2_r2",
		"team_2_r3",
		"team_2_r4",
	];

	return (
		<table
			className="w-full text-sm border-collapse [&_th:not(:last-child)]:border-r [&_th:not(:last-child)]:border-gray-200/70 [&_td:not(:last-child)]:border-r [&_td:not(:last-child)]:border-gray-200/70"
			{...qualifiersResize.tableProps}
		>
			<colgroup>
				{Array.from({ length: 16 }, (_, i) => (
					<col key={i} style={qualifiersResize.getColumnStyle(i)} />
				))}
			</colgroup>
			<thead>
				<tr className="bg-editorial-ink text-white text-[10px] uppercase tracking-widest">
					<th className="px-2 py-2 text-center font-black w-10">
						Tbl
					</th>
					{/* Team 1 block */}
					<th className="px-3 py-2 text-left font-black min-w-[140px]">
						Team 1
					</th>
					<th className="px-1 py-2 text-center font-black w-12">
						R1
					</th>
					<th className="px-1 py-2 text-center font-black w-12">
						R2
					</th>
					<th className="px-1 py-2 text-center font-black w-12">
						R3
					</th>
					<th className="px-1 py-2 text-center font-black w-12">
						R4
					</th>
					<th className="px-2 py-2 text-center font-black w-14 text-editorial-gold">
						Total
					</th>
					{/* Divider */}
					<th className="px-2 py-2 text-center font-black w-8 text-white/40">
						vs
					</th>
					{/* Team 2 block */}
					<th className="px-3 py-2 text-left font-black min-w-[140px]">
						Team 2
					</th>
					<th className="px-1 py-2 text-center font-black w-12">
						R1
					</th>
					<th className="px-1 py-2 text-center font-black w-12">
						R2
					</th>
					<th className="px-1 py-2 text-center font-black w-12">
						R3
					</th>
					<th className="px-1 py-2 text-center font-black w-12">
						R4
					</th>
					<th className="px-2 py-2 text-center font-black w-14 text-editorial-gold">
						Total
					</th>
					{/* Status */}
					<th className="px-2 py-2 text-center font-black w-14">
						Status
					</th>
				</tr>
			</thead>
			<tbody>
				{matches.map((match, rowIndex) => {
					const t1Total = getLiveTotal(match, 1);
					const t2Total = getLiveTotal(match, 2);
					const isSaving = saving[match.id];
					const hasError = saveError[match.id];

					return (
						<tr
							key={match.id}
							className={`border-b border-gray-100 transition-colors ${
								rowIndex % 2 === 0
									? "bg-white"
									: "bg-editorial-bg/50"
							} ${hasError ? "bg-red-50" : ""}`}
						>
							{/* Table number */}
							<td className="px-2 py-0 text-center">
								<span className="text-xs font-bold text-gray-500">
									{match.table_number ?? "—"}
								</span>
							</td>

							{/* Team 1 name */}
							<td className="px-3 py-1.5">
								<span className="text-sm font-semibold truncate block max-w-[160px]">
									{match.team_1?.team_name ?? (
										<span className="text-gray-300 font-normal italic">
											Empty slot
										</span>
									)}
								</span>
							</td>

							{/* Team 1 rounds */}
							{(
								[
									"team_1_r1",
									"team_1_r2",
									"team_1_r3",
									"team_1_r4",
								] as QualifierCol[]
							).map((col, colOffset) => (
								<td
									key={col}
									className="px-0 py-0 h-px border-l border-gray-100 hover:bg-editorial-gold/20 transition-colors"
								>
									<ScoreCell
										matchId={match.id}
										col={col}
										value={match[col] as number | null}
										draft={draft[match.id]?.[col]}
										rowIndex={rowIndex}
										colIndex={colOffset}
										totalCols={COL_ORDER.length}
										totalRows={matches.length}
										onChange={onChange}
										onCommit={onCommit}
									/>
								</td>
							))}

							{/* Team 1 live total */}
							<td className="px-2 py-1 text-center border-l border-gray-100">
								<span
									className={`text-sm font-black font-mono ${
										t1Total !== null
											? "text-editorial-green"
											: "text-gray-300"
									}`}
								>
									{t1Total !== null ? t1Total : "—"}
								</span>
							</td>

							{/* vs divider */}
							<td className="px-2 py-1 text-center text-gray-300 font-bold text-xs">
								vs
							</td>

							{/* Team 2 name */}
							<td className="px-3 py-1.5">
								<span className="text-sm font-semibold truncate block max-w-[160px]">
									{match.team_2?.team_name ?? (
										<span className="text-gray-300 font-normal italic">
											Empty slot
										</span>
									)}
								</span>
							</td>

							{/* Team 2 rounds */}
							{(
								[
									"team_2_r1",
									"team_2_r2",
									"team_2_r3",
									"team_2_r4",
								] as QualifierCol[]
							).map((col, colOffset) => (
								<td
									key={col}
									className="px-0 py-0 h-px border-l border-gray-100 hover:bg-editorial-gold/20 transition-colors"
								>
									<ScoreCell
										matchId={match.id}
										col={col}
										value={match[col] as number | null}
										draft={draft[match.id]?.[col]}
										rowIndex={rowIndex}
										colIndex={colOffset + 4}
										totalCols={COL_ORDER.length}
										totalRows={matches.length}
										onChange={onChange}
										onCommit={onCommit}
									/>
								</td>
							))}

							{/* Team 2 live total */}
							<td className="px-2 py-1 text-center border-l border-gray-100">
								<span
									className={`text-sm font-black font-mono ${
										t2Total !== null
											? "text-editorial-green"
											: "text-gray-300"
									}`}
								>
									{t2Total !== null ? t2Total : "—"}
								</span>
							</td>

							{/* Status */}
							<td className="px-2 py-1 text-center">
								{isSaving ? (
									<span className="text-[10px] font-semibold text-editorial-gold animate-pulse">
										saving…
									</span>
								) : hasError ? (
									<span
										title={hasError}
										className="text-[10px] font-semibold text-red-500 cursor-help"
									>
										error
									</span>
								) : (
									<span className="text-[10px] text-gray-300">
										✓
									</span>
								)}
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

// ─── Elimination grid ─────────────────────────────────────────────────────────

interface EliminationGridProps {
	matches: MatchWithTeams[];
	draft: DraftState;
	saving: Record<string, boolean>;
	saveError: Record<string, string>;
	activeRounds: number;
	onAddRound: () => void;
	onRemoveRound: () => void;
	onChange: (matchId: string, col: ScoreCol, raw: string) => void;
	onCommit: (matchId: string, col: ScoreCol, raw: string) => void;
	getLiveTotal: (match: MatchWithTeams, team: 1 | 2) => number | null;
	getSuggestedWinner: (match: MatchWithTeams) => string | null;
}

function EliminationGrid({
	matches,
	draft,
	saving,
	saveError,
	activeRounds,
	onAddRound,
	onRemoveRound,
	onChange,
	onCommit,
	getLiveTotal,
	getSuggestedWinner,
}: EliminationGridProps) {
	const eliminationResize = useEdgeColumnResize({
		columnCount: 17,
		minColumnWidth: 52,
	});

	const T1_COLS = (
		["team_1_r1", "team_1_r2", "team_1_r3", "team_1_r4"] as QualifierCol[]
	).slice(0, activeRounds);
	const T2_COLS = (
		["team_2_r1", "team_2_r2", "team_2_r3", "team_2_r4"] as QualifierCol[]
	).slice(0, activeRounds);
	const totalCols = activeRounds * 2;
	const ROUND_LABELS = ["R1", "R2", "R3", "R4"].slice(0, activeRounds);

	return (
		<table
			className="w-full text-sm border-collapse [&_th:not(:last-child)]:border-r [&_th:not(:last-child)]:border-gray-200/70 [&_td:not(:last-child)]:border-r [&_td:not(:last-child)]:border-gray-200/70"
			{...eliminationResize.tableProps}
		>
			<colgroup>
				{Array.from({ length: 17 }, (_, i) => (
					<col key={i} style={eliminationResize.getColumnStyle(i)} />
				))}
			</colgroup>
			<thead>
				<tr className="bg-editorial-ink text-white text-[10px] uppercase tracking-widest">
					<th className="px-3 py-2 text-left font-black w-6">#</th>
					<th className="px-2 py-2 text-center font-black w-10">
						Tbl
					</th>
					{/* Team 1 block */}
					<th className="px-3 py-2 text-left font-black min-w-[140px]">
						Team 1
					</th>
					{ROUND_LABELS.map((label, i) => (
						<th
							key={`t1-${label}`}
							className="px-1 py-2 text-center font-black w-12"
						>
							{label}
							{i === activeRounds - 1 && activeRounds > 1 && (
								<button
									onClick={onRemoveRound}
									className="ml-0.5 text-white/50 hover:text-red-400 transition-colors text-[9px]"
									title={`Remove ${label}`}
								>
									×
								</button>
							)}
						</th>
					))}
					{activeRounds < 4 && (
						<th className="px-1 py-2 w-12">
							<button
								onClick={onAddRound}
								className="text-editorial-gold hover:text-white transition-colors text-[9px] font-bold uppercase tracking-widest"
								title="Add round column"
							>
								+R{activeRounds + 1}
							</button>
						</th>
					)}
					<th className="px-2 py-2 text-center font-black w-14 text-editorial-gold">
						Total
					</th>
					<th className="px-2 py-2 text-center font-black w-8 text-white/40">
						vs
					</th>
					{/* Team 2 block */}
					<th className="px-3 py-2 text-left font-black min-w-[140px]">
						Team 2
					</th>
					{ROUND_LABELS.map((label) => (
						<th
							key={`t2-${label}`}
							className="px-1 py-2 text-center font-black w-12"
						>
							{label}
						</th>
					))}
					{activeRounds < 4 && <th className="px-1 py-2 w-12" />}
					<th className="px-2 py-2 text-center font-black w-14 text-editorial-gold">
						Total
					</th>
					<th className="px-3 py-2 text-left font-black min-w-[140px]">
						Winner
					</th>
					<th className="px-2 py-2 text-center font-black w-14">
						Status
					</th>
				</tr>
			</thead>
			<tbody>
				{matches.map((match, rowIndex) => {
					const t1Total = getLiveTotal(match, 1);
					const t2Total = getLiveTotal(match, 2);
					const suggestedWinner = getSuggestedWinner(match);
					const confirmedWinner = match.winner?.team_name ?? null;
					const isSaving = saving[match.id];
					const hasError = saveError[match.id];
					const t1IsAhead = (t1Total ?? 0) > (t2Total ?? 0);
					const t2IsAhead = (t2Total ?? 0) > (t1Total ?? 0);

					return (
						<tr
							key={match.id}
							className={`border-b border-gray-100 transition-colors ${
								rowIndex % 2 === 0
									? "bg-white"
									: "bg-editorial-bg/50"
							} ${hasError ? "bg-red-50" : ""}`}
						>
							<td className="px-3 py-0 text-gray-400 font-mono text-xs">
								{rowIndex + 1}
							</td>
							<td className="px-2 py-0 text-center">
								<span className="text-xs font-bold text-gray-500">
									{match.table_number ?? "—"}
								</span>
							</td>
							{/* Team 1 name */}
							<td className="px-3 py-1.5">
								<span
									className={`text-sm font-semibold truncate block max-w-[160px] ${t1IsAhead ? "text-editorial-green" : ""}`}
								>
									{match.team_1?.team_name ?? (
										<span className="text-gray-300 font-normal italic">
											Empty slot
										</span>
									)}
								</span>
							</td>
							{/* Team 1 round cells */}
							{T1_COLS.map((col, colOffset) => (
								<td
									key={col}
									className="px-0 py-0 h-px border-l border-gray-100 hover:bg-editorial-gold/20 transition-colors"
								>
									<ScoreCell
										matchId={match.id}
										col={col}
										value={match[col] as number | null}
										draft={draft[match.id]?.[col]}
										rowIndex={rowIndex}
										colIndex={colOffset}
										totalCols={totalCols}
										totalRows={matches.length}
										onChange={onChange}
										onCommit={onCommit}
									/>
								</td>
							))}
							{activeRounds < 4 && <td />}
							{/* Team 1 total */}
							<td className="px-2 py-1 text-center border-l border-gray-100">
								<span
									className={`text-sm font-black font-mono ${t1Total !== null ? "text-editorial-green" : "text-gray-300"}`}
								>
									{t1Total !== null ? t1Total : "—"}
								</span>
							</td>
							{/* vs */}
							<td className="px-2 py-1 text-center text-gray-300 font-bold text-xs">
								vs
							</td>
							{/* Team 2 name */}
							<td className="px-3 py-1.5">
								<span
									className={`text-sm font-semibold truncate block max-w-[160px] ${t2IsAhead ? "text-editorial-green" : ""}`}
								>
									{match.team_2?.team_name ?? (
										<span className="text-gray-300 font-normal italic">
											Empty slot
										</span>
									)}
								</span>
							</td>
							{/* Team 2 round cells */}
							{T2_COLS.map((col, colOffset) => (
								<td
									key={col}
									className="px-0 py-0 h-px border-l border-gray-100 hover:bg-editorial-gold/20 transition-colors"
								>
									<ScoreCell
										matchId={match.id}
										col={col}
										value={match[col] as number | null}
										draft={draft[match.id]?.[col]}
										rowIndex={rowIndex}
										colIndex={colOffset + activeRounds}
										totalCols={totalCols}
										totalRows={matches.length}
										onChange={onChange}
										onCommit={onCommit}
									/>
								</td>
							))}
							{activeRounds < 4 && <td />}
							{/* Team 2 total */}
							<td className="px-2 py-1 text-center border-l border-gray-100">
								<span
									className={`text-sm font-black font-mono ${t2Total !== null ? "text-editorial-green" : "text-gray-300"}`}
								>
									{t2Total !== null ? t2Total : "—"}
								</span>
							</td>
							{/* Suggested winner */}
							<td className="px-3 py-1">
								{confirmedWinner ? (
									<span className="text-xs font-black text-editorial-green uppercase tracking-wide">
										✓ {confirmedWinner}
									</span>
								) : suggestedWinner ? (
									<span className="text-xs font-semibold text-editorial-gold">
										→ {suggestedWinner}
									</span>
								) : (
									<span className="text-xs text-gray-300">
										—
									</span>
								)}
							</td>
							{/* Status */}
							<td className="px-2 py-1 text-center">
								{isSaving ? (
									<span className="text-[10px] font-semibold text-editorial-gold animate-pulse">
										saving…
									</span>
								) : hasError ? (
									<span
										title={hasError}
										className="text-[10px] font-semibold text-red-500 cursor-help"
									>
										error
									</span>
								) : (
									<span className="text-[10px] text-gray-300">
										✓
									</span>
								)}
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
