/**
 * Cache service for storing and retrieving sheet data
 * Helps app work offline or when network is unreliable
 */

interface CacheEntry {
	data: {
		junior: string[][];
		senior: string[][];
	};
	timestamp: number;
	phase: string;
	category: "junior" | "senior";
}

const CACHE_KEY_PREFIX = "sheet_cache_";
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Generate cache key based on phase and category
 */
function getCacheKey(phase: string, category: "junior" | "senior"): string {
	return `${CACHE_KEY_PREFIX}${phase}_${category}`;
}

/**
 * Save sheet data to cache
 */
export function setCacheData(
	phase: string,
	category: "junior" | "senior",
	data: { junior: string[][]; senior: string[][] },
): void {
	try {
		const cacheEntry: CacheEntry = {
			data,
			timestamp: Date.now(),
			phase,
			category,
		};
		localStorage.setItem(
			getCacheKey(phase, category),
			JSON.stringify(cacheEntry),
		);
	} catch (err) {
		// Silently fail if localStorage is full or unavailable
		console.warn("Failed to cache data:", err);
	}
}

/**
 * Get cached sheet data if it exists and is still valid
 */
export function getCacheData(
	phase: string,
	category: "junior" | "senior",
): { data: { junior: string[][]; senior: string[][] }; isCached: true } | null {
	try {
		const cached = localStorage.getItem(getCacheKey(phase, category));
		if (!cached) return null;

		const cacheEntry: CacheEntry = JSON.parse(cached);
		const now = Date.now();
		const age = now - cacheEntry.timestamp;

		// Return cached data if it's within expiry time
		if (age < CACHE_EXPIRY_TIME) {
			return {
				data: cacheEntry.data,
				isCached: true,
			};
		}

		// Cache expired, remove it
		localStorage.removeItem(getCacheKey(phase, category));
	} catch (err) {
		// Silently fail if cache is corrupted
		console.warn("Failed to retrieve cache:", err);
	}

	return null;
}

/**
 * Get the nearest available cached phase when the requested one isn't available
 * Searches in order of proximity: current, previous, next, etc.
 */
export function getNearestCachedPhase(
	requestedPhase: string,
	category: "junior" | "senior",
	phaseOrder: string[] = [
		"QUALIFIERS",
		"PRE_QUARTERS",
		"QUARTERS",
		"SEMIS",
		"THIRD_PLACE",
		"FINAL",
	],
): { phase: string; data: { junior: string[][]; senior: string[][] } } | null {
	try {
		// First, try the requested phase
		const directCache = getCacheData(requestedPhase, category);
		if (directCache) {
			return {
				phase: requestedPhase,
				data: directCache.data,
			};
		}

		// Find requested phase index
		const requestedIndex = phaseOrder.indexOf(requestedPhase);
		if (requestedIndex === -1) {
			// Unknown phase, try any available cache
			for (const phase of phaseOrder) {
				const cached = getCacheData(phase, category);
				if (cached) {
					console.warn(
						`Requested phase ${requestedPhase} not in order, using ${phase}`,
					);
					return {
						phase,
						data: cached.data,
					};
				}
			}
			return null;
		}

		// Search for nearest cached phase (alternating: prev, next, prev-1, next+1, etc.)
		for (let distance = 1; distance < phaseOrder.length; distance++) {
			// Try previous
			const prevIndex = requestedIndex - distance;
			if (prevIndex >= 0) {
				const prevPhase = phaseOrder[prevIndex];
				const cached = getCacheData(prevPhase, category);
				if (cached) {
					console.warn(
						`Fallback cache: ${requestedPhase} not available, using ${prevPhase}`,
					);
					return {
						phase: prevPhase,
						data: cached.data,
					};
				}
			}

			// Try next
			const nextIndex = requestedIndex + distance;
			if (nextIndex < phaseOrder.length) {
				const nextPhase = phaseOrder[nextIndex];
				const cached = getCacheData(nextPhase, category);
				if (cached) {
					console.warn(
						`Fallback cache: ${requestedPhase} not available, using ${nextPhase}`,
					);
					return {
						phase: nextPhase,
						data: cached.data,
					};
				}
			}
		}

		// No cache available at all
		return null;
	} catch (err) {
		console.warn("Error finding nearest cache:", err);
		return null;
	}
}
