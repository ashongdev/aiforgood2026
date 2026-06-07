import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BookOpen, RotateCcw } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import ReactGA from "react-ga4";
import { BracketList } from "./components/BracketList";
import { BracketPhaseView } from "./components/BracketPhaseView";
import { CategoryToggle } from "./components/CategoryToggle";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { MatchDetailView } from "./components/MatchDetailView";
import { PhaseNavigation } from "./components/PhaseNavigation";
import { QualifiersTable } from "./components/QualifiersTable";
import { RulesPage } from "./components/RulesPage";
import { useEffects } from "./hooks/useEffects";
import { getNearestCachedPhase, setCacheData } from "./lib/cacheService";
import type { Match } from "./lib/matchService";
import { transformSheetDataToMatches } from "./lib/matchService";

declare const gapi: any;

interface BracketPhase {
	phaseName: string;
	junior: Match[];
	senior: Match[];
}

export default function App() {
	useEffect(() => {
		ReactGA.initialize("G-Z8EWG2FKDC");
		ReactGA.send({ hitType: "pageview", page: window.location.pathname });
	}, []);

	const [currentPhaseSheetName, setCurrentPhaseSheetName] = useState<string>(
		() => {
			return (
				localStorage.getItem("currentPhaseSheetName") || "QUALIFIERS"
			);
		},
	);
	const [currentPhase, setCurrentPhase] = useState<number>(0);
	const [category, setCategory] = useState<"junior" | "senior">(() => {
		const saved = localStorage.getItem("selectedCategory");
		return (saved as "junior" | "senior") || "junior";
	});
	const [selectedMatch, setSelectedMatch] = useState<any>(null);
	const [shared, setShared] = useState(false);
	const [isInfoOpen, setIsInfoOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState<"bracket" | "rules">(
		"bracket",
	);
	const [refreshCount, setRefreshCount] = useState(0);
	const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
	const [teamCount, setTeamCount] = useState(0);
	const [isViewingCachedData, setIsViewingCachedData] = useState(false);
	const [fallbackPhaseMessage, setFallbackPhaseMessage] = useState<
		string | null
	>(null);
	const { effects, triggerEffect } = useEffects();

	// Persist category to localStorage
	useEffect(() => {
		localStorage.setItem("selectedCategory", category);
	}, [category]);

	// Persist phase sheet name to localStorage
	useEffect(() => {
		localStorage.setItem("currentPhaseSheetName", currentPhaseSheetName);
	}, [currentPhaseSheetName]);

	// Reset refresh count when phase or category changes
	useEffect(() => {
		setRefreshCount(0);
		setLastRefreshTime(0);
		setFallbackPhaseMessage(null);
	}, [currentPhase, category]);

	// Fetch team count on mount to determine PRE_QUARTERS visibility
	useEffect(() => {
		const fetchTeamCount = async () => {
			const spreadSheetId =
				category == "senior"
					? import.meta.env.VITE_SENIOR_SPREADSHEET_ID
					: import.meta.env.VITE_JUNIOR_SPREADSHEET_ID;

			const promise = new Promise<number>((resolve) => {
				// Check if gapi is available (requires internet connection to load)
				if (typeof gapi === "undefined") {
					console.warn(
						"Google API not available - offline or network error",
					);
					resolve(0);
					return;
				}

				try {
					gapi.load("client", () => {
						gapi.client
							.init({
								apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
								discoveryDocs: [
									"https://sheets.googleapis.com/$discovery/rest?version=v4",
								],
							})
							.then(() => {
								return (
									gapi.client as any
								).sheets.spreadsheets.values.get({
									spreadsheetId: spreadSheetId,
									range: "QUALIFIERS!I2:I2",
									valueRenderOption: "FORMATTED_VALUE",
								});
							})
							.then((response: any) => {
								const count =
									response?.result?.values?.[0]?.[0];
								resolve(count ? parseInt(count, 10) : 0);
							})
							.catch(() => resolve(0));
					});
				} catch (err) {
					console.warn("Error loading team count:", err);
					resolve(0);
				}
			});

			const count = await promise;
			setTeamCount(count);
		};

		fetchTeamCount();
	}, [category]);

	// Build phases dynamically based on team count
	const PHASES = useMemo(() => {
		const phases = [
			{ phase: 0, sheetName: "QUALIFIERS", phaseName: "QUALIFIERS" },
		];

		// Add PRE_QUARTERS if team count >= 16
		if (teamCount >= 16) {
			phases.push({
				phase: 1,
				sheetName: "PRE_QUARTERS",
				phaseName: "PRE-QUARTERS",
			});
		}

		// Add remaining phases
		const startPhase = teamCount >= 16 ? 2 : 1;
		phases.push(
			{
				phase: startPhase,
				sheetName: "QUARTERS",
				phaseName: "QUARTER-FINALS",
			},
			{
				phase: startPhase + 1,
				sheetName: "SEMIS",
				phaseName: "SEMI-FINALS",
			},
			{
				phase: startPhase + 2,
				sheetName: "THIRD_PLACE",
				phaseName: "THIRD PLACE",
			},
			{
				phase: startPhase + 3,
				sheetName: "FINAL",
				phaseName: "FINALS",
			},
		);

		return phases;
	}, [teamCount]);
	const phase = PHASES[currentPhase];

	// Update currentPhase index when PHASES changes or currentPhaseSheetName changes
	useEffect(() => {
		const index = PHASES.findIndex(
			(p) => p.sheetName === currentPhaseSheetName,
		);
		// Only update if we found the phase - don't default to QUALIFIERS
		// Trust the persisted currentPhaseSheetName and wait for PHASES to be ready
		if (index !== -1) {
			setCurrentPhase(index);
		}
	}, [PHASES, currentPhaseSheetName]);

	const spreadSheetId =
		category == "senior"
			? import.meta.env.VITE_SENIOR_SPREADSHEET_ID
			: import.meta.env.VITE_JUNIOR_SPREADSHEET_ID;

	const fetchData = async () => {
		if (!phase) {
			setCurrentPhase(0);
			return { junior: [], senior: [] };
		}

		// Check if we have data for the requested phase, if not redirect to nearest cached
		if (typeof gapi === "undefined") {
			const nearestCache = getNearestCachedPhase(
				phase.sheetName,
				category,
			);
			if (nearestCache) {
				// If nearest cache is different from requested phase, redirect to it
				if (nearestCache.phase !== phase.sheetName) {
					setFallbackPhaseMessage(
						`No data available for ${phase.sheetName}, switching to ${nearestCache.phase}`,
					);
					setCurrentPhaseSheetName(nearestCache.phase);
					return { junior: [], senior: [] };
				} else {
					// We have the exact phase cached, use it
					setIsViewingCachedData(true);
					setFallbackPhaseMessage(null);
					return nearestCache.data;
				}
			} else {
				throw new Error("Offline and no cached data available");
			}
		}

		const response = new Promise<{
			junior: string[][];
			senior: string[][];
		}>((resolve, reject) => {
			try {
				gapi.load("client", () => {
					gapi.client
						.init({
							apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
							discoveryDocs: [
								"https://sheets.googleapis.com/$discovery/rest?version=v4",
							],
						})
						.then(() => {
							// Fetch both junior and senior divisions
							return Promise.all([
								(
									gapi.client as any
								).sheets.spreadsheets.values.get({
									spreadsheetId: spreadSheetId,
									range: `${phase.sheetName}!A2:I100`,
									valueRenderOption: "FORMATTED_VALUE",
								}),
							]);
						})
						.then((responses: any[]) => {
							const sheetData =
								responses[0]?.result?.values || [];
							const result = {
								junior: sheetData,
								senior: sheetData,
							};
							// Save to cache on successful fetch
							setCacheData(phase.sheetName, category, result);
							setIsViewingCachedData(false);
							setFallbackPhaseMessage(null);
							resolve(result);
						})
						.catch((err: any) => {
							// Try to use nearest cached data on error
							const nearestCache = getNearestCachedPhase(
								phase.sheetName,
								category,
							);
							if (nearestCache) {
								// If nearest cache is different, redirect instead of showing mismatched data
								if (nearestCache.phase !== phase.sheetName) {
									setFallbackPhaseMessage(
										`Error loading ${phase.sheetName}, switching to cached ${nearestCache.phase}`,
									);
									setCurrentPhaseSheetName(
										nearestCache.phase,
									);
									resolve({ junior: [], senior: [] });
								} else {
									// Have the exact phase cached
									setIsViewingCachedData(true);
									setFallbackPhaseMessage(null);
									resolve(nearestCache.data);
								}
							} else {
								setCurrentPhase(0);
								reject(err);
							}
						});
				});
			} catch (err) {
				console.warn("Error calling gapi:", err);
				// Try nearest cache as fallback
				const nearestCache = getNearestCachedPhase(
					phase.sheetName,
					category,
				);
				if (nearestCache) {
					if (nearestCache.phase !== phase.sheetName) {
						setFallbackPhaseMessage(
							`Error loading ${phase.sheetName}, switching to cached ${nearestCache.phase}`,
						);
						setCurrentPhaseSheetName(nearestCache.phase);
						resolve({ junior: [], senior: [] });
					} else {
						setIsViewingCachedData(true);
						setFallbackPhaseMessage(null);
						resolve(nearestCache.data);
					}
				} else {
					reject(err);
				}
			}
		});

		return response;
	};

	const query = useQuery({
		queryKey: ["scores", currentPhase, category],
		queryFn: fetchData,
		enabled: true,
		refetchInterval: 30000,
		refetchOnWindowFocus: true,
	});

	// Reset phase to 0 if an error occurs
	useEffect(() => {
		if (query.isError && currentPhase !== 0) {
			setCurrentPhase(0);
		}
	}, [query.isError, currentPhase]);

	// Check if current phase is qualifiers
	const isQualifiersPhase = phase?.sheetName === "QUALIFIERS";

	// Check if current phase is a bracket phase with rankings view (QUARTERS or PRE_QUARTERS)
	const isBracketPhaseWithRankings =
		phase?.sheetName === "QUARTERS" || phase?.sheetName === "PRE_QUARTERS";

	// Transform raw sheet data into bracket structure
	const brackets = useMemo(() => {
		if (!query.data) {
			return {
				phaseName: phase?.phaseName || "",
				junior: [],
				senior: [],
			};
		}

		// For qualifiers phase, return raw data (no transformation needed)
		if (isQualifiersPhase) {
			return {
				phaseName: phase?.phaseName || "",
				junior: query.data.junior,
				senior: query.data.senior,
			};
		}

		// For regular phases, transform into bracket structure
		const juniorMatches = transformSheetDataToMatches(
			query.data.junior,
			`phase-${currentPhase}`,
			"A",
		);

		const seniorMatches = transformSheetDataToMatches(
			query.data.senior,
			`phase-${currentPhase}`,
			"C",
		);

		return {
			phaseName: phase?.phaseName || "",
			junior: juniorMatches,
			senior: seniorMatches,
		} as BracketPhase;
	}, [query.data, currentPhase, phase, isQualifiersPhase]);

	const activeMatches =
		category === "junior" ? brackets.junior : brackets.senior;

	const nextPhase = () => {
		const nextIndex = (currentPhase + 1) % PHASES.length;
		setCurrentPhaseSheetName(PHASES[nextIndex].sheetName);
	};
	const prevPhase = () => {
		const prevIndex = (currentPhase - 1 + PHASES.length) % PHASES.length;
		setCurrentPhaseSheetName(PHASES[prevIndex].sheetName);
	};

	const handleManualRefresh = () => {
		const now = Date.now();
		const timeSinceLastRefresh = now - lastRefreshTime;

		// Allow max 3 refreshes via button
		if (refreshCount >= 3) {
			alert(
				"Maximum refreshes reached. Data will auto-refresh every 60 seconds.",
			);
			return;
		}

		// Small cooldown between clicks (1 second)
		if (timeSinceLastRefresh < 1000) {
			return;
		}

		// Track refresh button click
		ReactGA.event({
			category: "User",
			action: "Refresh Scores Clicked",
		});

		setRefreshCount((count) => count + 1);
		setLastRefreshTime(now);
		query.refetch();
	};

	return (
		<div className="min-h-screen bg-editorial-bg text-editorial-ink font-sans selection:bg-editorial-gold selection:text-white border-12 md:border-24 border-editorial-ink flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] p-6 overflow-x-hidden relative">
			{/* Navigation Buttons */}
			<div className="fixed bottom-6 right-6 z-30 flex gap-3">
				<div className="flex flex-col items-center gap-1">
					<button
						onClick={handleManualRefresh}
						disabled={refreshCount >= 3 || query.isFetching}
						title={`Refresh scores (${refreshCount}/3 used)`}
						className={`border-2 border-editorial-ink p-3 transition-all shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] ${
							refreshCount >= 3
								? "bg-gray-200 text-gray-600 cursor-not-allowed"
								: query.isFetching
									? "bg-editorial-green text-white"
									: "bg-editorial-gold text-editorial-ink hover:bg-editorial-ink hover:text-editorial-gold"
						}`}
						aria-label="Refresh scores"
					>
						<RotateCcw
							size={24}
							className={`font-bold ${query.isFetching ? "animate-spin" : ""}`}
						/>
					</button>
				</div>
				<button
					onClick={() => {
						ReactGA.event({
							category: "User",
							action: "Scoring Rules Button Clicked",
						});
						setCurrentPage(
							currentPage === "bracket" ? "rules" : "bracket",
						);
					}}
					className={`border-2 border-editorial-ink p-3 hover:bg-editorial-ink hover:text-editorial-gold transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] ${
						currentPage === "rules"
							? "bg-editorial-ink text-white"
							: "bg-editorial-gold text-editorial-ink"
					}`}
					aria-label="Toggle between bracket and rules"
					title={
						currentPage === "bracket"
							? "View Scoring Rules"
							: "View Bracket"
					}
				>
					<BookOpen size={24} className="font-bold" />
				</button>
			</div>

			{currentPage === "rules" ? (
				<RulesPage />
			) : (
				<AnimatePresence mode="wait">
					{!selectedMatch ? (
						<div className="w-full flex flex-col items-center">
							<CategoryToggle
								category={category}
								onChange={setCategory}
							/>

							{/* Cached data / Fallback phase banner */}
							{(isViewingCachedData || fallbackPhaseMessage) && (
								<div className="w-full max-w-6xl mb-4 px-4 py-3 bg-amber-100 border-2 border-amber-600 flex items-center gap-3 text-amber-900">
									<AlertCircle
										size={20}
										className="shrink-0"
									/>
									<div className="flex-1">
										<p className="font-semibold">
											{fallbackPhaseMessage
												? "Phase unavailable"
												: "Viewing offline data"}
										</p>
										<p className="text-sm">
											{fallbackPhaseMessage ||
												"Network connection issue detected. Showing cached information from previous load."}
										</p>
									</div>
								</div>
							)}

							{query.isLoading && !isViewingCachedData && (
								<LoadingSpinner />
							)}
							{query.error && !isViewingCachedData && (
								<div className="text-center py-8">
									<p className="text-sm text-red-600">
										Error loading data
									</p>
								</div>
							)}
							{!query.isLoading && (
								<>
									<PhaseNavigation
										currentPhase={currentPhase}
										phaseName={brackets.phaseName}
										onPrevPhase={prevPhase}
										onNextPhase={nextPhase}
									/>
									{isQualifiersPhase ? (
										<QualifiersTable
											data={brackets.junior as string[][]}
											hasPreQuarters={teamCount >= 16}
										/>
									) : isBracketPhaseWithRankings ? (
										<BracketPhaseView
											data={query.data?.[category] || []}
											matches={activeMatches as Match[]}
											rawData={query.data?.[category]}
											sheetName={phase?.sheetName}
											onSelectMatch={setSelectedMatch}
										/>
									) : (
										<BracketList
											matches={activeMatches as Match[]}
											rawData={query.data?.[category]}
											onSelectMatch={setSelectedMatch}
										/>
									)}
								</>
							)}
						</div>
					) : (
						<MatchDetailView
							match={selectedMatch}
							currentPhase={currentPhase}
							shared={shared}
							effects={effects}
							onBack={() => setSelectedMatch(null)}
							onCheerLeft={() => triggerEffect("cheer", "left")}
							onBooLeft={() => triggerEffect("boo", "left")}
							onCheerRight={() => triggerEffect("cheer", "right")}
							onBooRight={() => triggerEffect("boo", "right")}
						/>
					)}
				</AnimatePresence>
			)}
		</div>
	);
}
