import { Calendar, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCountryFlag } from "../lib/countryFlag";
import type { Category, MatchWithTeams } from "../lib/database.types";
import { tc } from "../lib/format";
import { getPairingsForRound } from "../lib/qualPairings";
import { supabase } from "../lib/supabase";

type ScheduleStatus = "upcoming" | "live" | "done";
type RoundTab = "r1" | "r2" | "r3" | "r4" | "knockout";

interface TabEntry {
	key: string;
	match: MatchWithTeams;
	time: string;
	round: RoundTab;
	t1Name: string;
	t2Name: string | null;
	t1Country?: string | null;
	t2Country?: string | null;
	t1Booth?: number | null;
	t2Booth?: number | null;
}

const TABS: { id: RoundTab; label: string }[] = [
	{ id: "r1", label: "R1" },
	{ id: "r2", label: "R2" },
	{ id: "r3", label: "R3" },
	{ id: "r4", label: "R4" },
	{ id: "knockout", label: "Knockout" },
];

const STATUS_STYLES: Record<ScheduleStatus, string> = {
	upcoming: "bg-gray-100 text-gray-500",
	live: "bg-editorial-gold/20 text-editorial-gold border border-editorial-gold/60 animate-pulse",
	done: "bg-editorial-green/10 text-editorial-green border border-editorial-green/30",
};

function entryStatus(time: string, winnerId: string | null): ScheduleStatus {
	if (winnerId) return "done";
	const t = new Date(time).getTime();
	if (Date.now() >= t && Date.now() <= t + 90 * 60 * 1000) return "live";
	return "upcoming";
}

export function ScheduleView({ category }: { category: Category }) {
	const [matches, setMatches] = useState<MatchWithTeams[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [tab, setTab] = useState<RoundTab>("r1");
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		setIsLoading(true);
		supabase
			.from("matches")
			.select(
				"*, team_1:team_1_id(id,team_name,category,country,booth_number), team_2:team_2_id(id,team_name,category,country,booth_number), winner:winner_id(id,team_name,category,country)",
			)
			.eq("category", category)
			.order("match_order", { ascending: true })
			.then(({ data }) => {
				setMatches((data as MatchWithTeams[]) ?? []);
				setIsLoading(false);
			});
	}, [category]);

	const tabEntries = useMemo(() => {
		const qual = matches.filter((m) => m.phase === "Qualifiers");
		const elim = matches.filter((m) => m.phase !== "Qualifiers");

		// Build a team metadata lookup: teamId → { country, booth_number }
		const teamMeta = new Map<string, { country: string | null; booth_number: number | null }>();
		for (const m of matches) {
			for (const t of [m.team_1, m.team_2]) {
				if (t?.id) {
					teamMeta.set(t.id, {
						country: (t as { country?: string | null }).country ?? null,
						booth_number: (t as { booth_number?: number | null }).booth_number ?? null,
					});
				}
			}
		}

		// Pre-compute R2/R3/R4 pairings from standings (same logic as RefereePage)
		const r2pairs = getPairingsForRound(qual, 2);
		const r3pairs = getPairingsForRound(qual, 3);
		const r4pairs = getPairingsForRound(qual, 4);
		const pairingMap = {
			r2: new Map(r2pairs.map((p) => [p.match.id, p])),
			r3: new Map(r3pairs.map((p) => [p.match.id, p])),
			r4: new Map(r4pairs.map((p) => [p.match.id, p])),
		};

		const r1Entries: TabEntry[] = qual
			.filter((m) => m.scheduled_time)
			.map((m) => ({
				key: `${m.id}-r1`,
				match: m,
				time: m.scheduled_time!,
				round: "r1" as RoundTab,
				t1Name: tc(m.team_1?.team_name) || "TBD",
				t2Name: tc(m.team_2?.team_name) || "TBD",
				t1Country: (m.team_1 as { country?: string | null } | null)?.country,
				t2Country: (m.team_2 as { country?: string | null } | null)?.country,
				t1Booth: (m.team_1 as { booth_number?: number | null } | null)?.booth_number,
				t2Booth: (m.team_2 as { booth_number?: number | null } | null)?.booth_number,
			}))
			.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

		const makeQualEntries = (
			round: "r2" | "r3" | "r4",
			col: "scheduled_time_r2" | "scheduled_time_r3" | "scheduled_time_r4",
		): TabEntry[] =>
			qual
				.filter((m) => m[col])
				.map((m) => {
					const p = pairingMap[round].get(m.id);
					const m1 = p?.t1Id ? teamMeta.get(p.t1Id) : undefined;
					const m2 = p?.t2Id ? teamMeta.get(p.t2Id) : undefined;
					return {
						key: `${m.id}-${round}`,
						match: m,
						time: m[col] as string,
						round,
						t1Name: p?.t1Name ?? "TBD",
						t2Name: p?.t2Name ?? null,
						t1Country: m1?.country,
						t2Country: m2?.country,
						t1Booth: m1?.booth_number,
						t2Booth: m2?.booth_number,
					};
				})
				.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

		const knockoutEntries: TabEntry[] = elim
			.filter((m) => m.scheduled_time)
			.map((m) => ({
				key: m.id,
				match: m,
				time: m.scheduled_time!,
				round: "knockout" as RoundTab,
				t1Name: tc(m.team_1?.team_name) || "TBD",
				t2Name: tc(m.team_2?.team_name) || "TBD",
				t1Country: (m.team_1 as { country?: string | null } | null)?.country,
				t2Country: (m.team_2 as { country?: string | null } | null)?.country,
				t1Booth: (m.team_1 as { booth_number?: number | null } | null)?.booth_number,
				t2Booth: (m.team_2 as { booth_number?: number | null } | null)?.booth_number,
			}))
			.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

		return {
			r1: r1Entries,
			r2: makeQualEntries("r2", "scheduled_time_r2"),
			r3: makeQualEntries("r3", "scheduled_time_r3"),
			r4: makeQualEntries("r4", "scheduled_time_r4"),
			knockout: knockoutEntries,
		};
	}, [matches]);

	const allEntries = useMemo(
		() =>
			[...tabEntries.r1, ...tabEntries.r2, ...tabEntries.r3, ...tabEntries.r4, ...tabEntries.knockout]
				.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
		[tabEntries],
	);

	const nextUpEntry = useMemo(
		() => allEntries.find((e) => !e.match.winner_id && new Date(e.time).getTime() > now) ?? null,
		[allEntries, now],
	);

	const currentEntries = tabEntries[tab];

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return currentEntries;
		return currentEntries.filter(
			(e) =>
				e.t1Name.toLowerCase().includes(q) ||
				(e.t2Name?.toLowerCase().includes(q) ?? false),
		);
	}, [currentEntries, search]);

	if (isLoading) {
		return <div className="py-16 text-center text-sm text-gray-400">Loading schedule…</div>;
	}

	if (allEntries.length === 0) {
		return (
			<div className="py-16 text-center space-y-2">
				<Calendar size={32} className="mx-auto text-gray-200" />
				<p className="text-sm text-gray-400">
					No scheduled matches yet. Admins can set times in the Admin panel.
				</p>
			</div>
		);
	}

	return (
		<div className="w-full space-y-4 pb-8">
			{/* Next up banner */}
			{nextUpEntry && (
				<div className="border-l-4 border-editorial-gold bg-editorial-gold/5 px-4 py-3 flex items-center gap-3 flex-wrap">
					<span className="text-[10px] font-black uppercase tracking-widest text-editorial-gold shrink-0">
						Next up
					</span>
					<span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">
						{nextUpEntry.round === "knockout"
							? nextUpEntry.match.phase
							: nextUpEntry.round.toUpperCase()}
					</span>
					<span className="text-sm font-semibold text-editorial-ink">
						{nextUpEntry.t1Name} vs {nextUpEntry.t2Name ?? "TBD"}
					</span>
					<span className="text-xs text-gray-500 ml-auto shrink-0">
						{new Date(nextUpEntry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
					</span>
				</div>
			)}

			{/* Tabs */}
			<div className="flex border-b border-gray-200">
				{TABS.map((t) => {
					const count = tabEntries[t.id].length;
					const active = tab === t.id;
					return (
						<button
							key={t.id}
							onClick={() => setTab(t.id)}
							className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
								active
									? "border-editorial-gold text-editorial-gold"
									: "border-transparent text-gray-400 hover:text-editorial-ink"
							}`}
						>
							{t.label}
							{count > 0 && (
								<span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? "bg-editorial-gold/15 text-editorial-gold" : "bg-gray-100 text-gray-400"}`}>
									{count}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* Search */}
			<div className="relative">
				<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
				<input
					type="text"
					placeholder="Search team…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full border border-gray-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-editorial-gold text-editorial-ink placeholder:text-gray-300"
				/>
			</div>

			{/* Entries */}
			{filtered.length === 0 ? (
				<div className="py-12 text-center space-y-1 border border-gray-100">
					<Calendar size={28} className="mx-auto text-gray-200 mb-2" />
					<p className="text-sm text-gray-400">
						{search.trim()
							? `No matches for "${search}"`
							: tab === "knockout"
							? "No elimination matches scheduled yet."
							: `No ${tab.toUpperCase()} times set yet.`}
					</p>
					{!search.trim() && tab !== "knockout" && (
						<p className="text-xs text-gray-300">
							Admins can set {tab.toUpperCase()} times in the Admin panel.
						</p>
					)}
				</div>
			) : (
				<div className="border border-gray-200 bg-white divide-y divide-gray-100">
					{filtered.map((entry) => {
						const { match: m, time, round, t1Name, t2Name, t1Country, t2Country, t1Booth, t2Booth } = entry;
						const status = entryStatus(time, m.winner_id);
						const q = search.trim().toLowerCase();
						const hl1 = q ? t1Name.toLowerCase().includes(q) : false;
						const hl2 = q && t2Name ? t2Name.toLowerCase().includes(q) : false;

						return (
							<div key={entry.key} className="px-4 py-4 grid grid-cols-[4.5rem_1fr_auto] items-center gap-3">
								{/* Time + table */}
								<div className="shrink-0">
									<p className="text-sm font-bold text-editorial-ink leading-tight">
										{new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
									</p>
									<p className="text-xs text-gray-400 leading-tight">T{m.table_number ?? "—"}</p>
									{round !== "knockout" && (
										<span className={`text-[9px] font-black uppercase tracking-widest ${round === "r1" ? "text-editorial-gold" : "text-gray-400"}`}>
											{round.toUpperCase()}
										</span>
									)}
								</div>

								{/* Teams */}
								<div className="min-w-0 flex items-center gap-2">
									<div className="min-w-0 flex-1">
										<span className={`block truncate text-sm font-bold ${hl1 ? "text-editorial-gold" : "text-editorial-ink"}`}>
											{t1Name}
										</span>
										{(getCountryFlag(t1Country) || t1Country) && (
											<span className="flex items-center gap-1 mt-0.5">
												{getCountryFlag(t1Country) && <span className="text-base leading-none">{getCountryFlag(t1Country)}</span>}
												{t1Country && <span className="text-xs text-gray-400 truncate">{t1Country}</span>}
											</span>
										)}
										{t1Booth != null && (
											<span className="text-[10px] font-mono text-gray-400">#{t1Booth}</span>
										)}
									</div>
									<span className="text-xs text-gray-300 shrink-0 font-semibold">vs</span>
									<div className="min-w-0 flex-1 text-right">
										<span className={`block truncate text-sm font-bold ${hl2 ? "text-editorial-gold" : "text-editorial-ink"}`}>
											{t2Name ?? "TBD"}
										</span>
										{(getCountryFlag(t2Country) || t2Country) && (
											<span className="flex items-center justify-end gap-1 mt-0.5">
												{t2Country && <span className="text-xs text-gray-400 truncate">{t2Country}</span>}
												{getCountryFlag(t2Country) && <span className="text-base leading-none">{getCountryFlag(t2Country)}</span>}
											</span>
										)}
										{t2Booth != null && (
											<span className="text-[10px] font-mono text-gray-400">#{t2Booth}</span>
										)}
									</div>
								</div>

								{/* Status chip */}
								{status !== "upcoming" ? (
									<span className={`text-xs font-black uppercase tracking-widest px-2 py-1 shrink-0 ${STATUS_STYLES[status]}`}>
										{status === "live" ? "Live" : "✓"}
									</span>
								) : (
									<span />
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
