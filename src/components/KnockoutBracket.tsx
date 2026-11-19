import dagre from "@dagrejs/dagre";
import {
	Background,
	BackgroundVariant,
	type Edge,
	Handle,
	type Node,
	type NodeProps,
	Position,
	ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCountryFlag } from "../lib/countryFlag";
import type { Category, MatchWithTeams } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { AnimatedScore } from "./AnimatedScore";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamRef {
	id: string;
	name: string;
}

type OpenBreakdown = (team1: TeamRef, team2: TeamRef | null, initialTeam: 1 | 2) => void;

// ─── One team line inside a match card ──────────────────────────────────────

function TeamRow({
	name,
	country,
	score,
	wins,
	faded,
	placeholder,
	onClick,
}: {
	name: string | undefined;
	country: string | null | undefined;
	score: number | string | null;
	wins: boolean;
	faded: boolean;
	/** Shown when the slot has no team yet, e.g. "Winner of Semi-Final 1". */
	placeholder: string;
	onClick?: () => void;
}) {
	const flag = getCountryFlag(country);
	const content = (
		<>
			<span
				aria-hidden
				className={`absolute inset-y-0 left-0 w-1 ${wins ? "bg-editorial-gold" : "bg-transparent"}`}
			/>
			{flag ? (
				<span className="w-6 shrink-0 text-center text-base leading-none">{flag}</span>
			) : (
				<span className="w-6 shrink-0 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
					{country?.slice(0, 2) ?? ""}
				</span>
			)}
			<span
				className={`min-w-0 flex-1 truncate text-left text-sm leading-tight ${
					name ? (wins ? "font-black text-editorial-ink" : "font-bold text-editorial-ink") : "font-medium italic text-gray-400"
				}`}
			>
				{name ?? placeholder}
			</span>
			{wins && (
				<span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-gray-500">
					Won
				</span>
			)}
			{score !== null && (
				<span
					className={`w-12 shrink-0 text-right font-mono text-xl font-black leading-none ${
						wins ? "text-editorial-ink" : "text-editorial-ink"
					}`}
				>
					<AnimatedScore value={String(score)} />
				</span>
			)}
		</>
	);

	const base = `relative flex w-full items-center gap-2 px-3 py-3 transition-opacity ${
		faded ? "opacity-40" : ""
	}`;

	if (!onClick) return <div className={base}>{content}</div>;
	return (
		<button
			type="button"
			onClick={onClick}
			className={`${base} cursor-pointer hover:bg-editorial-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-editorial-gold`}
			aria-label={`${name}${score !== null ? `, ${score} points` : ""}. Show score breakdown`}
		>
			{content}
		</button>
	);
}

// ─── A match card ───────────────────────────────────────────────────────────

function MatchCard({
	match,
	label,
	feeders,
	featured = false,
	onOpenBreakdown,
}: {
	match: MatchWithTeams | null;
	label: string;
	/** What fills an empty slot, e.g. ["Winner of Semi-Final 1", "Winner of Semi-Final 2"]. */
	feeders: [string, string];
	featured?: boolean;
	onOpenBreakdown?: OpenBreakdown;
}) {
	const t1 = match?.team_1;
	const t2 = match?.team_2;
	const t1Score = match?.team_1_final_points ?? match?.team_1_r1 ?? null;
	const t2Score = match?.team_2_final_points ?? match?.team_2_r1 ?? null;
	const t1Wins = !!match?.winner_id && match.winner_id === match.team_1_id;
	const t2Wins = !!match?.winner_id && match.winner_id === match.team_2_id;
	const decided = !!match?.winner_id;

	const team1Ref: TeamRef | null = t1 ? { id: t1.id, name: t1.team_name } : null;
	const team2Ref: TeamRef | null = t2 ? { id: t2.id, name: t2.team_name } : null;

	// Opens the breakdown for the clicked team, keeping the other team available for the modal's prev/next toggle.
	function openTeam(slot: 1 | 2) {
		if (!onOpenBreakdown) return;
		if (slot === 1 && team1Ref) onOpenBreakdown(team1Ref, team2Ref, 1);
		else if (slot === 2 && team2Ref) {
			if (team1Ref) onOpenBreakdown(team1Ref, team2Ref, 2);
			else onOpenBreakdown(team2Ref, null, 1);
		}
	}

	return (
		<div
			className={`w-full overflow-hidden border-2 bg-white ${
				featured
					? "border-editorial-ink shadow-[7px_7px_0px_0px_rgba(26,26,26,1)]"
					: "border-editorial-ink shadow-[5px_5px_0px_0px_rgba(26,26,26,1)]"
			}`}
		>
			<div className="flex items-center justify-between bg-editorial-ink px-3 py-1.5">
				<span className="text-[10px] font-black uppercase tracking-widest text-editorial-gold">{label}</span>
				<span
					className={`text-[9px] font-black uppercase tracking-widest ${
						decided ? "text-white/60" : "text-white/30"
					}`}
				>
					{decided ? "Completed" : t1Score !== null || t2Score !== null ? "In progress" : t1 && t2 ? "To play" : "Waiting"}
				</span>
			</div>
			<TeamRow
				name={t1?.team_name}
				country={t1?.country}
				score={t1Score}
				wins={t1Wins}
				faded={t2Wins}
				placeholder={feeders[0]}
				onClick={team1Ref ? () => openTeam(1) : undefined}
			/>
			<div className="h-px bg-editorial-ink/15" />
			<TeamRow
				name={t2?.team_name}
				country={t2?.country}
				score={t2Score}
				wins={t2Wins}
				faded={t1Wins}
				placeholder={feeders[1]}
				onClick={team2Ref ? () => openTeam(2) : undefined}
			/>
		</div>
	);
}

// ─── Champion / bronze panel ────────────────────────────────────────────────

function Medal({
	title,
	teamName,
	country,
	tone,
}: {
	title: string;
	teamName: string | null | undefined;
	country?: string | null;
	tone: "gold" | "bronze";
}) {
	const known = !!teamName;
	const flag = getCountryFlag(country);
	const accent = tone === "gold" ? "text-editorial-gold" : "text-amber-700";
	return (
		<div
			className={`flex w-full flex-col items-center gap-1.5 border-2 px-4 py-5 text-center ${
				known ? "border-editorial-ink bg-white" : "border-dashed border-editorial-ink/20 bg-white/50"
			}`}
		>
			<Trophy
				size={tone === "gold" ? 30 : 22}
				strokeWidth={1.75}
				className={known ? accent : "text-gray-300"}
				aria-hidden
			/>
			<span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{title}</span>
			{known ? (
				<span className="flex items-center gap-1.5">
					{flag && <span className="text-lg leading-none">{flag}</span>}
					<span className="font-serif text-xl font-black italic leading-tight text-editorial-ink">{teamName}</span>
				</span>
			) : (
				<span className="text-sm font-medium italic text-gray-400">To be decided</span>
			)}
		</div>
	);
}

// ─── Connector for the stacked (phone) layout ───────────────────────────────

function DownLine({ done }: { done: boolean }) {
	return <span aria-hidden className={`mx-auto block h-7 w-0.5 ${done ? "bg-editorial-ink" : "bg-editorial-ink/25"}`} />;
}

function ColumnTitle({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{children}</p>
	);
}

// ─── Large screens: ReactFlow canvas, laid out automatically with dagre ─────

const NODE_W = 300;
const MATCH_H = 124;
const MEDAL_H = 112;

interface FlowData {
	[key: string]: unknown;
	kind: "match" | "medal" | "stage";
	match?: MatchWithTeams | null;
	label?: string;
	feeders?: [string, string];
	featured?: boolean;
	title?: string;
	teamName?: string | null;
	country?: string | null;
	tone?: "gold" | "bronze";
	text?: string;
	onOpenBreakdown?: OpenBreakdown;
}

function FlowNode({ data }: NodeProps & { data: FlowData }) {
	const hidden = { opacity: 0, pointerEvents: "none" as const };
	if (data.kind === "stage") {
		return (
			<p style={{ width: NODE_W }} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
				{data.text}
			</p>
		);
	}
	return (
		<div style={{ width: NODE_W }}>
			<Handle type="target" position={Position.Left} style={hidden} />
			<Handle type="source" position={Position.Right} style={hidden} />
			{data.kind === "match" ? (
				<MatchCard
					match={data.match ?? null}
					label={data.label ?? ""}
					feeders={data.feeders ?? ["", ""]}
					featured={data.featured}
					onOpenBreakdown={data.onOpenBreakdown}
				/>
			) : (
				<Medal title={data.title ?? ""} teamName={data.teamName} country={data.country} tone={data.tone ?? "gold"} />
			)}
		</div>
	);
}

const nodeTypes = { flow: FlowNode };

const GOLD = "#1a1a1a";
const GREY = "rgba(26,26,26,0.28)";

function BracketCanvas({
	sf1,
	sf2,
	finalMatch,
	thirdMatch,
	onOpenBreakdown,
}: {
	sf1: MatchWithTeams | null;
	sf2: MatchWithTeams | null;
	finalMatch: MatchWithTeams | null;
	thirdMatch: MatchWithTeams | null;
	onOpenBreakdown?: OpenBreakdown;
}) {
	const { nodes, edges, height } = useMemo(() => {
		const champion = finalMatch?.winner ?? null;
		const bronze = thirdMatch?.winner ?? null;
		const spec: { id: string; h: number; data: FlowData }[] = [
			{ id: "sf1", h: MATCH_H, data: { kind: "match", match: sf1, label: "Semi-Final 1", feeders: ["Team to be decided", "Team to be decided"], onOpenBreakdown } },
			{ id: "sf2", h: MATCH_H, data: { kind: "match", match: sf2, label: "Semi-Final 2", feeders: ["Team to be decided", "Team to be decided"], onOpenBreakdown } },
			{ id: "final", h: MATCH_H, data: { kind: "match", match: finalMatch, label: "Final", feeders: ["Winner of Semi-Final 1", "Winner of Semi-Final 2"], featured: true, onOpenBreakdown } },
			{ id: "third", h: MATCH_H, data: { kind: "match", match: thirdMatch, label: "3rd Place", feeders: ["Loser of Semi-Final 1", "Loser of Semi-Final 2"], onOpenBreakdown } },
			{ id: "champion", h: MEDAL_H, data: { kind: "medal", title: "Champion", teamName: champion?.team_name, country: champion?.country, tone: "gold" } },
			{ id: "bronze", h: MEDAL_H, data: { kind: "medal", title: "Bronze", teamName: bronze?.team_name, country: bronze?.country, tone: "bronze" } },
		];
		// Columns come from dagre (the links say who feeds whom). The 3rd-place match is fed by the semi-final losers; that link is used for
		// the layout only and is not drawn.
		const links: { from: string; to: string; won: boolean; draw: boolean }[] = [
			{ from: "sf1", to: "final", won: !!sf1?.winner_id, draw: true },
			{ from: "sf2", to: "final", won: !!sf2?.winner_id, draw: true },
			{ from: "sf1", to: "third", won: false, draw: false },
			{ from: "sf2", to: "third", won: false, draw: false },
			{ from: "final", to: "champion", won: !!finalMatch?.winner_id, draw: true },
			{ from: "third", to: "bronze", won: !!thirdMatch?.winner_id, draw: true },
		];

		const g = new dagre.graphlib.Graph();
		g.setGraph({ rankdir: "LR", nodesep: 36, ranksep: 96, marginx: 8, marginy: 8 });
		g.setDefaultEdgeLabel(() => ({}));
		for (const n of spec) g.setNode(n.id, { width: NODE_W, height: n.h });
		for (const l of links) g.setEdge(l.from, l.to);
		dagre.layout(g);

		// Rows: semi-finals on top of each other, the final centred between them, the 3rd-place match under the final.
		const GAP = 56;
		const top: Record<string, number> = {};
		top.sf1 = 0;
		top.sf2 = MATCH_H + GAP;
		top.final = (top.sf1 + top.sf2) / 2;
		top.third = top.final + MATCH_H + GAP + 24;
		top.champion = top.final + (MATCH_H - MEDAL_H) / 2;
		top.bronze = top.third + (MATCH_H - MEDAL_H) / 2;

		const nodes: Node[] = spec.map((n) => ({
			id: n.id,
			type: "flow",
			position: { x: g.node(n.id).x - NODE_W / 2, y: top[n.id] },
			data: n.data,
			draggable: false,
			selectable: false,
		}));
		const heading = (id: string, text: string, ref: string, y: number): Node => ({
			id,
			type: "flow",
			position: { x: g.node(ref).x - NODE_W / 2, y },
			data: { kind: "stage", text },
			draggable: false,
			selectable: false,
			focusable: false,
		});
		nodes.push(
			heading("h-sf", "Semi-Finals", "sf1", -30),
			heading("h-final", "Final", "final", top.final - 30),
			heading("h-third", "3rd Place Match", "third", top.third - 30),
		);
		const edges: Edge[] = links
			.filter((l) => l.draw)
			.map((l) => ({
				id: `${l.from}-${l.to}`,
				source: l.from,
				target: l.to,
				type: "smoothstep",
				style: { stroke: l.won ? GOLD : GREY, strokeWidth: 2.5 },
			}));
		const bottom = top.third + MATCH_H;
		return { nodes, edges, height: bottom + 30 + 24 };
	}, [sf1, sf2, finalMatch, thirdMatch, onOpenBreakdown]);

	return (
		<div className="w-full border-2 border-editorial-ink/10 bg-white/40" style={{ height }}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				fitView
				fitViewOptions={{ padding: 0.03, maxZoom: 1.1 }}
				minZoom={0.5}
				maxZoom={1.25}
				nodesDraggable={false}
				nodesConnectable={false}
				elementsSelectable={false}
				panOnDrag={false}
				zoomOnScroll={false}
				zoomOnPinch={false}
				zoomOnDoubleClick={false}
				preventScrolling={false}
				proOptions={{ hideAttribution: true }}
			>
				<Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(26,26,26,0.10)" />
			</ReactFlow>
		</div>
	);
}

// ─── Self-contained bracket that fetches its own data ───────────────────────

interface KnockoutBracketProps {
	category: Category;
	onOpenBreakdown?: OpenBreakdown;
}

export function KnockoutBracket({ category, onOpenBreakdown }: KnockoutBracketProps) {
	const [sfMatches, setSfMatches] = useState<MatchWithTeams[]>([]);
	const [finalMatch, setFinalMatch] = useState<MatchWithTeams | null>(null);
	const [thirdMatch, setThirdMatch] = useState<MatchWithTeams | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	async function load() {
		const { data } = await supabase
			.from("matches")
			.select(
				"*, team_1:team_1_id(id,team_name,category,country,booth_number), team_2:team_2_id(id,team_name,category,country,booth_number), winner:winner_id(id,team_name,category,country)",
			)
			.eq("category", category)
			.in("phase", ["Semifinals", "Finals", "Third Place"])
			.order("match_order", { ascending: true });

		if (data) {
			const rows = data as MatchWithTeams[];
			setSfMatches(rows.filter((m) => m.phase === "Semifinals"));
			setFinalMatch(rows.find((m) => m.phase === "Finals") ?? null);
			setThirdMatch(rows.find((m) => m.phase === "Third Place") ?? null);
		}
		setIsLoading(false);
	}

	useEffect(() => {
		load();
		const ch = supabase
			.channel(`knockout-${category}`)
			.on("postgres_changes", { event: "*", schema: "public", table: "matches" }, load)
			.subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [category]);

	const sf1 = sfMatches[0] ?? null;
	const sf2 = sfMatches[1] ?? null;
	const champion = finalMatch?.winner ?? null;
	const bronzeWinner = thirdMatch?.winner ?? null;
	const sf1Done = !!sf1?.winner_id;
	const sf2Done = !!sf2?.winner_id;
	const finalDone = !!finalMatch?.winner_id;

	if (isLoading) {
		return <div className="py-16 text-center text-sm text-gray-400">Loading bracket…</div>;
	}

	if (!(sf1 || sf2 || finalMatch || thirdMatch)) {
		return (
			<div className="space-y-2 border border-gray-100 py-16 text-center">
				<p className="text-sm text-gray-400">Knockout bracket not set up yet.</p>
				<p className="text-xs text-gray-300">Admins can create Semi-Final matches from the Admin panel.</p>
			</div>
		);
	}

	const sf1Card = (
		<MatchCard
			match={sf1}
			label="Semi-Final 1"
			feeders={["Team to be decided", "Team to be decided"]}
			onOpenBreakdown={onOpenBreakdown}
		/>
	);
	const sf2Card = (
		<MatchCard
			match={sf2}
			label="Semi-Final 2"
			feeders={["Team to be decided", "Team to be decided"]}
			onOpenBreakdown={onOpenBreakdown}
		/>
	);
	const finalCard = (
		<MatchCard
			match={finalMatch}
			label="Final"
			feeders={["Winner of Semi-Final 1", "Winner of Semi-Final 2"]}
			featured
			onOpenBreakdown={onOpenBreakdown}
		/>
	);

	return (
		<div className="w-full space-y-10 py-2">
			{/* Title */}
			<div>
				<h2 className="text-2xl font-black uppercase tracking-widest text-editorial-ink">Knockout Bracket</h2>
				<div className="mb-2 mt-2 h-1 w-12 bg-editorial-gold" />
				<p className="text-xs text-gray-500">
					Semi-Finals → Final · 3rd Place. Tap a team to see how its score was made.
				</p>
			</div>

			{/* ── Large screens: semi-finals → final → champion, laid out automatically ── */}
			<div className="hidden lg:block">
				<BracketCanvas
					sf1={sf1}
					sf2={sf2}
					finalMatch={finalMatch}
					thirdMatch={thirdMatch}
					onOpenBreakdown={onOpenBreakdown}
				/>
			</div>

			{/* ── Phones and tablets: stacked, top to bottom ── */}
			<div className="mx-auto flex max-w-md flex-col lg:hidden">
				<ColumnTitle>Semi-Finals</ColumnTitle>
				<div className="mt-3 space-y-6">
					{sf1Card}
					{sf2Card}
				</div>
				<DownLine done={sf1Done && sf2Done} />
				<ColumnTitle>Final</ColumnTitle>
				<div className="mt-3">{finalCard}</div>
				<DownLine done={finalDone} />
				<Medal title="Champion" teamName={champion?.team_name} country={champion?.country} tone="gold" />
			</div>

			{/* ── 3rd place (phones and tablets; on large screens it is part of the canvas) ── */}
			{(thirdMatch || (sf1 && sf2)) && (
				<div className="lg:hidden">
					<div className="mb-4 flex items-center gap-3">
						<div className="h-px flex-1 bg-editorial-ink/15" />
						<p className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
							3rd Place Match
						</p>
						<div className="h-px flex-1 bg-editorial-ink/15" />
					</div>
					<div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] md:items-center">
						<MatchCard
							match={thirdMatch}
							label="3rd Place"
							feeders={["Loser of Semi-Final 1", "Loser of Semi-Final 2"]}
							onOpenBreakdown={onOpenBreakdown}
						/>
						<Medal
							title="Bronze"
							teamName={bronzeWinner?.team_name}
							country={bronzeWinner?.country}
							tone="bronze"
						/>
					</div>
				</div>
			)}
		</div>
	);
}
