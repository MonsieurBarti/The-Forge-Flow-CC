import type { Milestone } from "../entities/milestone.js";
import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { MilestoneProps } from "../value-objects/milestone-props.js";
import type { MilestoneUpdateProps } from "../value-objects/milestone-update-props.js";

export interface MilestoneStore {
	createMilestone(props: MilestoneProps): Result<Milestone, DomainError>;
	getMilestone(id: string): Result<Milestone | null, DomainError>;
	getMilestoneByNumber(number: number): Result<Milestone | null, DomainError>;
	listMilestones(): Result<Milestone[], DomainError>;
	updateMilestone(id: string, updates: MilestoneUpdateProps): Result<void, DomainError>;
	closeMilestone(id: string, reason?: string): Result<void, DomainError>;
}
