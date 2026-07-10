export function LockedScoreboardScreen() {
	return (
		<div className="w-full max-w-6xl mx-auto flex items-center justify-center py-20">
			<div className="text-center space-y-4">
				<div className="inline-flex items-center justify-center w-20 h-20 border-2 border-editorial-gold bg-editorial-gold/10">
					<span className="text-4xl leading-none animate-pulse">⏳</span>
				</div>
				<div>
					<h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-editorial-ink mb-2">
						Verifying Scores
					</h2>
					<p className="text-base text-gray-600 max-w-sm mx-auto">
						Organizers are reviewing and verifying the scores.
						Results will be published shortly.
					</p>
				</div>
				<div className="pt-4">
					<p className="text-sm text-gray-400">
						Check back soon for updates
					</p>
				</div>
			</div>
		</div>
	);
}

export function isScoreboardLocked(data: string[][]): boolean {
	if (!data || data.length === 0) return false;
	return data.some((row) => {
		// Check both column 6 (bracket phases) and column 7 (qualifiers)
		const rankingValue6 = row[6]?.trim().toLowerCase();
		const rankingValue7 = row[7]?.trim().toLowerCase();
		return rankingValue6 === "locked" || rankingValue7 === "locked";
	});
}
