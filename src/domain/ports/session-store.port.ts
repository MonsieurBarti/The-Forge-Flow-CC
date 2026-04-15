import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { WorkflowSession } from "../value-objects/workflow-session.js";

export interface SessionStore {
	getSession(): Result<WorkflowSession | null, DomainError>;
	saveSession(session: WorkflowSession): Result<void, DomainError>;
}
