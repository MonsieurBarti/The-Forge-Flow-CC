import type { DomainError } from "../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import type { OutcomeWriter } from "../../domain/ports/outcome-writer.port.js";
import { Err, Ok, type Result } from "../../domain/result.js";
import {
	type OutcomeDimension,
	type OutcomeVerdict,
	RoutingOutcomeSchema,
} from "../../domain/value-objects/routing-outcome.js";

export interface KnownDecision {
	decision_id: string;
	slice_id: string;
	workflow_id: string;
}

export interface RecordOutcomeInput {
	decision_id: string;
	dimension: OutcomeDimension;
	verdict: OutcomeVerdict;
	reason?: string;
}

export interface RecordOutcomeDeps {
	writer: OutcomeWriter;
	knownDecisions: KnownDecision[];
	uuid: () => string;
	now: () => string;
}

export const recordOutcomeUseCase = async (
	input: RecordOutcomeInput,
	deps: RecordOutcomeDeps,
): Promise<Result<{ outcome_id: string }, DomainError>> => {
	const known = deps.knownDecisions.find((d) => d.decision_id === input.decision_id);
	if (!known) {
		return Err(
			preconditionViolationError([
				{ code: "decision_id.unknown", expected: "known decision_id", actual: input.decision_id },
			]),
		);
	}

	const candidate = {
		outcome_id: deps.uuid(),
		decision_id: input.decision_id,
		dimension: input.dimension,
		verdict: input.verdict,
		source: "manual" as const,
		slice_id: known.slice_id,
		workflow_id: known.workflow_id,
		reason: input.reason,
		emitted_at: deps.now(),
	};

	const parsed = RoutingOutcomeSchema.safeParse(candidate);
	if (!parsed.success) {
		return Err(
			preconditionViolationError(
				parsed.error.issues.map((issue) => ({
					code: issue.path.join(".") || "schema",
					expected: "valid dimension×verdict combo",
					actual: issue.message,
				})),
			),
		);
	}

	await deps.writer.append(parsed.data);
	return Ok({ outcome_id: parsed.data.outcome_id });
};
