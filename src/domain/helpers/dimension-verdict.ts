export type DimensionForPredicate = "agent" | "tier" | "unknown";
export type VerdictForPredicate = "ok" | "wrong" | "too-low" | "too-high";

/**
 * Canonical dimension × verdict compatibility. Used by both RoutingOutcomeSchema
 * (all three dimensions allowed) and JudgeVerdictSchema (agent|tier only).
 */
export const isValidDimensionVerdict = (
	dimension: DimensionForPredicate,
	verdict: VerdictForPredicate,
): boolean => {
	if (dimension === "agent") return verdict === "ok" || verdict === "wrong";
	if (dimension === "unknown") return verdict === "wrong";
	// dimension === "tier"
	return true;
};
