import { useEffect, useMemo, useState } from "react";
import { Calendar, Search } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Category, MatchWithTeams } from "../lib/database.types";

type ScheduleStatus = "upcoming" | "live" | "done";

function matchStatus(m: MatchWithTeams): ScheduleStatus {
	if (m.winner_id) return "done";
	const t = m.scheduled_time ? new Date(m.scheduled_time).getTime() : null;
	if (t && Date.now() >= t && Date.now() <= t + 90 * 60 * 1000) return "live";
	return "upcoming";
}

const STATUS_STYLES: Record<ScheduleStatus, string> = {
	upcoming: "bg-gray-100 text-gray-500",
	live: "bg-editorial-gold/20 text-editorial-gold border border-editorial-gold/60 animate-pulse",
	done: "bg-editorial-green/10 text-editorial-green border border-editorial-green/30",
};

export function ScheduleView({ category }: { category: Category }) {
	const [matches, setMatches] = useState<MatchWithTeams[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		setIsLoading(true);
		supabase
			.from("matches")
			.select("*, team_1:team_1_id(id,team_name,category), team_2:team_2_id(id,team_name,category), winner:winner_id(id,team_name,category)")
			.eq("category", category)
			.not("scheduled_time", "is", null)
			.order("scheduled_time", { ascending: true })
			.then(({ data }) => {
				setMatches((data as MatchWithTeams[]) ?? []);
				setIsLoading(false);
			});
	}, [category]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return matches;
		return matches.filter(
			(m) =>
				m.team_1?.team_name?.toLowerCase().includes(q) ||
				m.team_2?.team_name?.toLowerCase().includes(q),
		);
	}, [matches, search]);

	const nextUpMatch = useMemo(() => {
		const upcoming = matches.filter(
			(m) => !m.winner_id && m.scheduled_time && new Date(m.scheduled_time) > new Date(now),
		);
		return upcoming[0] ?? null;
	}, [matches, now]);

	if (isLoading) {
		return (
			<div className="py-16 text-center text-sm text-gray-400">
				Loading schedule…
			</div>
		);
	}

	if (matches.length === 0) {
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
		<div className="w-full max-w-2xl mx-auto space-y-4 pb-8">
			{/* Next up banner */}
			{nextUpMatch && (
				<div className="border-l-4 border-editorial-gold bg-editorial-gold/5 px-4 py-3 flex items-center gap-3 flex-wrap">
					<span className="text-[10px] font-black uppercase tracking-widest text-editorial-gold shrink-0">
						Next up
					</span>
					<span className="text-sm font-semibold text-editorial-ink">
						{nextUpMatch.team_1?.team_name ?? "TBD"} vs{" "}
						{nextUpMatch.team_2?.team_name ?? "TBD"}
					</span>
					<span className="text-xs text-gray-500 ml-auto shrink-0">
						{new Date(nextUpMatch.scheduled_time!).toLocaleString([], {
							weekday: "short",
							month: "short",
							day: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>
			)}

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

			{/* Match list */}
			<div className="border border-gray-200 bg-white divide-y divide-gray-100">
				{filtered.length === 0 ? (
					<div className="py-8 text-center text-sm text-gray-400">
						No matches match "{search}".
					</div>
				) : (
					filtered.map((m) => {
						const status = matchStatus(m);
						const q = search.trim().toLowerCase();
						const highlight1 = q && m.team_1?.team_name?.toLowerCase().includes(q);
						const highlight2 = q && m.team_2?.team_name?.toLowerCase().includes(q);
						return (
							<div key={m.id} className="px-4 py-3 flex items-center gap-3 flex-wrap text-sm">
								{/* Time + phase */}
								<div className="shrink-0 w-28">
									<p className="text-xs font-semibold text-editorial-ink">
										{new Date(m.scheduled_time!).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
									<p className="text-[10px] text-gray-400">
										{new Date(m.scheduled_time!).toLocaleDateString([], {
											month: "short",
											day: "numeric",
										})}{" "}
										· T{m.table_number ?? "—"}
									</p>
									<p className="text-[10px] text-gray-400 truncate">{m.phase}</p>
								</div>

								{/* Teams */}
								<div className="flex-1 min-w-0 flex items-center gap-2">
									<span className={`flex-1 truncate font-semibold ${highlight1 ? "text-editorial-gold" : "text-editorial-ink"}`}>
										{m.team_1?.team_name ?? "TBD"}
									</span>
									<span className="text-xs text-gray-300 shrink-0">vs</span>
									<span className={`flex-1 truncate font-semibold text-right ${highlight2 ? "text-editorial-gold" : "text-editorial-ink"}`}>
										{m.team_2?.team_name ?? "TBD"}
									</span>
								</div>

								{/* Status chip */}
								<span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 shrink-0 ${STATUS_STYLES[status]}`}>
									{status === "done" ? `✓ ${m.winner?.team_name ?? "Done"}` : status === "live" ? "Live" : "Upcoming"}
								</span>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
