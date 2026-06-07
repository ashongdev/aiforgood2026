import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useOnlineStatus } from "./useOnlineStatus";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueuedWrite {
	qid: string; // unique queue entry id
	matchId: string;
	update: Record<string, number | null>;
	timestamp: number;
}

const STORAGE_KEY = "sk_offline_queue";

function readQueue(): QueuedWrite[] {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
	} catch {
		return [];
	}
}

function writeQueue(q: QueuedWrite[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseOfflineQueueResult {
	isOnline: boolean;
	pendingCount: number;
	isFlushing: boolean;
	/** Enqueue a write. Returns true if queued (offline), false if should write directly. */
	enqueue: (matchId: string, update: Record<string, number | null>) => boolean;
	/** Manually trigger a flush (usually called after reconnect). */
	flush: () => Promise<void>;
}

export function useOfflineQueue(onFlushComplete?: () => void): UseOfflineQueueResult {
	const isOnline = useOnlineStatus();
	const [queue, setQueue] = useState<QueuedWrite[]>(readQueue);
	const [isFlushing, setIsFlushing] = useState(false);
	const flushingRef = useRef(false);

	// Sync queue state to localStorage whenever it changes
	useEffect(() => {
		writeQueue(queue);
	}, [queue]);

	const enqueue = useCallback((matchId: string, update: Record<string, number | null>): boolean => {
		if (navigator.onLine) return false; // caller should write directly
		const entry: QueuedWrite = {
			qid: `${matchId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			matchId,
			update,
			timestamp: Date.now(),
		};
		setQueue((prev) => {
			const next = [...prev, entry];
			writeQueue(next);
			return next;
		});
		return true;
	}, []);

	const flush = useCallback(async () => {
		if (flushingRef.current) return;
		const pending = readQueue();
		if (pending.length === 0) return;

		flushingRef.current = true;
		setIsFlushing(true);

		const failed: QueuedWrite[] = [];

		for (const entry of pending) {
			try {
				const { error } = await supabase
					.from("matches")
					.update(entry.update)
					.eq("id", entry.matchId);
				if (error) {
					console.warn("[OfflineQueue] Flush error for", entry.matchId, error.message);
					failed.push(entry);
				}
			} catch {
				failed.push(entry);
			}
		}

		setQueue(failed);
		writeQueue(failed);
		flushingRef.current = false;
		setIsFlushing(false);

		if (failed.length === 0) {
			onFlushComplete?.();
		}
	}, [onFlushComplete]);

	// Auto-flush when we come back online
	useEffect(() => {
		if (isOnline && queue.length > 0) {
			flush();
		}
	}, [isOnline]);

	return {
		isOnline,
		pendingCount: queue.length,
		isFlushing,
		enqueue,
		flush,
	};
}
