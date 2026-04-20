import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { JudgeEvidence } from "../value-objects/judge-evidence.js";
import type { JudgeVerdict } from "../value-objects/judge-verdict.js";

export interface OutcomeJudge {
	judge(evidence: JudgeEvidence): Promise<Result<JudgeVerdict[], DomainError>>;
}
