import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import type { Category, MatchWithTeams } from "../lib/database.types";
import {
  ALL_SCORING_ITEMS, EMPTY_BREAKDOWN, MISSION_1_ITEMS, MISSION_2_ITEMS,
  PENALTY_ITEMS, breakdownKey, computeRoundScore,
  type RoundBreakdown,
} from "../lib/scoring";
import { supabase } from "../lib/supabase";

interface Props {
  teamId: string;
  teamName: string;
  category: Category;
  phase?: string;
  onClose: () => void;
}

interface RoundInfo {
  matchId: string;
  opponent: string;
  phase: string;
  roundNum: number;
  total: number | null;
  breakdown: RoundBreakdown | null;
}

function ptsLabel(pts: number) {
  if (pts > 0) return `+${pts}`;
  return String(pts);
}

function ptsColor(pts: number) {
  if (pts > 0) return "text-emerald-600";
  if (pts < 0) return "text-red-500";
  return "text-gray-400";
}

// ─── Breakdown detail sections ────────────────────────────────────────────────

function BreakdownSection({
  title, items, breakdown, category,
}: {
  title: string;
  items: typeof MISSION_1_ITEMS;
  breakdown: RoundBreakdown;
  category: Category;
}) {
  const active = items.filter(item => breakdown[item.key] > 0);
  const sectionPts = items.reduce((s, item) => s + breakdown[item.key] * item.pts(category), 0);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
        {sectionPts !== 0 && (
          <span className={`text-xs font-black ${ptsColor(sectionPts)}`}>{ptsLabel(sectionPts)}</span>
        )}
      </div>
      {active.length === 0 ? (
        <p className="text-xs text-gray-300 italic pl-1">No actions recorded</p>
      ) : (
        <div className="space-y-1">
          {active.map(item => {
            const count = breakdown[item.key];
            const pts = item.pts(category);
            const contrib = count * pts;
            return (
              <div key={item.key} className="flex items-center gap-2 text-sm">
                <span className="text-base w-6 text-center">{item.icon}</span>
                <span className="flex-1 text-editorial-ink">{item.label}</span>
                <span className="text-gray-400 text-xs">×{count}</span>
                <span className={`font-bold text-xs w-12 text-right ${ptsColor(contrib)}`}>
                  {ptsLabel(contrib)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function TeamBreakdownModal({ teamId, teamName, category, phase, onClose }: Props) {
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<RoundInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    supabase
      .from("matches")
      .select("*, team_1:team_1_id(id,team_name), team_2:team_2_id(id,team_name)")
      .or(`team_1_id.eq.${teamId},team_2_id.eq.${teamId}`)
      .eq("category", category)
      .order("match_order", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        const infos: RoundInfo[] = [];
        for (const m of (data as MatchWithTeams[]) ?? []) {
          const isTeam1 = m.team_1_id === teamId;
          const opponent = (isTeam1 ? m.team_2?.team_name : m.team_1?.team_name) ?? "TBD";
          const bdMap = (m.score_breakdown ?? {}) as Record<string, Record<string, number>>;
          for (let r = 1; r <= 4; r++) {
            const roundTotal = isTeam1
              ? (m[`team_1_r${r}` as keyof typeof m] as number | null)
              : (m[`team_2_r${r}` as keyof typeof m] as number | null);
            if (roundTotal === null && !bdMap[breakdownKey(isTeam1 ? 1 : 2, r as 1 | 2 | 3 | 4)]) continue;
            const rawBd = bdMap[breakdownKey(isTeam1 ? 1 : 2, r as 1 | 2 | 3 | 4)];
            const breakdown = rawBd
              ? ({ ...EMPTY_BREAKDOWN, ...(rawBd as unknown as Partial<RoundBreakdown>) } as RoundBreakdown)
              : null;
            infos.push({ matchId: m.id, opponent, phase: m.phase, roundNum: r, total: roundTotal, breakdown });
          }
        }
        setRounds(infos);
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [teamId, category]);

  const displayRounds = phase ? rounds.filter(r => r.phase === phase) : rounds;
  const totalScore = displayRounds.reduce((s, r) => s + (r.total ?? 0), 0);

  // ── Shared wrapper ──────────────────────────────────────────────────────────
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-full sm:max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Wrapper>
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{category} · Score Breakdown</p>
            <h2 className="text-xl font-black text-editorial-ink">{teamName}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      </Wrapper>
    );
  }

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selected) {
    const bd = selected.breakdown;
    const computedTotal = bd ? computeRoundScore(bd, category) : null;
    const displayTotal = selected.total ?? computedTotal ?? 0;
    const totalC = ptsColor(displayTotal);

    return (
      <Wrapper>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-gray-100">
          <button
            onClick={() => setSelected(null)}
            className="p-1.5 text-gray-400 hover:text-editorial-ink transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate">
              {selected.phase} · Round {selected.roundNum}
            </p>
            <p className="text-sm font-semibold text-editorial-ink truncate">vs {selected.opponent}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        {/* Round score — focal point */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100 bg-gray-50">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Round Score</span>
          <span className={`text-5xl font-black font-mono leading-none ${totalC}`}>
            {ptsLabel(displayTotal)}
          </span>
        </div>

        {/* Mission breakdown */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {bd ? (
            <>
              <BreakdownSection title="Mission 1 — Cultivation" items={MISSION_1_ITEMS} breakdown={bd} category={category} />
              <BreakdownSection title="Mission 2 — Harvesting" items={MISSION_2_ITEMS} breakdown={bd} category={category} />
              <BreakdownSection title="Penalties" items={PENALTY_ITEMS} breakdown={bd} category={category} />
              {ALL_SCORING_ITEMS.filter(item => bd[item.key] > 0 && item.pts(category) === 0).map(item => (
                <div key={item.key} className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <span>{item.icon}</span>
                  <span>{item.label} ×{bd[item.key]}</span>
                  <span className="ml-auto">0 pts</span>
                </div>
              ))}
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 px-3 py-3 text-xs text-gray-400 italic">
              Score entered manually — no mission breakdown available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3">
          <button
            onClick={() => setSelected(null)}
            className="w-full h-12 rounded-xl border-2 border-editorial-ink text-editorial-ink font-black hover:bg-editorial-ink hover:text-white transition-colors"
          >
            ← Back to Summary
          </button>
        </div>
      </Wrapper>
    );
  }

  // ── Summary view ────────────────────────────────────────────────────────────
  return (
    <Wrapper>
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{category} · Score Breakdown</p>
          <h2 className="text-xl font-black text-editorial-ink leading-tight">{teamName}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 mt-1"><X size={20} /></button>
      </div>

      {/* Total — prominently at top */}
      <div className="px-5 py-6 text-center border-b border-gray-100 bg-editorial-ink">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Total Score</p>
        <p className="text-6xl font-black font-mono text-editorial-gold leading-none">
          {totalScore}
        </p>
        <p className="text-[11px] font-black uppercase tracking-widest text-white/40 mt-2">pts</p>
      </div>

      {/* Round list */}
      <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
        {displayRounds.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No scored rounds yet.</div>
        ) : (
          displayRounds.map((round) => {
            const displayTotal = round.total ?? (round.breakdown ? computeRoundScore(round.breakdown, category) : null) ?? 0;
            const hasBreakdown = !!round.breakdown;

            return (
              <button
                key={`${round.matchId}-${round.roundNum}`}
                onClick={() => setSelected(round)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {round.phase} · Round {round.roundNum}
                  </p>
                  <p className="text-sm font-semibold text-editorial-ink truncate">
                    vs {round.opponent}
                  </p>
                  {!hasBreakdown && (
                    <p className="text-[9px] text-gray-300 mt-0.5">Manual entry</p>
                  )}
                </div>
                <span className={`text-2xl font-black font-mono shrink-0 ${ptsColor(displayTotal)}`}>
                  {ptsLabel(displayTotal)}
                </span>
                <ChevronRight size={16} className="text-gray-300 shrink-0 group-hover:text-gray-500 transition-colors" />
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-5 py-3">
        <button
          onClick={onClose}
          className="w-full h-12 rounded-xl bg-editorial-ink text-white font-black active:bg-editorial-gold active:text-editorial-ink transition-colors"
        >
          Close
        </button>
      </div>
    </Wrapper>
  );
}
