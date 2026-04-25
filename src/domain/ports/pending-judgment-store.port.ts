import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";

export interface PendingJudgmentRecord {
	sliceId: string;
	createdAt: string;
}

export interface PendingJudgmentStore {
	insertPending(sliceId: string): Result<void, DomainError>;
	clearPending(sliceId: string): Result<void, DomainError>;
	listPending(): Result<PendingJudgmentRecord[], DomainError>;
	listPendingForMilestone(milestoneId: string): Result<PendingJudgmentRecord[], DomainError>;
}
