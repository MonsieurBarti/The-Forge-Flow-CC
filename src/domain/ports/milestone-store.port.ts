import type { Milestone } from "../entities/milestone.js";
import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { MilestoneProps } from "../value-objects/milestone-props.js";
import type { MilestoneUpdateProps } from "../value-objects/milestone-update-props.js";

export interface ListMilestonesOptions {
	includeArchived?: boolean;
}

export interface MilestoneStore {
	createMilestone(props: MilestoneProps): Result<Milestone, DomainError>;
	getMilestone(id: string): Result<Milestone | null, DomainError>;
	getMilestoneByNumber(number: number): Result<Milestone | null, DomainError>;
	listMilestones(options?: ListMilestonesOptions): Result<Milestone[], DomainError>;
	updateMilestone(id: string, updates: MilestoneUpdateProps): Result<void, DomainError>;
	closeMilestone(id: string, reason?: string): Result<void, DomainError>;
	/**
	 * Mark a milestone and all its child slices as archived in a single
	 * transaction. Idempotent. Returns the count of slices archived in this
	 * call (slices that were not already archived).
	 */
	archiveMilestoneCascade(id: string): Result<{ slicesArchived: number }, DomainError>;
}
