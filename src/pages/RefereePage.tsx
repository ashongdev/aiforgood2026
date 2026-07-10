import {
	CloudOff,
	Loader2,
	Lock,
	LogOut,
	Minus,
	Plus,
	RefreshCw,
	UserX,
	Wifi,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { CustomSelect } from "../components/CustomSelect";
import { useAuth } from "../contexts/AuthContext";
import { useOfflineQueue } from "../hooks/useOfflineQueue";
import type { Category, MatchWithTeams, Phase } from "../lib/database.types";
import { tc } from "../lib/format";
import {
	ALL_SCORING_ITEMS,
	EMPTY_BREAKDOWN,
	MISSION_1_ITEMS,
	MISSION_2_ITEMS,
	PENALTY_ITEMS,
	breakdownKey,
	computeRoundScore,
	type RoundBreakdown,
	type ScoringItem,
} from "../lib/scoring";
import { getCountryFlag } from "../lib/countryFlag";
import { supabase } from "../lib/supabase";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PHASES: Phase[] = [
	"Qualifiers",
	"Quarterfinals",
	"Semifinals",
	"Third Place",
	"Finals",
];

const ROUND_COLS = [
	"team_1_r1",
	"team_1_r2",
	"team_1_r3",
	"team_1_r4",
	"team_2_r1",
	"team_2_r2",
	"team_2_r3",
	"team_2_r4",
] as const;
type ScoreCol = (typeof ROUND_COLS)[number];

function calcFinalPoints(
	r1: number | null,
	r2: number | null,
	r3: number | null,
	r4: number | null,
): number | null {
	const vals = [r1, r2, r3, r4].filter((v): v is number => v !== null);
	return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
}

// ─── Qualifier round pairing helpers ─────────────────────────────────────────
// R1 comes from the DB. R2-R4 pairings are computed live from standings.

type QualTeam = {
	id: string;
	name: string;
	country: string | null;
	score: number;
};
type QualPairing = {
	rank1: number;
	t1: QualTeam;
	t2: QualTeam | null;
	rank2: number;
};

function computeQualScores(
	matches: MatchWithTeams[],
	upToRound: 1 | 2 | 3,
): QualTeam[] {
	const map = new Map<string, QualTeam>();
	function add(
		id: string | null,
		team: { team_name: string; country?: string | null } | null,
		scores: (number | null)[],
	) {
		if (!id || !team) return;
		const total = scores
			.slice(0, upToRound)
			.filter((v): v is number => v !== null)
			.reduce((a, b) => a + b, 0);
		const e = map.get(id) ?? {
			id,
			name: tc(team.team_name),
			country: team.country ?? null,
			score: 0,
		};
		e.score += total;
		map.set(id, e);
	}
	for (const m of matches) {
		add(m.team_1_id, m.team_1, [m.team_1_r1, m.team_1_r2, m.team_1_r3]);
		add(m.team_2_id, m.team_2, [m.team_2_r1, m.team_2_r2, m.team_2_r3]);
	}
	return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

function buildQualPairings(teams: QualTeam[]): QualPairing[] {
	const pairs: QualPairing[] = [];
	const n = teams.length;
	for (let i = 0; i < Math.floor(n / 2); i++) {
		pairs.push({
			rank1: i + 1,
			t1: teams[i],
			t2: teams[n - 1 - i],
			rank2: n - i,
		});
	}
	if (n % 2 === 1) {
		const mid = Math.floor(n / 2);
		pairs.push({ rank1: mid + 1, t1: teams[mid], t2: null, rank2: 0 });
	}
	return pairs;
}

// ─── Scoring item counter row ─────────────────────────────────────────────────

function ScoringRow({
	item,
	count,
	category,
	onChange,
}: {
	item: ScoringItem;
	count: number;
	category: Category;
	onChange: (delta: 1 | -1) => void;
}) {
	const pts = item.pts(category);
	const contribution = count * pts;
	const ptsColor =
		pts > 0
			? "text-emerald-600"
			: pts < 0
				? "text-red-500"
				: "text-gray-300";
	const ptsBg =
		pts > 0
			? "bg-emerald-50 border-emerald-200"
			: pts < 0
				? "bg-red-50 border-red-200"
				: "bg-gray-50 border-gray-200";
	const contribColor =
		contribution > 0
			? "text-emerald-600"
			: contribution < 0
				? "text-red-500"
				: "text-gray-300";

	return (
		<div className="flex items-center gap-2 py-1.5">
			{/* Icon + label */}
			<span className="text-sm leading-none w-5 shrink-0 text-center">
				{item.icon}
			</span>
			<div className="flex-1 min-w-0">
				<span className="text-sm text-editorial-ink leading-tight">
					{item.label}
				</span>
			</div>

			{/* Points badge */}
			<span
				className={`text-[10px] font-black border px-1.5 py-0.5 shrink-0 ${ptsBg} ${ptsColor}`}
			>
				{pts > 0 ? `+${pts}` : pts}
			</span>

			{/* Counter */}
			<div className="flex items-center gap-0 shrink-0">
				<button
					onPointerDown={(e) => {
						e.preventDefault();
						if (count > 0) onChange(-1);
					}}
					disabled={count <= 0}
					className="w-10 h-10 flex items-center justify-center rounded-l-xl bg-gray-100 active:bg-gray-200 disabled:opacity-30 transition-colors select-none"
				>
					<Minus size={16} />
				</button>
				<span
					className={`w-10 h-10 flex items-center justify-center text-lg font-black border-y border-gray-200 bg-white select-none ${contribColor}`}
				>
					{count}
				</span>
				<button
					onPointerDown={(e) => {
						e.preventDefault();
						if (count < item.max) onChange(1);
					}}
					disabled={count >= item.max}
					className="w-10 h-10 flex items-center justify-center rounded-r-xl bg-gray-100 active:bg-gray-200 disabled:opacity-30 transition-colors select-none"
				>
					<Plus size={16} />
				</button>
			</div>
		</div>
	);
}

// ─── Scoring panel ─────────────────────────────────────────────────────────────

interface ScoringPanelProps {
	teamName: string;
	roundLabel: string;
	category: Category;
	initialBreakdown: RoundBreakdown;
	initialAbsent: boolean;
	isSaving: boolean;
	onSave: (breakdown: RoundBreakdown, total: number, absent: boolean) => void;
	onClose: () => void;
}

function ScoringPanel({
	teamName,
	roundLabel,
	category,
	initialBreakdown,
	initialAbsent,
	isSaving,
	onSave,
	onClose,
}: ScoringPanelProps) {
	const [breakdown, setBreakdown] = useState<RoundBreakdown>({
		...initialBreakdown,
	});
	const [absent, setAbsent] = useState(initialAbsent);

	function adjust(key: keyof RoundBreakdown, delta: 1 | -1) {
		setBreakdown((prev) => ({
			...prev,
			[key]: Math.max(0, prev[key] + delta),
		}));
	}

	const total = absent ? 0 : computeRoundScore(breakdown, category);
	const totalColor = absent
		? "text-amber-600"
		: total > 0
			? "text-emerald-600"
			: total < 0
				? "text-red-500"
				: "text-editorial-ink";

	const sections = [
		{
			title: "Mission 1 — Cultivation & Irrigation",
			items: MISSION_1_ITEMS,
		},
		{ title: "Mission 2 — Harvesting & Sorting", items: MISSION_2_ITEMS },
		{ title: "Penalties", items: PENALTY_ITEMS },
	] as const;

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-end"
			onClick={onClose}
		>
			<div className="absolute inset-0 bg-black/50" />
			<div
				className="relative bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]"
				onClick={(e) => e.stopPropagation()}
				style={{
					maxWidth: 480,
					marginLeft: "auto",
					marginRight: "auto",
					width: "100%",
				}}
			>
				{/* Header */}
				<div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-gray-100">
					<div>
						<p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
							{roundLabel}
						</p>
						<h2 className="text-lg font-black text-editorial-ink leading-tight">
							{teamName}
						</h2>
					</div>
					<div className="flex items-center gap-3">
						<div className="text-right">
							<p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
								Total
							</p>
							<p
								className={`text-2xl font-black font-mono leading-none ${totalColor}`}
							>
								{total}
							</p>
						</div>
						<button
							onClick={onClose}
							className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* Absent toggle */}
				<button
					onClick={() => setAbsent((v) => !v)}
					className={`flex items-center gap-3 px-4 py-3 border-b transition-colors text-left ${
						absent
							? "bg-amber-50 border-amber-200"
							: "bg-white border-gray-100 hover:bg-gray-50"
					}`}
				>
					<span
						className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${absent ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"}`}
					>
						<UserX size={16} />
					</span>
					<span className="flex-1">
						<span
							className={`block text-sm font-black ${absent ? "text-amber-800" : "text-editorial-ink"}`}
						>
							Team Did Not Show Up
						</span>
						<span className="block text-[11px] text-gray-500 leading-tight">
							Forfeits this round · counts as an absence for
							ranking
						</span>
					</span>
					<span
						className={`w-11 h-6 rounded-full shrink-0 transition-colors relative ${absent ? "bg-amber-500" : "bg-gray-200"}`}
					>
						<span
							className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${absent ? "translate-x-5" : "translate-x-0.5"}`}
						/>
					</span>
				</button>

				{/* Scrollable body */}
				<div
					className={`overflow-y-auto flex-1 px-4 py-2 ${absent ? "opacity-40 pointer-events-none" : ""}`}
				>
					{sections.map(({ title, items }) => {
						const sectionTotal = items.reduce(
							(s, item) =>
								s + breakdown[item.key] * item.pts(category),
							0,
						);
						const hasPts = sectionTotal !== 0;
						return (
							<div key={title} className="mb-4">
								<div className="flex items-center justify-between mb-1">
									<p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
										{title}
									</p>
									{hasPts && (
										<span
											className={`text-xs font-black ${sectionTotal > 0 ? "text-emerald-600" : "text-red-500"}`}
										>
											{sectionTotal > 0
												? `+${sectionTotal}`
												: sectionTotal}
										</span>
									)}
								</div>
								<div className="divide-y divide-gray-50">
									{items.map((item) => (
										<div key={item.key}>
											<ScoringRow
												item={item}
												count={breakdown[item.key]}
												category={category}
												onChange={(delta) =>
													adjust(item.key, delta)
												}
											/>
											{item.key === "m1_seeds_correct" && (
												<div className="ml-7 mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-400">
													<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-400 shrink-0" />Small → grey plot</span>
													<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 shrink-0" />Medium → green plot</span>
													<span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400 shrink-0" />Large → orange plot</span>
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						);
					})}

					{/* Running total summary */}
					<div className="mb-4 pt-3 border-t border-gray-200">
						<div className="flex items-center justify-between">
							<span className="text-sm font-black uppercase tracking-widest text-gray-500">
								Round Total
							</span>
							<span
								className={`text-3xl font-black font-mono ${totalColor}`}
							>
								{total}
							</span>
						</div>
						{ALL_SCORING_ITEMS.filter(
							(i) => breakdown[i.key] > 0,
						).map((item) => {
							const pts = item.pts(category);
							const contribution = breakdown[item.key] * pts;
							if (contribution === 0) return null;
							return (
								<div
									key={item.key}
									className="flex items-center justify-between text-xs text-gray-500 mt-0.5"
								>
									<span>
										{item.icon} {item.label} ×{" "}
										{breakdown[item.key]}
									</span>
									<span
										className={
											contribution > 0
												? "text-emerald-600"
												: "text-red-500"
										}
									>
										{contribution > 0
											? `+${contribution}`
											: contribution}
									</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* Footer */}
				<div className="border-t border-gray-100 px-4 py-3 flex gap-3">
					<button
						onClick={onClose}
						className="flex-1 h-14 rounded-xl border-2 border-gray-200 font-black text-gray-500 active:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={() => onSave(breakdown, total, absent)}
						disabled={isSaving}
						className={`flex-2 h-14 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-colors px-6 ${
							isSaving
								? "bg-editorial-gold/60"
								: absent
									? "bg-amber-600 active:bg-amber-700"
									: "bg-editorial-ink active:bg-editorial-gold active:text-editorial-ink"
						}`}
					>
						{isSaving ? (
							<Loader2 size={18} className="animate-spin" />
						) : null}
						{isSaving
							? "Saving…"
							: absent
								? "Save — Mark Absent"
								: `Save  ${total > 0 ? "+" : ""}${total} pts`}
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Round score button ─────────────────────────────────────────────────────────

function RoundBtn({
	roundNum,
	value,
	hasBreakdown,
	absent,
	readOnly,
	onTap,
}: {
	roundNum: number;
	value: number | null;
	hasBreakdown: boolean;
	absent: boolean;
	readOnly: boolean;
	onTap: () => void;
}) {
	return (
		<button
			disabled={readOnly}
			onClick={onTap}
			className={`flex flex-col items-center justify-center gap-0.5 min-h-[60px] rounded-xl border-2 transition-colors select-none ${
				readOnly
					? "border-gray-100 bg-gray-50 cursor-not-allowed"
					: absent
						? "border-amber-400 bg-amber-50 active:bg-amber-100"
						: hasBreakdown
							? "border-editorial-gold bg-editorial-gold/10 active:bg-editorial-gold/20"
							: "border-gray-200 bg-white active:bg-editorial-gold/10"
			}`}
		>
			<span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
				R{roundNum}
			</span>
			{absent ? (
				<span className="text-sm font-black font-mono leading-none text-amber-700">
					ABS
				</span>
			) : (
				<span
					className={`text-xl font-black font-mono leading-none ${
						value !== null ? "text-editorial-ink" : "text-gray-200"
					}`}
				>
					{value ?? "—"}
				</span>
			)}
			{hasBreakdown && !absent && (
				<span className="text-[8px] text-editorial-gold font-bold tracking-wide">
					scored
				</span>
			)}
			{absent && (
				<span className="text-[8px] text-amber-600 font-bold tracking-wide">
					absent
				</span>
			)}
		</button>
	);
}

// ─── Dynamic pairing card (R2–R4) — same layout as MatchCard ─────────────────

interface DynamicPairingCardProps {
	pairing: QualPairing;
	round: 2 | 3 | 4;
	t1Score: number | null;
	t2Score: number | null;
	t1Absent: boolean;
	t2Absent: boolean;
	t1HasBreakdown: boolean;
	t2HasBreakdown: boolean;
	readOnly: boolean;
	onScoreTeam: (teamId: string, teamName: string) => void;
}

function DynamicPairingCard({
	pairing,
	round,
	t1Score,
	t2Score,
	t1Absent,
	t2Absent,
	t1HasBreakdown,
	t2HasBreakdown,
	readOnly,
	onScoreTeam,
}: DynamicPairingCardProps) {
	const { t1, t2 } = pairing;
	const t1Ahead =
		(t1Score ?? 0) > (t2Score ?? 0) &&
		(t1Score !== null || t2Score !== null);
	const t2Ahead =
		(t2Score ?? 0) > (t1Score ?? 0) &&
		(t1Score !== null || t2Score !== null);

	return (
		<div className="rounded-2xl border-2 border-gray-200 overflow-hidden bg-white shadow-sm">
			{/* Header */}
			<div className="bg-editorial-ink text-white px-4 py-2 flex items-center justify-between">
				<span className="text-[10px] font-black uppercase tracking-widest text-white/60">
					Qualifiers
				</span>
			</div>

			{/* Team 1 */}
			<div
				className={`px-4 pt-4 pb-3 ${t1Ahead ? "bg-emerald-50/40" : ""}`}
			>
				<div className="flex items-center justify-between mb-2">
					<div>
						<span
							className={`text-lg font-black leading-tight ${t1Ahead ? "text-emerald-700" : "text-editorial-ink"}`}
						>
							{t1.name}
						</span>
						{(getCountryFlag(t1.country) || t1.country) && (
							<span className="flex items-center gap-1 mt-0.5">
								{getCountryFlag(t1.country) && <span className="text-sm leading-none">{getCountryFlag(t1.country)}</span>}
								{t1.country && <span className="text-[10px] text-gray-400">{t1.country}</span>}
							</span>
						)}
					</div>
					<span
						className={`text-2xl font-black font-mono ${t1Score !== null ? "text-emerald-600" : "text-gray-200"}`}
					>
						{t1Absent ? "ABS" : (t1Score ?? "—")}
					</span>
				</div>
				<div className="grid grid-cols-1 gap-2">
					<RoundBtn
						roundNum={round}
						value={t1Score}
						hasBreakdown={t1HasBreakdown}
						absent={t1Absent}
						readOnly={readOnly}
						onTap={() => onScoreTeam(t1.id, t1.name)}
					/>
				</div>
			</div>

			{/* VS divider */}
			<div className="flex items-center gap-3 px-4 py-1">
				<div className="flex-1 h-px bg-gray-100" />
				<span className="text-xs font-bold text-gray-300">vs</span>
				<div className="flex-1 h-px bg-gray-100" />
			</div>

			{/* Team 2 */}
			<div
				className={`px-4 pt-2 pb-4 ${t2Ahead ? "bg-emerald-50/40" : ""}`}
			>
				<div className="grid grid-cols-1 gap-2 mb-2">
					{t2 ? (
						<RoundBtn
							roundNum={round}
							value={t2Score}
							hasBreakdown={t2HasBreakdown}
							absent={t2Absent}
							readOnly={readOnly}
							onTap={() => onScoreTeam(t2.id, t2.name)}
						/>
					) : (
						<p className="text-sm text-gray-300 italic text-center py-2">
							BYE
						</p>
					)}
				</div>
				<div className="flex items-center justify-between">
					<div>
						<span
							className={`text-lg font-black leading-tight ${t2Ahead ? "text-emerald-700" : "text-editorial-ink"}`}
						>
							{t2 ? (
								t2.name
							) : (
								<span className="font-normal italic text-gray-300 text-base">
									BYE
								</span>
							)}
						</span>
						{t2 && (getCountryFlag(t2.country) || t2.country) && (
							<span className="flex items-center gap-1 mt-0.5">
								{getCountryFlag(t2.country) && <span className="text-sm leading-none">{getCountryFlag(t2.country)}</span>}
								{t2.country && <span className="text-[10px] text-gray-400">{t2.country}</span>}
							</span>
						)}
					</div>
					{t2 && (
						<span
							className={`text-2xl font-black font-mono ${t2Score !== null ? "text-emerald-600" : "text-gray-200"}`}
						>
							{t2Absent ? "ABS" : (t2Score ?? "—")}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Match card ────────────────────────────────────────────────────────────────

interface MatchCardProps {
	match: MatchWithTeams;
	category: Category;
	activeRounds: number;
	readOnly: boolean;
	saveError?: string;
	onRoundTap: (matchId: string, teamSlot: 1 | 2, roundNum: number) => void;
}


function MatchCard({
	match,
	activeRounds,
	readOnly,
	saveError,
	onRoundTap,
}: MatchCardProps) {
	const breakdown = (match.score_breakdown ?? {}) as Record<
		string,
		Record<string, number>
	>;

	const rounds = Array.from({ length: activeRounds }, (_, i) => i + 1);

	// Compute totals using same access pattern as round buttons
	const sumRoundCols = (team: 1 | 2): number | null => {
		const vals = rounds
			.map(
				(r) =>
					match[`team_${team}_r${r}` as keyof MatchWithTeams] as
						| number
						| null,
			)
			.filter((v): v is number => v !== null);
		return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
	};
	const t1Total = sumRoundCols(1);
	const t2Total = sumRoundCols(2);
	const t1Ahead =
		(t1Total ?? 0) > (t2Total ?? 0) &&
		(t1Total !== null || t2Total !== null);
	const t2Ahead =
		(t2Total ?? 0) > (t1Total ?? 0) &&
		(t1Total !== null || t2Total !== null);

	return (
		<div
			className={`rounded-2xl border-2 overflow-hidden bg-white shadow-sm ${saveError ? "border-red-300" : "border-gray-200"}`}
		>
			{/* Header */}
			<div className="bg-editorial-ink text-white px-4 py-2 flex items-center justify-between">
				<span className="text-[10px] font-black uppercase tracking-widest text-white/60">
					{match.table_number
						? `Table ${match.table_number}`
						: match.phase}
				</span>
				{saveError && (
					<span className="text-[10px] text-red-300 font-semibold">
						{saveError}
					</span>
				)}
			</div>

			{/* Team 1 */}
			<div
				className={`px-4 pt-4 pb-3 ${t1Ahead ? "bg-emerald-50/40" : ""}`}
			>
				<div className="flex items-center justify-between mb-2">
					<div>
						<span
							className={`text-lg font-black leading-tight ${t1Ahead ? "text-emerald-700" : "text-editorial-ink"}`}
						>
							{tc(match.team_1?.team_name) || (
								<span className="font-normal italic text-gray-300 text-base">
									Empty slot
								</span>
							)}
						</span>
						{(() => {
							const t1 = match.team_1 as { country?: string | null; booth_number?: number | null } | null;
							return (<>
								{(getCountryFlag(t1?.country) || t1?.country) && (
									<span className="flex items-center gap-1 mt-0.5">
										{getCountryFlag(t1?.country) && <span className="text-sm leading-none">{getCountryFlag(t1?.country)}</span>}
										{t1?.country && <span className="text-[10px] text-gray-400">{t1.country}</span>}
									</span>
								)}
								{t1?.booth_number && <span className="block text-[10px] font-mono text-gray-400">Booth #{t1.booth_number}</span>}
							</>);
						})()}
					</div>
					<span
						className={`text-2xl font-black font-mono ${t1Total !== null ? "text-emerald-600" : "text-gray-200"}`}
					>
						{t1Total ?? "—"}
					</span>
				</div>
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: `repeat(${activeRounds}, 1fr)`,
					}}
				>
					{rounds.map((r) => (
						<RoundBtn
							key={r}
							roundNum={r}
							value={
								(match[
									`team_1_r${r}` as keyof MatchWithTeams
								] as number | null) ?? null
							}
							hasBreakdown={
								!!breakdown[breakdownKey(1, r as 1 | 2 | 3 | 4)]
							}
							absent={
								!!match[
									`team_1_r${r}_absent` as keyof MatchWithTeams
								]
							}
							readOnly={readOnly || !match.team_1}
							onTap={() => onRoundTap(match.id, 1, r)}
						/>
					))}
				</div>
			</div>

			{/* VS divider */}
			<div className="flex items-center gap-3 px-4 py-1">
				<div className="flex-1 h-px bg-gray-100" />
				<span className="text-xs font-bold text-gray-300">vs</span>
				<div className="flex-1 h-px bg-gray-100" />
			</div>

			{/* Team 2 */}
			<div
				className={`px-4 pt-2 pb-4 ${t2Ahead ? "bg-emerald-50/40" : ""}`}
			>
				<div
					className="grid gap-2 mb-2"
					style={{
						gridTemplateColumns: `repeat(${activeRounds}, 1fr)`,
					}}
				>
					{rounds.map((r) => (
						<RoundBtn
							key={r}
							roundNum={r}
							value={
								(match[
									`team_2_r${r}` as keyof MatchWithTeams
								] as number | null) ?? null
							}
							hasBreakdown={
								!!breakdown[breakdownKey(2, r as 1 | 2 | 3 | 4)]
							}
							absent={
								!!match[
									`team_2_r${r}_absent` as keyof MatchWithTeams
								]
							}
							readOnly={readOnly || !match.team_2}
							onTap={() => onRoundTap(match.id, 2, r)}
						/>
					))}
				</div>
				<div className="flex items-center justify-between">
					<div>
						<span
							className={`text-lg font-black leading-tight ${t2Ahead ? "text-emerald-700" : "text-editorial-ink"}`}
						>
							{tc(match.team_2?.team_name) || (
								<span className="font-normal italic text-gray-300 text-base">
									Empty slot
								</span>
							)}
						</span>
						{(() => {
							const t2 = match.team_2 as { country?: string | null; booth_number?: number | null } | null;
							return (<>
								{(getCountryFlag(t2?.country) || t2?.country) && (
									<span className="flex items-center gap-1 mt-0.5">
										{getCountryFlag(t2?.country) && <span className="text-sm leading-none">{getCountryFlag(t2?.country)}</span>}
										{t2?.country && <span className="text-[10px] text-gray-400">{t2.country}</span>}
									</span>
								)}
								{t2?.booth_number && <span className="block text-[10px] font-mono text-gray-400">Booth #{t2.booth_number}</span>}
							</>);
						})()}
					</div>
					<span
						className={`text-2xl font-black font-mono ${t2Total !== null ? "text-emerald-600" : "text-gray-200"}`}
					>
						{t2Total ?? "—"}
					</span>
				</div>
			</div>
		</div>
	);
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function RefereePage() {
	const { profile, isLoading: authLoading, signOut } = useAuth();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	// ── Filter state (URL-persisted) ─────────────────────────────────────────

	const phase: Phase = PHASES.includes(searchParams.get("phase") as Phase)
		? (searchParams.get("phase") as Phase)
		: ((localStorage.getItem("ref_phase") as Phase | null) ?? "Qualifiers");
	const category: Category = (["Junior", "Senior"] as Category[]).includes(
		searchParams.get("category") as Category,
	)
		? (searchParams.get("category") as Category)
		: ((localStorage.getItem("ref_category") as Category | null) ??
			"Junior");
	const tableFilter: string =
		searchParams.get("table") ??
		localStorage.getItem("ref_table") ??
		(profile?.table_number != null ? String(profile.table_number) : "all");

	function setPhase(p: Phase) {
		setSearchParams(
			(prev) => {
				const n = new URLSearchParams(prev);
				n.set("phase", p);
				return n;
			},
			{ replace: true },
		);
		localStorage.setItem("ref_phase", p);
	}
	function setCategory(c: Category) {
		setSearchParams(
			(prev) => {
				const n = new URLSearchParams(prev);
				n.set("category", c);
				return n;
			},
			{ replace: true },
		);
		localStorage.setItem("ref_category", c);
	}
	function setTableFilter(t: string) {
		setSearchParams(
			(prev) => {
				const n = new URLSearchParams(prev);
				n.set("table", t);
				return n;
			},
			{ replace: true },
		);
		localStorage.setItem("ref_table", t);
	}

	// ── Data state ───────────────────────────────────────────────────────────

	const [matches, setMatches] = useState<MatchWithTeams[]>([]);
	const [saving, setSaving] = useState<Record<string, boolean>>({});
	const [saveError, setSaveError] = useState<Record<string, string>>({});
	const [isLoading, setIsLoading] = useState(true);
	const [elimActiveRounds, setElimActiveRounds] = useState(1);

	const { isOnline, pendingCount, isFlushing } = useOfflineQueue(loadMatches);

	// ── Lock state ────────────────────────────────────────────────────────────

	const [isLocked, setIsLocked] = useState(() => profile?.locked ?? false);
	useEffect(() => {
		if (profile) setIsLocked(profile.locked ?? false);
	}, [profile?.id]);

	useEffect(() => {
		if (!profile?.id) return;
		const ch = supabase
			.channel(`ref-lock-${profile.id}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "user_profiles",
					filter: `id=eq.${profile.id}`,
				},
				(payload) => {
					setIsLocked(
						(payload.new as { locked: boolean }).locked ?? false,
					);
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [profile?.id]);

	const [isPhaseLocked, setIsPhaseLocked] = useState(false);
	useEffect(() => {
		let cancelled = false;
		supabase
			.from("phase_locks")
			.select("scorekeeper_locked")
			.eq("phase", phase)
			.eq("category", category)
			.maybeSingle()
			.then(({ data }) => {
				if (!cancelled)
					setIsPhaseLocked(
						(data as { scorekeeper_locked: boolean } | null)
							?.scorekeeper_locked ?? false,
					);
			});
		return () => {
			cancelled = true;
		};
	}, [phase, category]);

	useEffect(() => {
		const ch = supabase
			.channel(`ref-phase-lock-${phase}-${category}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "phase_locks",
					filter: `phase=eq.${phase}`,
				},
				(payload) => {
					const row = (
						payload.eventType === "DELETE"
							? payload.old
							: payload.new
					) as { category?: string; scorekeeper_locked?: boolean };
					if (row?.category !== category) return;
					setIsPhaseLocked(
						payload.eventType === "DELETE"
							? false
							: (row.scorekeeper_locked ?? false),
					);
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [phase, category]);

	const isQualifiers = phase === "Qualifiers";
	const activeRounds = isQualifiers ? 4 : elimActiveRounds;

	// Current qualifier round (R1 = DB pairings, R2-R4 = computed from standings)
	const [qualRound, setQualRound] = useState<1 | 2 | 3 | 4>(1);
	// Track whether we've auto-detected the round for this phase/category so user changes are not overridden
	const qualRoundDetected = useRef(false);
	useEffect(() => {
		qualRoundDetected.current = false;
	}, [phase, category]);

	// ── Data fetching ─────────────────────────────────────────────────────────

	function maxScoredRound(rows: MatchWithTeams[]): number {
		let max = 1;
		for (const m of rows) {
			if (m.team_1_r4 !== null || m.team_2_r4 !== null) {
				max = 4;
				break;
			}
			if (m.team_1_r3 !== null || m.team_2_r3 !== null)
				max = Math.max(max, 3);
			else if (m.team_1_r2 !== null || m.team_2_r2 !== null)
				max = Math.max(max, 2);
		}
		return max;
	}

	async function loadMatches() {
		setIsLoading(true);
		const { data, error } = await supabase
			.from("matches")
			.select(
				"*, team_1:team_1_id(id,team_name,category,country,booth_number), team_2:team_2_id(id,team_name,category,country,booth_number), winner:winner_id(id,team_name,category)",
			)
			.eq("phase", phase)
			.eq("category", category)
			.order("match_order", { ascending: true });
		if (!error) {
			const rows = (data as MatchWithTeams[]) ?? [];
			setMatches(rows);
			if (isQualifiers) {
				if (!qualRoundDetected.current) {
					qualRoundDetected.current = true;
					setQualRound(maxScoredRound(rows) as 1 | 2 | 3 | 4);
				}
			} else {
				setElimActiveRounds((n) => Math.max(n, maxScoredRound(rows)));
			}
		}
		setIsLoading(false);
	}

	useEffect(() => {
		loadMatches();
	}, [phase, category]);
	useEffect(() => {
		setElimActiveRounds(1);
	}, [phase]);

	// ── Realtime ──────────────────────────────────────────────────────────────

	useEffect(() => {
		const ch = supabase
			.channel(`ref-matches-${phase}-${category}`)
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
						if (!isQualifiers) {
							const n = payload.new as Partial<MatchWithTeams>;
							const incomingMax =
								n.team_1_r4 != null || n.team_2_r4 != null
									? 4
									: n.team_1_r3 != null || n.team_2_r3 != null
										? 3
										: n.team_1_r2 != null ||
											  n.team_2_r2 != null
											? 2
											: 1;
							setElimActiveRounds((prev) =>
								Math.max(prev, incomingMax),
							);
						}
					}
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [phase, category]);

	// ── Scoring panel state ───────────────────────────────────────────────────

	const [panel, setPanel] = useState<{
		matchId: string;
		teamSlot: 1 | 2;
		roundNum: number;
		teamName: string;
		breakdown: RoundBreakdown;
		absent: boolean;
	} | null>(null);

	function openPanel(matchId: string, teamSlot: 1 | 2, roundNum: number) {
		if (isPhaseLocked || isLocked) return;
		const match = matches.find((m) => m.id === matchId);
		if (!match) return;
		const team = teamSlot === 1 ? match.team_1 : match.team_2;
		if (!team) return;

		const existing = (match.score_breakdown ?? {})[
			breakdownKey(teamSlot, roundNum as 1 | 2 | 3 | 4)
		];
		const breakdown: RoundBreakdown = existing
			? {
					...EMPTY_BREAKDOWN,
					...(existing as unknown as Partial<RoundBreakdown>),
				}
			: { ...EMPTY_BREAKDOWN };
		const absent =
			!!match[
				`team_${teamSlot}_r${roundNum}_absent` as keyof MatchWithTeams
			];

		setPanel({
			matchId,
			teamSlot,
			roundNum,
			teamName: tc(team.team_name),
			breakdown,
			absent,
		});
	}

	// For R2-R4 computed pairings: score a team into their own match row
	function openDynamicPanel(teamId: string, teamName: string) {
		if (isPhaseLocked || isLocked) return;
		const entry = teamMatchMap.get(teamId);
		if (!entry) return;
		const match = matches.find((m) => m.id === entry.matchId);
		if (!match) return;

		const roundNum = qualRound;
		const existing = (match.score_breakdown ?? {})[
			breakdownKey(entry.side, roundNum as 1 | 2 | 3 | 4)
		];
		const breakdown: RoundBreakdown = existing
			? {
					...EMPTY_BREAKDOWN,
					...(existing as unknown as Partial<RoundBreakdown>),
				}
			: { ...EMPTY_BREAKDOWN };
		const absent =
			!!match[
				`team_${entry.side}_r${roundNum}_absent` as keyof MatchWithTeams
			];

		setPanel({
			matchId: entry.matchId,
			teamSlot: entry.side,
			roundNum,
			teamName,
			breakdown,
			absent,
		});
	}

	async function handleSave(
		breakdown: RoundBreakdown,
		total: number,
		absent: boolean,
	) {
		if (!panel) return;
		const { matchId, teamSlot, roundNum } = panel;
		const match = matches.find((m) => m.id === matchId);
		if (!match) return;

		const roundCol = `team_${teamSlot}_r${roundNum}` as ScoreCol;
		const absentCol = `team_${teamSlot}_r${roundNum}_absent` as const;
		const finalTotal = absent ? 0 : total;
		const key = breakdownKey(teamSlot, roundNum as 1 | 2 | 3 | 4);
		const newBreakdownMap: Record<string, Record<string, number>> = {
			...(match.score_breakdown ?? {}),
		};
		if (absent) {
			delete newBreakdownMap[key];
		} else {
			newBreakdownMap[key] = breakdown as unknown as Record<
				string,
				number
			>;
		}

		// Build final points for both teams (i is 0-based index, round col is i+1)
		const t1Rounds = [0, 1, 2, 3].map((i) => {
			if (i >= activeRounds) return null;
			if (teamSlot === 1 && roundNum === i + 1) return finalTotal;
			return (
				(match[`team_1_r${i + 1}` as keyof typeof match] as
					| number
					| null) ?? null
			);
		});
		const t2Rounds = [0, 1, 2, 3].map((i) => {
			if (i >= activeRounds) return null;
			if (teamSlot === 2 && roundNum === i + 1) return finalTotal;
			return (
				(match[`team_2_r${i + 1}` as keyof typeof match] as
					| number
					| null) ?? null
			);
		});

		const update = {
			[roundCol]: finalTotal,
			[absentCol]: absent,
			team_1_final_points: calcFinalPoints(
				t1Rounds[0],
				t1Rounds[1],
				t1Rounds[2],
				t1Rounds[3],
			),
			team_2_final_points: calcFinalPoints(
				t2Rounds[0],
				t2Rounds[1],
				t2Rounds[2],
				t2Rounds[3],
			),
			score_breakdown: newBreakdownMap,
		};

		// Optimistic update
		setMatches((prev) =>
			prev.map((m) => (m.id === matchId ? { ...m, ...update } : m)),
		);
		setPanel(null);

		setSaving((prev) => ({ ...prev, [matchId]: true }));
		const { data: saved, error } = await supabase
			.from("matches")
			.update(update)
			.eq("id", matchId)
			.select("id");
		setSaving((prev) => {
			const n = { ...prev };
			delete n[matchId];
			return n;
		});

		if (error) {
			setSaveError((prev) => ({ ...prev, [matchId]: error.message }));
			setMatches((prev) =>
				prev.map((m) =>
					m.id === matchId
						? {
								...m,
								[roundCol]:
									match[roundCol as keyof typeof match],
								[absentCol]:
									match[absentCol as keyof typeof match],
							}
						: m,
				),
			);
		} else if (!saved || saved.length === 0) {
			setSaveError((prev) => ({
				...prev,
				[matchId]: "Blocked — phase may be locked",
			}));
			setMatches((prev) =>
				prev.map((m) =>
					m.id === matchId
						? {
								...m,
								[roundCol]:
									match[roundCol as keyof typeof match],
								[absentCol]:
									match[absentCol as keyof typeof match],
							}
						: m,
				),
			);
		} else {
			setSaveError((prev) => {
				const n = { ...prev };
				delete n[matchId];
				return n;
			});
			if (!isQualifiers)
				setElimActiveRounds((prev) => Math.max(prev, roundNum));
		}
	}

	// ── Derived ───────────────────────────────────────────────────────────────

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

	// Map each qualifier team to their DB match row (used for dynamic-round scoring)
	const { teamMatchMap, computedQualPairings } = useMemo(() => {
		if (!isQualifiers || qualRound === 1) {
			return {
				teamMatchMap: new Map<
					string,
					{ matchId: string; side: 1 | 2 }
				>(),
				computedQualPairings: null,
			};
		}
		const tMap = new Map<string, { matchId: string; side: 1 | 2 }>();
		for (const m of matches) {
			if (m.team_1_id) tMap.set(m.team_1_id, { matchId: m.id, side: 1 });
			if (m.team_2_id) tMap.set(m.team_2_id, { matchId: m.id, side: 2 });
		}
		const upToRound = (qualRound - 1) as 1 | 2 | 3;
		const teams = computeQualScores(matches, upToRound);
		return {
			teamMatchMap: tMap,
			computedQualPairings: buildQualPairings(teams),
		};
	}, [isQualifiers, qualRound, matches]);

	// ── Auth guards (placed after ALL hooks — Rules of Hooks) ──────────────────

	if (authLoading) {
		return (
			<div className="min-h-screen bg-editorial-ink flex items-center justify-center">
				<Loader2
					size={32}
					className="animate-spin text-editorial-gold"
				/>
			</div>
		);
	}
	if (!profile) {
		return <Navigate to="/login" replace />;
	}

	// ── Locked overlay ─────────────────────────────────────────────────────────

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
					Your access has been temporarily suspended by the
					administrator.
				</p>
				{profile?.email && (
					<p className="text-white/25 text-xs mt-8 font-mono">
						{profile.email}
					</p>
				)}
			</div>
		);
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="min-h-screen bg-editorial-bg text-editorial-ink font-sans">
			{/* Top bar */}
			<div className="sticky top-0 z-20 bg-editorial-ink text-white border-b-4 border-editorial-gold px-4 py-3 flex items-center gap-2 flex-wrap">
				<span className="text-xs font-black uppercase tracking-widest mr-auto">
					Referee
					{profile?.table_number != null && (
						<span className="ml-2 text-editorial-gold">
							· Table {profile.table_number}
						</span>
					)}
				</span>
				<CustomSelect
					theme="dark"
					value={phase}
					options={PHASES.map((p) => ({ value: p, label: p }))}
					onChange={(v) => setPhase(v as Phase)}
				/>
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
				<button
					onClick={loadMatches}
					title="Reload"
					className="p-1.5 hover:text-editorial-gold transition-colors"
				>
					<RefreshCw
						size={15}
						className={isLoading ? "animate-spin" : ""}
					/>
				</button>
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

			{/* Offline banner */}
			{(!isOnline || pendingCount > 0) && (
				<div
					className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold ${isOnline ? "bg-emerald-50 text-emerald-700 border-b border-emerald-200" : "bg-amber-50 text-amber-800 border-b border-amber-200"}`}
				>
					{isOnline ? (
						isFlushing ? (
							<Loader2 size={13} className="animate-spin" />
						) : (
							<Wifi size={13} />
						)
					) : (
						<CloudOff size={13} />
					)}
					<span>
						{!isOnline && "Offline — scores saved locally"}
						{isOnline &&
							isFlushing &&
							`Syncing ${pendingCount} change${pendingCount !== 1 ? "s" : ""}…`}
						{isOnline &&
							!isFlushing &&
							pendingCount > 0 &&
							`${pendingCount} change${pendingCount !== 1 ? "s" : ""} pending sync`}
					</span>
				</div>
			)}

			{/* Phase locked banner */}
			{isPhaseLocked && (
				<div className="flex items-center gap-3 px-4 py-3 bg-amber-50 text-amber-800 border-b border-amber-200">
					<Lock size={13} className="shrink-0" />
					<span className="text-xs font-semibold">
						<span className="font-black uppercase tracking-wider">
							Phase Locked
						</span>
						{" — "}
						Score entry for <strong>{phase}</strong> has been
						closed.
					</span>
				</div>
			)}

			{/* Category hint */}
			<div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 text-xs text-gray-400">
				<span className="font-black">{category}</span>
				<span>·</span>
				<span>
					{category === "Junior" ? "Ages 10–14" : "Ages 15–18"}
				</span>
				{!isQualifiers && (
					<>
						<span className="ml-auto">Active rounds</span>
						<button
							onClick={() =>
								setElimActiveRounds((n) => Math.max(n - 1, 1))
							}
							disabled={elimActiveRounds <= 1}
							className="w-7 h-7 rounded-full bg-gray-100 font-bold text-sm disabled:opacity-30 hover:bg-gray-200 transition-colors"
						>
							−
						</button>
						<span className="font-black w-4 text-center text-editorial-ink">
							{elimActiveRounds}
						</span>
						<button
							onClick={() =>
								setElimActiveRounds((n) => Math.min(n + 1, 4))
							}
							disabled={elimActiveRounds >= 4}
							className="w-7 h-7 rounded-full bg-gray-100 font-bold text-sm disabled:opacity-30 hover:bg-gray-200 transition-colors"
						>
							+
						</button>
					</>
				)}
			</div>

			{/* Qualifier round selector */}
			{isQualifiers && (
				<div className="flex items-center gap-1 px-4 py-2 bg-editorial-bg border-b border-gray-200">
					{([1, 2, 3, 4] as const).map((r) => (
						<button
							key={r}
							onClick={() => setQualRound(r)}
							className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest border transition-colors ${
								qualRound === r
									? "bg-editorial-ink text-white border-editorial-ink"
									: "bg-white text-editorial-ink border-editorial-ink/20 hover:border-editorial-ink/50"
							}`}
						>
							R{r}
						</button>
					))}
				</div>
			)}

			{/* Match / pairing cards */}
			<div className="p-4 space-y-4 pb-24">
				{isLoading ? (
					<div className="flex items-center justify-center py-20 text-sm text-gray-400">
						<Loader2 size={20} className="animate-spin mr-2" />{" "}
						Loading matches…
					</div>
				) : isQualifiers && qualRound > 1 ? (
					// R2-R4: dynamic computed pairings
					!computedQualPairings ||
					computedQualPairings.length === 0 ? (
						<div className="flex items-center justify-center py-20 text-sm text-gray-400">
							No R{qualRound - 1} scores yet — pairings will
							appear once round {qualRound - 1} is scored.
						</div>
					) : (
						computedQualPairings.map((pairing) => {
							const getScore = (teamId: string | undefined) => {
								if (!teamId) return null;
								const e = teamMatchMap.get(teamId);
								if (!e) return null;
								const m = matches.find(
									(x) => x.id === e.matchId,
								);
								if (!m) return null;
								return (
									(m[
										`team_${e.side}_r${qualRound}` as keyof MatchWithTeams
									] as number | null) ?? null
								);
							};
							const getAbsent = (teamId: string | undefined) => {
								if (!teamId) return false;
								const e = teamMatchMap.get(teamId);
								if (!e) return false;
								const m = matches.find(
									(x) => x.id === e.matchId,
								);
								if (!m) return false;
								return !!m[
									`team_${e.side}_r${qualRound}_absent` as keyof MatchWithTeams
								];
							};
							const getHasBreakdown = (
								teamId: string | undefined,
							) => {
								if (!teamId) return false;
								const e = teamMatchMap.get(teamId);
								if (!e) return false;
								const m = matches.find(
									(x) => x.id === e.matchId,
								);
								if (!m) return false;
								const bd = (m.score_breakdown ?? {}) as Record<
									string,
									unknown
								>;
								return !!bd[
									breakdownKey(
										e.side,
										qualRound as 1 | 2 | 3 | 4,
									)
								];
							};
							return (
								<DynamicPairingCard
									key={pairing.t1.id}
									pairing={pairing}
									round={qualRound as 2 | 3 | 4}
									t1Score={getScore(pairing.t1.id)}
									t2Score={getScore(pairing.t2?.id)}
									t1Absent={getAbsent(pairing.t1.id)}
									t2Absent={getAbsent(pairing.t2?.id)}
									t1HasBreakdown={getHasBreakdown(
										pairing.t1.id,
									)}
									t2HasBreakdown={getHasBreakdown(
										pairing.t2?.id,
									)}
									readOnly={isPhaseLocked}
									onScoreTeam={openDynamicPanel}
								/>
							);
						})
					)
				) : visibleMatches.length === 0 ? (
					<div className="flex items-center justify-center py-20 text-sm text-gray-400">
						No matches for {phase} · {category}
						{tableFilter !== "all" ? ` · Table ${tableFilter}` : ""}
					</div>
				) : (
					// R1 or elimination phases: show DB match cards
					visibleMatches.map((match) => (
						<MatchCard
							key={match.id}
							match={match}
							category={category}
							activeRounds={isQualifiers ? 1 : activeRounds}
							readOnly={isPhaseLocked || !!saving[match.id]}
							saveError={saveError[match.id]}
							onRoundTap={openPanel}
						/>
					))
				)}
			</div>

			{/* Scoring panel overlay */}
			{panel && (
				<ScoringPanel
					teamName={panel.teamName}
					roundLabel={`${phase} · Round ${panel.roundNum}`}
					category={category}
					initialBreakdown={panel.breakdown}
					initialAbsent={panel.absent}
					isSaving={!!saving[panel.matchId]}
					onSave={handleSave}
					onClose={() => setPanel(null)}
				/>
			)}
		</div>
	);
}
