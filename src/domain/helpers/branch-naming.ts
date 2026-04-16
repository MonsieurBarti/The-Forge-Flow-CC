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
