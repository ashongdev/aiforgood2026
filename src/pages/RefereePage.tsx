import { CloudOff, Lock, Loader2, LogOut, Minus, Plus, RefreshCw, Wifi, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CustomSelect } from "../components/CustomSelect";
import { useAuth } from "../contexts/AuthContext";
import { useOfflineQueue } from "../hooks/useOfflineQueue";
import type { Category, MatchWithTeams, Phase } from "../lib/database.types";
import {
  ALL_SCORING_ITEMS, EMPTY_BREAKDOWN, MISSION_1_ITEMS, MISSION_2_ITEMS,
  PENALTY_ITEMS, breakdownKey, computeRoundScore,
  type RoundBreakdown, type ScoringItem,
} from "../lib/scoring";
import { supabase } from "../lib/supabase";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PHASES: Phase[] = [
  "Qualifiers", "Pre-Quarterfinals", "Quarterfinals",
  "Semifinals", "Third Place", "Finals",
];

const ROUND_COLS = [
  "team_1_r1", "team_1_r2", "team_1_r3", "team_1_r4",
  "team_2_r1", "team_2_r2", "team_2_r3", "team_2_r4",
] as const;
type ScoreCol = (typeof ROUND_COLS)[number];

function calcFinalPoints(r1: number | null, r2: number | null, r3: number | null, r4: number | null): number | null {
  const vals = [r1, r2, r3, r4].filter((v): v is number => v !== null);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
}

// ─── Scoring item counter row ─────────────────────────────────────────────────

function ScoringRow({
  item, count, category, onChange,
}: {
  item: ScoringItem;
  count: number;
  category: Category;
  onChange: (delta: 1 | -1) => void;
}) {
  const pts = item.pts(category);
  const contribution = count * pts;
  const ptsColor = pts > 0 ? "text-emerald-600" : pts < 0 ? "text-red-500" : "text-gray-300";
  const ptsBg = pts > 0 ? "bg-emerald-50 border-emerald-200" : pts < 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200";
  const contribColor = contribution > 0 ? "text-emerald-600" : contribution < 0 ? "text-red-500" : "text-gray-300";

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Icon + label */}
      <span className="text-lg leading-none w-7 shrink-0 text-center">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-editorial-ink leading-tight">{item.label}</span>
      </div>

      {/* Points badge */}
      <span className={`text-[10px] font-black border px-1.5 py-0.5 shrink-0 ${ptsBg} ${ptsColor}`}>
        {pts > 0 ? `+${pts}` : pts}
      </span>

      {/* Counter */}
      <div className="flex items-center gap-0 shrink-0">
        <button
          onPointerDown={(e) => { e.preventDefault(); if (count > 0) onChange(-1); }}
          disabled={count <= 0}
          className="w-10 h-10 flex items-center justify-center rounded-l-xl bg-gray-100 active:bg-gray-200 disabled:opacity-30 transition-colors select-none"
        >
          <Minus size={16} />
        </button>
        <span className={`w-10 h-10 flex items-center justify-center text-lg font-black border-y border-gray-200 bg-white select-none ${contribColor}`}>
          {count}
        </span>
        <button
          onPointerDown={(e) => { e.preventDefault(); onChange(1); }}
          className="w-10 h-10 flex items-center justify-center rounded-r-xl bg-gray-100 active:bg-gray-200 transition-colors select-none"
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
  isSaving: boolean;
  onSave: (breakdown: RoundBreakdown, total: number) => void;
  onClose: () => void;
}

function ScoringPanel({
  teamName, roundLabel, category, initialBreakdown, isSaving, onSave, onClose,
}: ScoringPanelProps) {
  const [breakdown, setBreakdown] = useState<RoundBreakdown>({ ...initialBreakdown });

  function adjust(key: keyof RoundBreakdown, delta: 1 | -1) {
    setBreakdown(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
  }

  const total = computeRoundScore(breakdown, category);
  const totalColor = total > 0 ? "text-emerald-600" : total < 0 ? "text-red-500" : "text-editorial-ink";

  const sections = [
    { title: "Mission 1 — Cultivation & Irrigation", items: MISSION_1_ITEMS },
    { title: "Mission 2 — Harvesting & Sorting",     items: MISSION_2_ITEMS },
    { title: "Penalties",                            items: PENALTY_ITEMS   },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 480, marginLeft: "auto", marginRight: "auto", width: "100%" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{roundLabel}</p>
            <h2 className="text-lg font-black text-editorial-ink leading-tight">{teamName}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total</p>
              <p className={`text-2xl font-black font-mono leading-none ${totalColor}`}>{total}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-2">
          {sections.map(({ title, items }) => {
            const sectionTotal = items.reduce(
              (s, item) => s + breakdown[item.key] * item.pts(category), 0
            );
            const hasPts = sectionTotal !== 0;
            return (
              <div key={title} className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
                  {hasPts && (
                    <span className={`text-xs font-black ${sectionTotal > 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {sectionTotal > 0 ? `+${sectionTotal}` : sectionTotal}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map(item => (
                    <ScoringRow
                      key={item.key}
                      item={item}
                      count={breakdown[item.key]}
                      category={category}
                      onChange={delta => adjust(item.key, delta)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Running total summary */}
          <div className="mb-4 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-gray-500">Round Total</span>
              <span className={`text-3xl font-black font-mono ${totalColor}`}>{total}</span>
            </div>
            {ALL_SCORING_ITEMS.filter(i => breakdown[i.key] > 0).map(item => {
              const pts = item.pts(category);
              const contribution = breakdown[item.key] * pts;
              if (contribution === 0) return null;
              return (
                <div key={item.key} className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
                  <span>{item.icon} {item.label} × {breakdown[item.key]}</span>
                  <span className={contribution > 0 ? "text-emerald-600" : "text-red-500"}>
                    {contribution > 0 ? `+${contribution}` : contribution}
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
            onClick={() => onSave(breakdown, total)}
            disabled={isSaving}
            className={`flex-2 h-14 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-colors px-6 ${
              isSaving ? "bg-editorial-gold/60" : "bg-editorial-ink active:bg-editorial-gold active:text-editorial-ink"
            }`}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
            {isSaving ? "Saving…" : `Save  ${total > 0 ? "+" : ""}${total} pts`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Round score button ─────────────────────────────────────────────────────────

function RoundBtn({
  roundNum, value, hasBreakdown, readOnly, onTap,
}: {
  roundNum: number;
  value: number | null;
  hasBreakdown: boolean;
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
          : hasBreakdown
          ? "border-editorial-gold bg-editorial-gold/10 active:bg-editorial-gold/20"
          : "border-gray-200 bg-white active:bg-editorial-gold/10"
      }`}
    >
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">R{roundNum}</span>
      <span className={`text-xl font-black font-mono leading-none ${
        value !== null ? "text-editorial-ink" : "text-gray-200"
      }`}>
        {value ?? "—"}
      </span>
      {hasBreakdown && (
        <span className="text-[8px] text-editorial-gold font-bold tracking-wide">scored</span>
      )}
    </button>
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

function MatchCard({ match, activeRounds, readOnly, saveError, onRoundTap }: MatchCardProps) {
  const breakdown = (match.score_breakdown ?? {}) as Record<string, Record<string, number>>;
  const t1Total = match.team_1_final_points;
  const t2Total = match.team_2_final_points;
  const t1Ahead = (t1Total ?? 0) > (t2Total ?? 0) && (t1Total !== null || t2Total !== null);
  const t2Ahead = (t2Total ?? 0) > (t1Total ?? 0) && (t1Total !== null || t2Total !== null);

  const rounds = Array.from({ length: activeRounds }, (_, i) => i + 1);

  return (
    <div className={`rounded-2xl border-2 overflow-hidden bg-white shadow-sm ${saveError ? "border-red-300" : "border-gray-200"}`}>
      {/* Header */}
      <div className="bg-editorial-ink text-white px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
          {match.table_number ? `Table ${match.table_number}` : match.phase}
        </span>
        {saveError && <span className="text-[10px] text-red-300 font-semibold">{saveError}</span>}
      </div>

      {/* Team 1 */}
      <div className={`px-4 pt-4 pb-3 ${t1Ahead ? "bg-emerald-50/40" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-lg font-black leading-tight ${t1Ahead ? "text-emerald-700" : "text-editorial-ink"}`}>
            {match.team_1?.team_name ?? <span className="font-normal italic text-gray-300 text-base">Empty slot</span>}
          </span>
          <span className={`text-2xl font-black font-mono ${t1Total !== null ? "text-emerald-600" : "text-gray-200"}`}>
            {t1Total ?? "—"}
          </span>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${activeRounds}, 1fr)` }}>
          {rounds.map(r => (
            <RoundBtn
              key={r}
              roundNum={r}
              value={(match[`team_1_r${r}` as keyof MatchWithTeams] as number | null) ?? null}
              hasBreakdown={!!breakdown[breakdownKey(1, r as 1 | 2 | 3 | 4)]}
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
      <div className={`px-4 pt-2 pb-4 ${t2Ahead ? "bg-emerald-50/40" : ""}`}>
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `repeat(${activeRounds}, 1fr)` }}>
          {rounds.map(r => (
            <RoundBtn
              key={r}
              roundNum={r}
              value={(match[`team_2_r${r}` as keyof MatchWithTeams] as number | null) ?? null}
              hasBreakdown={!!breakdown[breakdownKey(2, r as 1 | 2 | 3 | 4)]}
              readOnly={readOnly || !match.team_2}
              onTap={() => onRoundTap(match.id, 2, r)}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-lg font-black leading-tight ${t2Ahead ? "text-emerald-700" : "text-editorial-ink"}`}>
            {match.team_2?.team_name ?? <span className="font-normal italic text-gray-300 text-base">Empty slot</span>}
          </span>
          <span className={`text-2xl font-black font-mono ${t2Total !== null ? "text-emerald-600" : "text-gray-200"}`}>
            {t2Total ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function RefereePage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter state (URL-persisted) ─────────────────────────────────────────

  const phase: Phase = PHASES.includes(searchParams.get("phase") as Phase)
    ? (searchParams.get("phase") as Phase)
    : ((localStorage.getItem("ref_phase") as Phase | null) ?? "Qualifiers");
  const category: Category = (["Junior", "Senior"] as Category[]).includes(searchParams.get("category") as Category)
    ? (searchParams.get("category") as Category)
    : ((localStorage.getItem("ref_category") as Category | null) ?? "Junior");
  const tableFilter: string =
    searchParams.get("table") ??
    localStorage.getItem("ref_table") ??
    (profile?.table_number != null ? String(profile.table_number) : "all");

  function setPhase(p: Phase) {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("phase", p); return n; }, { replace: true });
    localStorage.setItem("ref_phase", p);
  }
  function setCategory(c: Category) {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("category", c); return n; }, { replace: true });
    localStorage.setItem("ref_category", c);
  }
  function setTableFilter(t: string) {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("table", t); return n; }, { replace: true });
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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_profiles", filter: `id=eq.${profile.id}` },
        payload => { setIsLocked((payload.new as { locked: boolean }).locked ?? false); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id]);

  const [isPhaseLocked, setIsPhaseLocked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    supabase.from("phase_locks").select("scorekeeper_locked").eq("phase", phase).eq("category", category).maybeSingle()
      .then(({ data }) => { if (!cancelled) setIsPhaseLocked((data as { scorekeeper_locked: boolean } | null)?.scorekeeper_locked ?? false); });
    return () => { cancelled = true; };
  }, [phase, category]);

  useEffect(() => {
    const ch = supabase
      .channel(`ref-phase-lock-${phase}-${category}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "phase_locks", filter: `phase=eq.${phase}` },
        payload => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as { category?: string; scorekeeper_locked?: boolean };
          if (row?.category !== category) return;
          setIsPhaseLocked(payload.eventType === "DELETE" ? false : (row.scorekeeper_locked ?? false));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [phase, category]);

  const isQualifiers = phase === "Qualifiers";
  const activeRounds = isQualifiers ? 4 : elimActiveRounds;

  // ── Data fetching ─────────────────────────────────────────────────────────

  async function loadMatches() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("matches")
      .select("*, team_1:team_1_id(id,team_name,category), team_2:team_2_id(id,team_name,category), winner:winner_id(id,team_name,category)")
      .eq("phase", phase)
      .eq("category", category)
      .order("match_order", { ascending: true });
    if (!error) setMatches((data as MatchWithTeams[]) ?? []);
    setIsLoading(false);
  }

  useEffect(() => { loadMatches(); }, [phase, category]);
  useEffect(() => { setElimActiveRounds(1); }, [phase]);

  // ── Realtime ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const ch = supabase
      .channel(`ref-matches-${phase}-${category}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `phase=eq.${phase}` },
        payload => {
          if (payload.eventType === "UPDATE") {
            setMatches(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...(payload.new as MatchWithTeams) } : m));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [phase, category]);

  // ── Scoring panel state ───────────────────────────────────────────────────

  const [panel, setPanel] = useState<{
    matchId: string;
    teamSlot: 1 | 2;
    roundNum: number;
    teamName: string;
    breakdown: RoundBreakdown;
  } | null>(null);

  function openPanel(matchId: string, teamSlot: 1 | 2, roundNum: number) {
    if (isPhaseLocked || isLocked) return;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const team = teamSlot === 1 ? match.team_1 : match.team_2;
    if (!team) return;

    const existing = (match.score_breakdown ?? {})[breakdownKey(teamSlot, roundNum as 1 | 2 | 3 | 4)];
    const breakdown: RoundBreakdown = existing
      ? { ...EMPTY_BREAKDOWN, ...(existing as unknown as Partial<RoundBreakdown>) }
      : { ...EMPTY_BREAKDOWN };

    setPanel({ matchId, teamSlot, roundNum, teamName: team.team_name, breakdown });
  }

  async function handleSave(breakdown: RoundBreakdown, total: number) {
    if (!panel) return;
    const { matchId, teamSlot, roundNum } = panel;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const roundCol = `team_${teamSlot}_r${roundNum}` as ScoreCol;
    const key = breakdownKey(teamSlot, roundNum as 1 | 2 | 3 | 4);
    const newBreakdownMap: Record<string, Record<string, number>> = {
      ...(match.score_breakdown ?? {}),
      [key]: breakdown as unknown as Record<string, number>,
    };

    // Build final points for both teams
    const t1Rounds = [1, 2, 3, 4].map((r, i) => {
      if (i >= activeRounds) return null;
      if (teamSlot === 1 && roundNum === r + 1) return total;
      return (match[`team_1_r${r + 1}` as keyof typeof match] as number | null) ?? null;
    });
    const t2Rounds = [1, 2, 3, 4].map((r, i) => {
      if (i >= activeRounds) return null;
      if (teamSlot === 2 && roundNum === r + 1) return total;
      return (match[`team_2_r${r + 1}` as keyof typeof match] as number | null) ?? null;
    });

    const update = {
      [roundCol]: total,
      team_1_final_points: calcFinalPoints(t1Rounds[0], t1Rounds[1], t1Rounds[2], t1Rounds[3]),
      team_2_final_points: calcFinalPoints(t2Rounds[0], t2Rounds[1], t2Rounds[2], t2Rounds[3]),
      score_breakdown: newBreakdownMap,
    };

    // Optimistic update
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...update } : m));
    setPanel(null);

    setSaving(prev => ({ ...prev, [matchId]: true }));
    const { data: saved, error } = await supabase
      .from("matches").update(update).eq("id", matchId).select("id");
    setSaving(prev => { const n = { ...prev }; delete n[matchId]; return n; });

    if (error) {
      setSaveError(prev => ({ ...prev, [matchId]: error.message }));
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, [roundCol]: match[roundCol as keyof typeof match] } : m));
    } else if (!saved || saved.length === 0) {
      setSaveError(prev => ({ ...prev, [matchId]: "Blocked — phase may be locked" }));
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, [roundCol]: match[roundCol as keyof typeof match] } : m));
    } else {
      setSaveError(prev => { const n = { ...prev }; delete n[matchId]; return n; });
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const availableTables = [...new Set(matches.map(m => m.table_number).filter((t): t is number => t !== null))].sort((a, b) => a - b);
  const visibleMatches = tableFilter === "all" ? matches : matches.filter(m => m.table_number === parseInt(tableFilter, 10));

  // ── Locked overlay ─────────────────────────────────────────────────────────

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-editorial-ink flex flex-col items-center justify-center text-white px-6 text-center">
        <div className="border-4 border-editorial-gold p-6 mb-8">
          <Lock size={40} className="text-editorial-gold mx-auto" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-widest mb-3">Access Suspended</h1>
        <p className="text-white/50 text-sm max-w-xs leading-relaxed">
          Your access has been temporarily suspended by the administrator.
        </p>
        {profile?.email && <p className="text-white/25 text-xs mt-8 font-mono">{profile.email}</p>}
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
            <span className="ml-2 text-editorial-gold">· Table {profile.table_number}</span>
          )}
        </span>
        <CustomSelect theme="dark" value={phase} options={PHASES.map(p => ({ value: p, label: p }))} onChange={v => setPhase(v as Phase)} />
        <CustomSelect theme="dark" value={category} options={[{ value: "Junior", label: "Junior" }, { value: "Senior", label: "Senior" }]} onChange={v => setCategory(v as Category)} showSearch={false} />
        <CustomSelect
          theme="dark"
          value={tableFilter}
          options={[{ value: "all", label: "All Tables" }, ...availableTables.map(t => ({ value: String(t), label: `Table ${t}` }))]}
          onChange={setTableFilter}
          showSearch={false}
        />
        <button onClick={loadMatches} title="Reload" className="p-1.5 hover:text-editorial-gold transition-colors">
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
        </button>
        <button onClick={async () => { await signOut(); navigate("/login"); }} title="Sign out" className="p-1.5 hover:text-editorial-gold transition-colors">
          <LogOut size={15} />
        </button>
      </div>

      {/* Offline banner */}
      {(!isOnline || pendingCount > 0) && (
        <div className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold ${isOnline ? "bg-emerald-50 text-emerald-700 border-b border-emerald-200" : "bg-amber-50 text-amber-800 border-b border-amber-200"}`}>
          {isOnline ? (isFlushing ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />) : <CloudOff size={13} />}
          <span>
            {!isOnline && "Offline — scores saved locally"}
            {isOnline && isFlushing && `Syncing ${pendingCount} change${pendingCount !== 1 ? "s" : ""}…`}
            {isOnline && !isFlushing && pendingCount > 0 && `${pendingCount} change${pendingCount !== 1 ? "s" : ""} pending sync`}
          </span>
        </div>
      )}

      {/* Phase locked banner */}
      {isPhaseLocked && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 text-amber-800 border-b border-amber-200">
          <Lock size={13} className="shrink-0" />
          <span className="text-xs font-semibold">
            <span className="font-black uppercase tracking-wider">Phase Locked</span>{" — "}
            Score entry for <strong>{phase}</strong> has been closed.
          </span>
        </div>
      )}

      {/* Category hint */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 text-xs text-gray-400">
        <span className="font-black">{category}</span>
        <span>·</span>
        <span>{category === "Junior" ? "Ages 10–14" : "Ages 15–18"}</span>
        <span>·</span>
        <span>Tap a round button to enter mission scores</span>
        {!isQualifiers && (
          <>
            <span className="ml-auto">Active rounds</span>
            <button onClick={() => setElimActiveRounds(n => Math.max(n - 1, 1))} disabled={elimActiveRounds <= 1} className="w-7 h-7 rounded-full bg-gray-100 font-bold text-sm disabled:opacity-30 hover:bg-gray-200 transition-colors">−</button>
            <span className="font-black w-4 text-center text-editorial-ink">{elimActiveRounds}</span>
            <button onClick={() => setElimActiveRounds(n => Math.min(n + 1, 4))} disabled={elimActiveRounds >= 4} className="w-7 h-7 rounded-full bg-gray-100 font-bold text-sm disabled:opacity-30 hover:bg-gray-200 transition-colors">+</button>
          </>
        )}
      </div>

      {/* Match cards */}
      <div className="p-4 space-y-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading matches…
          </div>
        ) : visibleMatches.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">
            No matches for {phase} · {category}{tableFilter !== "all" ? ` · Table ${tableFilter}` : ""}
          </div>
        ) : (
          visibleMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              category={category}
              activeRounds={activeRounds}
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
          isSaving={!!saving[panel.matchId]}
          onSave={handleSave}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
