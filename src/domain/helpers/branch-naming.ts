/**
 * Branch naming helpers for UUID-based branch naming.
 *
 * These functions compute branch names and labels from entity IDs and numbers.
 */

/**
 * Format a milestone number as a human-readable label (M##).
 * Used for directories, display, and PR titles.
 */
export const milestoneLabel = (number: number): string => {
	return `M${number.toString().padStart(2, "0")}`;
};

/**
 * Format a slice number as a human-readable label (M##-S##).
 * Used for directories, display, and PR titles.
 */
export const sliceLabel = (milestoneNumber: number, sliceNumber: number): string => {
	return `M${milestoneNumber.toString().padStart(2, "0")}-S${sliceNumber.toString().padStart(2, "0")}`;
};

/**
 * Compute a milestone branch name from a UUID.
 * Uses the first 8 characters of the UUID for a collision-safe branch name.
 */
export const milestoneBranchName = (id: string): string => {
	const prefix = id.slice(0, 8);
	return `milestone/${prefix}`;
};

/**
 * Compute a slice branch name from a UUID.
 * Uses the first 8 characters of the UUID for a collision-safe branch name.
 */
export const sliceBranchName = (id: string): string => {
	const prefix = id.slice(0, 8);
	return `slice/${prefix}`;
};

/**
 * Format an ad-hoc slice label as Q-## (quick) or D-## (debug).
 */
export const adhocSliceLabel = (kind: "quick" | "debug", number: number): string => {
	const prefix = kind === "quick" ? "Q" : "D";
	return `${prefix}-${number.toString().padStart(2, "0")}`;
};

/**
 * Resolve a slice label given the slice and (optionally) its parent milestone.
 * Centralizes the milestone-bound vs ad-hoc dispatch so callers don't repeat it.
 */
export const sliceLabelFor = (
	slice: { kind: "milestone" | "quick" | "debug"; number: number },
	milestone?: { number: number },
): string => {
	if (slice.kind === "milestone") {
		if (!milestone) {
			throw new Error("sliceLabelFor: milestone required when slice.kind === 'milestone'");
		}
		return sliceLabel(milestone.number, slice.number);
	}
	return adhocSliceLabel(slice.kind, slice.number);
};
