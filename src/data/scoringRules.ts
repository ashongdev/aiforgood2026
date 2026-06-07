export interface ScoringRule {
	action: string;
	points: number | string;
}

export interface MissionRules {
	title: string;
	rules: ScoringRule[];
}

export interface CategoryRules {
	junior: {
		mission1: MissionRules;
		mission2: MissionRules;
		penalties: MissionRules;
	};
	senior: {
		mission1: MissionRules;
		mission2: MissionRules;
		penalties: MissionRules;
	};
}

export const SCORING_RULES: CategoryRules = {
	junior: {
		mission1: {
			title: "Mission 1: Cultivation and Selective Irrigation",
			rules: [
				{
					action: "Place a seed correctly in its corresponding colored plot",
					points: "+10",
				},
				{
					action: "A single seed fully within a subdivision (2 × 3)",
					points: 0,
				},
				{
					action: "Misplaced seed",
					points: 0,
				},
				{
					action: "Correctly water a seeded plot",
					points: "+30",
				},
				{
					action: "Water a plot without seeds",
					points: 0,
				},
			],
		},
		mission2: {
			title: "Mission 2: Harvesting and Sorting",
			rules: [
				{
					action: "Move a red or black fruit out of its adhesive circle",
					points: "+5",
				},
				{
					action: 'Place a red fruit in the "Fruits" zone',
					points: "+5",
				},
				{
					action: 'Place a red fruit in the "Waste" zone',
					points: 0,
				},
				{
					action: 'Place a black fruit in the "Waste" zone',
					points: "+10",
				},
				{
					action: 'Place a black fruit in the "Fruits" zone',
					points: 0,
				},
				{
					action: "Move a green fruit out of its adhesive circle",
					points: 0,
				},
			],
		},
		penalties: {
			title: "General Penalties",
			rules: [
				{
					action: "Unauthorized interaction with the robot during the round",
					points: "-20",
				},
				{
					action: "Robot exits the field completely",
					points: "-20",
				},
			],
		},
	},
	senior: {
		mission1: {
			title: "Mission 1: Cultivation and Selective Irrigation",
			rules: [
				{
					action: "Place a seed correctly in its corresponding colored plot",
					points: "+5",
				},
				{
					action: "A single seed fully within a subdivision (2 × 3)",
					points: "+10",
				},
				{
					action: "Misplaced seed",
					points: "-5",
				},
				{
					action: "Correctly water a seeded plot",
					points: "+30",
				},
				{
					action: "Water a plot without seeds",
					points: "-10",
				},
			],
		},
		mission2: {
			title: "Mission 2: Harvest and Sorting",
			rules: [
				{
					action: "Move a red or black fruit out of its adhesive circle",
					points: "+5",
				},
				{
					action: 'Place a red fruit in the "Fruits" zone',
					points: "+5",
				},
				{
					action: 'Place a red fruit in the "Waste" zone',
					points: "-5",
				},
				{
					action: 'Place a black fruit in the "Waste" zone',
					points: "+10",
				},
				{
					action: 'Place a black fruit in the "Fruits" zone',
					points: "-10",
				},
				{
					action: "Move a green fruit out of its adhesive circle",
					points: "-5",
				},
			],
		},
		penalties: {
			title: "General Penalties",
			rules: [
				{
					action: "Unauthorized interaction with the robot during the round",
					points: "-20",
				},
				{
					action: "Robot exits the field completely",
					points: "-20",
				},
			],
		},
	},
};
