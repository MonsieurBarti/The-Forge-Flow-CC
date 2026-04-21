export type GateClass = "I" | "II" | "III" | "V";
export type GateMechanism =
	| "adapter-invariant"
	| "chokepoint-wrapper"
	| "mirror-in-ci"
	| "value-object";
export type GateStatus = "pending" | "enforced";

export interface QualityGate {
	readonly id: string;
	readonly name: string;
	readonly class: GateClass;
	readonly mechanism: GateMechanism;
	readonly enforcementSite: string;
	readonly metaTestPath: string;
	readonly status: GateStatus;
	readonly concernRef?: string;
}

export const QUALITY_GATES: readonly QualityGate[] = [
	{
		id: "fresh-reviewer",
		name: "Fresh-reviewer invariant on recordReview",
		class: "III",
		mechanism: "adapter-invariant",
		enforcementSite: "src/infrastructure/adapters/sqlite/sqlite-state.adapter.ts",
		metaTestPath: "tests/structural/review-store-fresh-reviewer-invariant.spec.ts",
		status: "pending",
		concernRef: "CONCERNS.md#5",
	},
	{
		id: "branch-guard",
		name: "Branch-guard chokepoint on mutating CLI commands",
		class: "III",
		mechanism: "chokepoint-wrapper",
		enforcementSite: "src/cli/utils/with-mutating-command.ts",
		metaTestPath: "tests/structural/branch-guard-chokepoint.spec.ts",
		status: "pending",
	},
	{
		id: "ship-completeness",
		name: "Slice-close requires approved code + security reviews",
		class: "V",
		mechanism: "adapter-invariant",
		enforcementSite: "src/infrastructure/adapters/sqlite/sqlite-state.adapter.ts",
		metaTestPath: "tests/structural/slice-close-completeness-invariant.spec.ts",
		status: "pending",
	},
	{
		id: "milestone-completeness",
		name: "Milestone-close requires approved spec review per slice",
		class: "V",
		mechanism: "adapter-invariant",
		enforcementSite: "src/infrastructure/adapters/sqlite/sqlite-state.adapter.ts",
		metaTestPath: "tests/structural/milestone-close-completeness-invariant.spec.ts",
		status: "pending",
	},
	{
		id: "coverage-in-ci",
		name: "Coverage threshold enforced on every PR",
		class: "II",
		mechanism: "mirror-in-ci",
		enforcementSite: ".github/workflows/ci.yml",
		metaTestPath: "tests/structural/coverage-in-ci.spec.ts",
		status: "pending",
		concernRef: "CONCERNS.md#9",
	},
	{
		id: "commitlint-in-ci",
		name: "Commitlint enforced on every PR",
		class: "II",
		mechanism: "mirror-in-ci",
		enforcementSite: ".github/workflows/ci.yml",
		metaTestPath: "tests/structural/commitlint-in-ci.spec.ts",
		status: "pending",
	},
	{
		id: "value-object-invariants",
		name: "Every value-object exports a Zod schema or parse fn",
		class: "III",
		mechanism: "value-object",
		enforcementSite: "src/domain/value-objects",
		metaTestPath: "tests/structural/value-object-invariants.spec.ts",
		status: "pending",
	},
];
