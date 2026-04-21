import { z } from "zod";

export const DomainErrorCodeSchema = z.enum([
	"PROJECT_EXISTS",
	"INVALID_TRANSITION",
	"GIT_CONFLICT",
	"FRESH_REVIEWER_VIOLATION",
	"NOT_FOUND",
	"VALIDATION_ERROR",
	"STALE_CLAIM",
	"WRITE_FAILURE",
	"ALREADY_CLAIMED",
	"VERSION_MISMATCH",
	"HAS_OPEN_CHILDREN",
	"SYNC_FAILED",
	"MERGE_CONFLICT",
	"CORRUPTED_STATE",
	"STATE_BRANCH_NOT_FOUND",
	"JOURNAL_WRITE_FAILED",
	"JOURNAL_READ_FAILED",
	"JOURNAL_REPLAY_INCONSISTENT",
	"EMPTY_POOL",
	"ROUTING_CONFIG",
	"SIGNAL_EXTRACTION",
	"REFUSED_ON_DEFAULT_BRANCH",
	"REFUSED_ON_MILESTONE_BRANCH",
	"AUDIT_REQUIRED",
	"AUDIT_NOT_READY",
	"PRECONDITION_VIOLATION",
	"TRANSACTION_ROLLBACK",
	"PARTIAL_SUCCESS",
	"EXTERNAL_CALL_FAILED",
	"SHIP_COMPLETENESS_VIOLATION",
]);

export type DomainErrorCode = z.infer<typeof DomainErrorCodeSchema>;

export const DomainErrorSchema = z.object({
	code: DomainErrorCodeSchema,
	message: z.string(),
	context: z.record(z.string(), z.unknown()).optional(),
	recoveryHint: z.string().optional(),
	validPredecessors: z.array(z.string()).readonly().optional(),
	validNext: z.array(z.string()).readonly().optional(),
});

export type DomainError = z.infer<typeof DomainErrorSchema>;

export const createDomainError = (
	code: DomainErrorCode,
	message: string,
	context?: Record<string, unknown>,
): DomainError => DomainErrorSchema.parse({ code, message, context });
