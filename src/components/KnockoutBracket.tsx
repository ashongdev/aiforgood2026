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
import { useEffect, useMemo, useState } from "react";
import { getCountryFlag } from "../lib/countryFlag";
import type { Category, MatchWithTeams } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { AnimatedScore } from "./AnimatedScore";

// ─── Layout ─────────────────────────────────────────────────────────────────

const NODE_WIDTH = 220;
const NODE_HEIGHT = 116;

function layout(matchNodes: { id: string; parentId?: string }[], direction: "LR" | "TB") {
	const g = new dagre.graphlib.Graph();
	g.setGraph({ rankdir: direction, nodesep: 32, ranksep: 72 });
	g.setDefaultEdgeLabel(() => ({}));
	for (const n of matchNodes) {
		g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
	}
	for (const n of matchNodes) {
		if (n.parentId) g.setEdge(n.id, n.parentId);
	}
	dagre.layout(g);
	const positions: Record<string, { x: number; y: number }> = {};
	for (const n of matchNodes) {
		const p = g.node(n.id);
		positions[n.id] = { x: p.x - NODE_WIDTH / 2, y: p.y - NODE_HEIGHT / 2 };
	}
	return positions;
}

// ─── Match node (rendered inside the ReactFlow canvas) ─────────────────────

interface TeamRef {
	id: string;
	name: string;
}

type OpenBreakdown = (team1: TeamRef, team2: TeamRef | null, initialTeam: 1 | 2) => void;

interface MatchNodeData {
	match: MatchWithTeams | null;
	label: string;
	highlight?: boolean;
	onOpenBreakdown?: OpenBreakdown;
	[key: string]: unknown;
}

function TeamRow({
	name,
	country,
	score,
	wins,
	faded,
	onClick,
}: {
	name: string | undefined;
	country: string | null | undefined;
	score: number | string | null;
	wins: boolean;
	faded: boolean;
	onClick?: (e: React.MouseEvent) => void;
}) {
	return (
		<div
			onClick={onClick}
			className={`flex items-center gap-1.5 px-2.5 py-2 transition-opacity ${faded ? "opacity-35" : ""} ${
				wins ? "bg-editorial-gold/10" : ""
			} ${onClick ? "cursor-pointer" : ""}`}
		>
			<span className="w-3 shrink-0 text-[10px] leading-none text-editorial-gold">
				{wins ? "▶" : ""}
			</span>
			{getCountryFlag(country) && (
				<span className="shrink-0 text-sm leading-none">{getCountryFlag(country)}</span>
			)}
			<span
				className={`min-w-0 flex-1 truncate text-xs font-bold ${
					wins ? "text-editorial-ink" : "text-editorial-ink/80"
				}`}
			>
				{name ?? <span className="font-normal italic text-gray-300">TBD</span>}
			</span>
			{score !== null && (
				<span
					className={`shrink-0 font-mono text-base font-black ${
						wins ? "text-editorial-gold" : "text-editorial-ink/50"
					}`}
				>
					<AnimatedScore value={String(score)} />
				</span>
			)}
		</div>
	);
}

function MatchFlowNode({ data }: NodeProps & { data: MatchNodeData }) {
	const { match, label, highlight, onOpenBreakdown } = data;
	const t1 = match?.team_1;
	const t2 = match?.team_2;
	const t1Score = match?.team_1_final_points ?? match?.team_1_r1 ?? null;
	const t2Score = match?.team_2_final_points ?? match?.team_2_r1 ?? null;
	const t1Wins = !!match?.winner_id && match.winner_id === match.team_1_id;
	const t2Wins = !!match?.winner_id && match.winner_id === match.team_2_id;
	const decided = !!match?.winner_id;

	const team1Ref: TeamRef | null = t1 ? { id: t1.id, name: t1.team_name } : null;
	const team2Ref: TeamRef | null = t2 ? { id: t2.id, name: t2.team_name } : null;
	const clickable = !!onOpenBreakdown && !!(team1Ref || team2Ref);

	// Opens the breakdown modal for whichever team was clicked, keeping the
	// other team (if any) available for the modal's prev/next toggle.
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
			style={{ width: NODE_WIDTH }}
			onClick={() => openTeam(1)}
			className={`overflow-hidden rounded-md border bg-white shadow-sm transition-shadow ${
				highlight ? "border-editorial-gold" : "border-gray-200"
			} ${clickable ? "cursor-pointer hover:shadow-md" : ""}`}
		>
			<Handle type="target" position={Position.Left} style={{ opacity: 0, pointerEvents: "none" }} />
			<Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: "none" }} />
			<div className="flex items-center justify-between bg-editorial-ink px-2.5 py-1">
				<span className="text-[9px] font-black uppercase tracking-widest text-editorial-gold">
					{label}
				</span>
				{decided && (
					<span className="text-[9px] font-black uppercase tracking-widest text-white/40">
						Final
					</span>
				)}
			</div>
			<TeamRow
				name={t1?.team_name}
				country={t1?.country}
				score={t1Score}
				wins={t1Wins}
				faded={t2Wins}
				onClick={team1Ref ? (e) => { e.stopPropagation(); openTeam(1); } : undefined}
			/>
			<div className="h-px bg-editorial-ink/10" />
			<TeamRow
				name={t2?.team_name}
				country={t2?.country}
				score={t2Score}
				wins={t2Wins}
				faded={t1Wins}
				onClick={team2Ref ? (e) => { e.stopPropagation(); openTeam(2); } : undefined}
			/>
		</div>
	);
}

const nodeTypes = { match: MatchFlowNode };

// ─── Mini match card for the standalone 3rd place match ────────────────────

function BracketCard({
	match,
	label,
	onOpenBreakdown,
}: {
	match: MatchWithTeams | null;
	label: string;
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
	const isClickable = !!onOpenBreakdown && !!(team1Ref || team2Ref);

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
			className={`rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden ${
				isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""
			}`}
			onClick={() => openTeam(1)}
		>
			<div className="flex items-center justify-between px-2.5 py-1 bg-editorial-ink">
				<span className="text-[9px] font-black uppercase tracking-widest text-editorial-gold">
					{label}
				</span>
				{decided && (
					<span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
						Final
					</span>
				)}
			</div>
			<TeamRow
				name={t1?.team_name}
				country={t1?.country}
				score={t1Score}
				wins={t1Wins}
				faded={t2Wins}
				onClick={team1Ref ? (e) => { e.stopPropagation(); openTeam(1); } : undefined}
			/>
			<div className="h-px bg-editorial-ink/10" />
			<TeamRow
				name={t2?.team_name}
				country={t2?.country}
				score={t2Score}
				wins={t2Wins}
				faded={t1Wins}
				onClick={team2Ref ? (e) => { e.stopPropagation(); openTeam(2); } : undefined}
			/>
		</div>
	);
}

// ─── Self-contained bracket that fetches its own data ─────────────────────────

interface KnockoutBracketProps {
	category: Category;
	onOpenBreakdown?: OpenBreakdown;
}

export function KnockoutBracket({ category, onOpenBreakdown }: KnockoutBracketProps) {
	const [sfMatches, setSfMatches] = useState<MatchWithTeams[]>([]);
	const [finalMatch, setFinalMatch] = useState<MatchWithTeams | null>(null);
	const [thirdMatch, setThirdMatch] = useState<MatchWithTeams | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isVertical, setIsVertical] = useState(() => !window.matchMedia("(min-width: 640px)").matches);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 640px)");
		const onChange = () => setIsVertical(!mq.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);

	async function load() {
		const { data } = await supabase
			.from("matches")
			.select(
				"*, team_1:team_1_id(id,team_name,category,country,booth_number), team_2:team_2_id(id,team_name,category,country,booth_number), winner:winner_id(id,team_name,category)",
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
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "matches" },
				load,
			)
			.subscribe();
		return () => { supabase.removeChannel(ch); };
	}, [category]);

	const sf1 = sfMatches[0] ?? null;
	const sf2 = sfMatches[1] ?? null;
	const champion = finalMatch?.winner ?? null;
	const bronzeWinner = thirdMatch?.winner ?? null;

	const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
		const positions = layout(
			[
				{ id: "sf1", parentId: "final" },
				{ id: "sf2", parentId: "final" },
				{ id: "final" },
			],
			isVertical ? "TB" : "LR",
		);
		const mk = (id: string, match: MatchWithTeams | null, label: string, highlight = false): Node => ({
			id,
			type: "match",
			position: positions[id],
			data: { match, label, highlight, onOpenBreakdown } satisfies MatchNodeData,
			draggable: true,
		});
		return {
			nodes: [
				mk("sf1", sf1, "Semi-Final 1"),
				mk("sf2", sf2, "Semi-Final 2"),
				mk("final", finalMatch, "Final", true),
			],
			edges: [
				{ id: "e-sf1-final", source: "sf1", target: "final", type: "smoothstep", style: { stroke: "#d1d5db", strokeWidth: 2 } },
				{ id: "e-sf2-final", source: "sf2", target: "final", type: "smoothstep", style: { stroke: "#d1d5db", strokeWidth: 2 } },
			],
		};
	}, [sf1, sf2, finalMatch, onOpenBreakdown, isVertical]);

	if (isLoading) {
		return (
			<div className="py-16 text-center text-sm text-gray-400">
				Loading bracket…
			</div>
		);
	}

	const hasAnyMatch = sf1 || sf2 || finalMatch || thirdMatch;
	if (!hasAnyMatch) {
		return (
			<div className="py-16 text-center space-y-2 border border-gray-100">
				<p className="text-sm text-gray-400">Knockout bracket not set up yet.</p>
				<p className="text-xs text-gray-300">
					Admins can create Semi-Final matches from the Admin panel.
				</p>
			</div>
		);
	}

	return (
		<div className="w-full space-y-8 py-2">
			{/* Title */}
			<div>
				<h2 className="text-2xl font-black uppercase tracking-widest text-editorial-ink">
					Knockout Bracket
				</h2>
				<div className="w-12 h-1 bg-editorial-gold mt-2 mb-1" />
				<p className="text-xs text-gray-400">
					Semi-Finals → Final · 3rd Place
				</p>
			</div>

			{/* ── Bracket canvas — auto-laid-out with dagre, nodes can be dragged to rearrange ── */}
			<div
				className={`w-full rounded-md border border-editorial-ink/10 bg-editorial-ink/3 ${
					isVertical ? "h-110" : "h-100 sm:h-130"
				}`}
			>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					nodeTypes={nodeTypes}
					fitView
					fitViewOptions={{ padding: 0.25 }}
					minZoom={0.35}
					maxZoom={1.25}
					nodesDraggable
					nodesConnectable={false}
					panOnScroll
					zoomOnScroll={false}
					proOptions={{ hideAttribution: true }}
				>
					<Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(26,26,26,0.08)" />
				</ReactFlow>
			</div>

			{champion ? (
				<div className="flex items-center justify-center gap-2">
					<span className="text-lg leading-none">🏆</span>
					<span className="text-xs font-black uppercase tracking-widest text-editorial-gold">
						{champion.team_name}
					</span>
				</div>
			) : (
				<div className="flex items-center justify-center gap-2 opacity-40">
					<span className="text-lg leading-none">🏆</span>
					<span className="text-xs font-black uppercase tracking-widest text-gray-400">
						Champion TBD
					</span>
				</div>
			)}

			{/* ── 3rd Place ── */}
			{(thirdMatch || (sf1 && sf2)) && (
				<div>
					<div className="flex items-center gap-3 mb-3">
						<div className="h-px flex-1 bg-gray-100" />
						<p className="text-[9px] font-black uppercase tracking-widest text-gray-400 shrink-0">
							3rd Place Match
						</p>
						<div className="h-px flex-1 bg-gray-100" />
					</div>
					<div className="mx-auto md:max-w-xs">
						<BracketCard match={thirdMatch} label="3rd Place" onOpenBreakdown={onOpenBreakdown} />
					</div>
					{bronzeWinner ? (
						<div className="flex items-center gap-2 mt-2 px-1 justify-center md:justify-start">
							<span className="text-lg leading-none">🥉</span>
							<span className="text-xs font-black uppercase tracking-widest text-amber-600">
								{bronzeWinner.team_name}
							</span>
						</div>
					) : thirdMatch ? (
						<div className="flex items-center gap-2 mt-2 px-1 opacity-40 justify-center md:justify-start">
							<span className="text-lg leading-none">🥉</span>
							<span className="text-xs font-black uppercase tracking-widest text-gray-400">
								3rd Place TBD
							</span>
						</div>
					) : null}
				</div>
			)}
		</div>
	);
}
