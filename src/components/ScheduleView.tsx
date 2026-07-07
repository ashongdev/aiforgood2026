import { Calendar, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCountryFlag } from "../lib/countryFlag";
import type { Category, MatchWithTeams } from "../lib/database.types";
import { tc } from "../lib/format";
import { supabase } from "../lib/supabase";

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
			.select(
				"*, team_1:team_1_id(id,team_name,category,country,booth_number), team_2:team_2_id(id,team_name,category,country,booth_number), winner:winner_id(id,team_name,category)",
			)
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
			(m) =>
				!m.winner_id &&
				m.scheduled_time &&
				new Date(m.scheduled_time) > new Date(now),
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
					No scheduled matches yet. Admins can set times in the Admin
					panel.
				</p>
			</div>
		);
	}

	return (
		<div className="w-full space-y-4 pb-8">
			{/* Next up banner */}
			{nextUpMatch && (
				<div className="border-l-4 border-editorial-gold bg-editorial-gold/5 px-4 py-3 flex items-center gap-3 flex-wrap">
					<span className="text-[10px] font-black uppercase tracking-widest text-editorial-gold shrink-0">
						Next up
					</span>
					<span className="text-sm font-semibold text-editorial-ink">
						{tc(nextUpMatch.team_1?.team_name) || "TBD"} vs{" "}
						{tc(nextUpMatch.team_2?.team_name) || "TBD"}
					</span>
					<span className="text-xs text-gray-500 ml-auto shrink-0">
						{new Date(
							nextUpMatch.scheduled_time!,
						).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>
			)}

			{/* Search */}
			<div className="relative">
				<Search
					size={14}
					className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
				/>
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
						const highlight1 =
							q && m.team_1?.team_name?.toLowerCase().includes(q);
						const highlight2 =
							q && m.team_2?.team_name?.toLowerCase().includes(q);
						const t1 = m.team_1 as {
							booth_number?: number | null;
							country?: string | null;
						} | null;
						const t2 = m.team_2 as {
							booth_number?: number | null;
							country?: string | null;
						} | null;
						const booth1 = t1?.booth_number;
						const booth2 = t2?.booth_number;
						const country1 = t1?.country ?? null;
						const country2 = t2?.country ?? null;
						const flag1 = getCountryFlag(country1);
						const flag2 = getCountryFlag(country2);
						return (
							<div
								key={m.id}
								className="px-4 py-4 grid grid-cols-[4.5rem_1fr_auto] items-center gap-3"
							>
								{/* Time + table */}
								<div className="shrink-0">
									<p className="text-sm font-bold text-editorial-ink leading-tight">
										{new Date(
											m.scheduled_time!,
										).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
									<p className="text-xs text-gray-400 leading-tight">
										T{m.table_number ?? "—"}
									</p>
								</div>

								{/* Teams */}
								<div className="min-w-0 flex items-center gap-2">
									<div className="min-w-0 flex-1">
										<span
											className={`block truncate text-sm font-bold ${highlight1 ? "text-editorial-gold" : "text-editorial-ink"}`}
										>
											{tc(m.team_1?.team_name) || "TBD"}
										</span>
										{(flag1 || country1) && (
											<span className="flex items-center gap-1 mt-0.5">
												{flag1 && (
													<span className="text-base leading-none">
														{flag1}
													</span>
												)}
												{country1 && (
													<span className="text-xs text-gray-400 truncate">
														{country1}
													</span>
												)}
											</span>
										)}
										{booth1 && (
											<span className="text-[10px] font-mono text-gray-400">
												#{booth1}
											</span>
										)}
									</div>
									<span className="text-xs text-gray-300 shrink-0 font-semibold">
										vs
									</span>
									<div className="min-w-0 flex-1 text-right">
										<span
											className={`block truncate text-sm font-bold ${highlight2 ? "text-editorial-gold" : "text-editorial-ink"}`}
										>
											{tc(m.team_2?.team_name) || "TBD"}
										</span>
										{(flag2 || country2) && (
											<span className="flex items-center justify-end gap-1 mt-0.5">
												{country2 && (
													<span className="text-xs text-gray-400 truncate">
														{country2}
													</span>
												)}
												{flag2 && (
													<span className="text-base leading-none">
														{flag2}
													</span>
												)}
											</span>
										)}
										{booth2 && (
											<span className="text-[10px] font-mono text-gray-400">
												#{booth2}
											</span>
										)}
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
