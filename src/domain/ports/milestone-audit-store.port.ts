import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";

export type AuditVerdict = "ready" | "not_ready";

export interface MilestoneAuditRecord {
	milestoneId: string;
	verdict: AuditVerdict;
	auditedAt: string;
	notes?: string;
}

export interface MilestoneAuditStore {
	upsertAudit(record: MilestoneAuditRecord): Result<void, DomainError>;
	getAudit(milestoneId: string): Result<MilestoneAuditRecord | null, DomainError>;
}
