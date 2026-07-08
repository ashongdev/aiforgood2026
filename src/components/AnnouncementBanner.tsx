import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../lib/supabase";

export type Importance = "info" | "warning" | "urgent";

interface Announcement {
	message: string;
	importance: Importance;
}

const STYLES: Record<Importance, { bg: string; label: string; text: string; border: string }> = {
	info:    { bg: "bg-blue-600",   label: "INFO",   text: "text-white", border: "border-blue-700" },
	warning: { bg: "bg-amber-500",  label: "NOTICE", text: "text-white", border: "border-amber-600" },
	urgent:  { bg: "bg-red-600",    label: "URGENT", text: "text-white", border: "border-red-700" },
};

const DISMISS_KEY = "banner_dismissed_id";

export function AnnouncementBanner() {
	const [ann, setAnn] = useState<Announcement | null>(null);
	const [dismissed, setDismissed] = useState(false);
	const [dbId, setDbId] = useState<number | null>(null);

	useEffect(() => {
		supabase
			.from("announcements")
			.select("id, message, importance")
			.eq("id", 1)
			.maybeSingle()
			.then(({ data }) => {
				if (data) {
					setDbId(data.id);
					const savedDismiss = sessionStorage.getItem(DISMISS_KEY);
					setDismissed(savedDismiss === String(data.id) + ":" + data.message);
					setAnn({ message: data.message, importance: data.importance as Importance });
				}
			});

		const channel = supabase
			.channel("announcements-banner")
			.on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, (payload) => {
				if (payload.eventType === "DELETE") {
					setAnn(null);
					setDismissed(false);
				} else {
					const row = payload.new as { id: number; message: string; importance: string };
					setDbId(row.id);
					// New/updated message clears the dismiss state
					const savedDismiss = sessionStorage.getItem(DISMISS_KEY);
					const key = String(row.id) + ":" + row.message;
					setDismissed(savedDismiss === key);
					setAnn({ message: row.message, importance: row.importance as Importance });
				}
			})
			.subscribe();

		return () => { supabase.removeChannel(channel); };
	}, []);

	function dismiss() {
		if (dbId !== null && ann) {
			sessionStorage.setItem(DISMISS_KEY, String(dbId) + ":" + ann.message);
		}
		setDismissed(true);
	}

	if (!ann || dismissed) return null;

	const s = STYLES[ann.importance];
	const duration = Math.max(12, ann.message.length * 0.12) + "s";

	return (
		<>
			{/* Fixed bar at top of viewport */}
			<div className={`fixed top-0 left-0 right-0 z-50 h-10 flex items-center ${s.bg} ${s.text} shadow-md`}>
				{/* Importance label */}
				<span className={`shrink-0 px-3 h-full flex items-center text-[10px] font-black uppercase tracking-widest border-r ${s.border} border-white/20`}>
					{s.label}
				</span>

				{/* Scrolling text */}
				<div className="flex-1 overflow-hidden relative h-full flex items-center">
					<span
						className="whitespace-nowrap text-sm font-semibold absolute"
						style={{ animation: `ticker ${duration} linear infinite` }}
					>
						{ann.message}
					</span>
				</div>

				{/* Dismiss for this session */}
				<button
					onClick={dismiss}
					className={`shrink-0 px-3 h-full flex items-center border-l ${s.border} border-white/20 hover:bg-black/10 transition-colors`}
					aria-label="Dismiss banner"
				>
					<X size={14} />
				</button>
			</div>

			{/* Flow spacer so page content starts below the fixed bar */}
			<div className="h-10 shrink-0" />
		</>
	);
}
