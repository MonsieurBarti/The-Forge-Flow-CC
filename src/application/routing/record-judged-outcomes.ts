import type { DomainError } from "../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import { sanitizeReason } from "../../domain/helpers/sanitize-reason.js";
import type { OutcomeSource } from "../../domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../domain/ports/outcome-writer.port.js";
import { Err, Ok, type Result } from "../../domain/result.js";
import type { JudgeVerdict } from "../../domain/value-objects/judge-verdict.js";
import { JudgeVerdictSchema } from "../../domain/value-objects/judge-verdict.js";
import type { RoutingOutcome } from "../../domain/value-objects/routing-outcome.js";

export interface RecordJudgedOutcomesInput {
	slice_id: string;
	verdicts: unknown; // raw JSON — validated inside
	evidence_truncated: boolean;
}

export interface KnownDecisionRecord {
	decision_id: string;
	slice_id: string;
	workflow_id?: string;
}

export interface RecordJudgedOutcomesDeps {
	sliceStatus: string;
	decisions: KnownDecisionRecord[];
	outcomesSource: OutcomeSource;
	writer: OutcomeWriter;
	modelJudgeEnabled: boolean;
	uuid: () => string;
	now: () => string;
}

export interface RecordJudgedOutcomesResult {
	outcomes_emitted: number;
	skipped: number;
	model_judge_already_had: number;
}

export const recordJudgedOutcomesUseCase = async (
	input: RecordJudgedOutcomesInput,
	deps: RecordJudgedOutcomesDeps,
): Promise<Result<RecordJudgedOutcomesResult, DomainError>> => {
	if (!deps.modelJudgeEnabled) {
		return Err(
			preconditionViolationError([
				{ code: "model_judge.enabled", expected: "true", actual: "false" },
			]),
		);
	}
	if (deps.sliceStatus !== "closed") {
		return Err(
			preconditionViolationError([
				{ code: "slice.status", expected: "closed", actual: deps.sliceStatus },
			]),
		);
	}

	// Validate the verdicts envelope: { verdicts: JudgeVerdict[] }
	const envelope = input.verdicts as { verdicts?: unknown };
	const rawList = envelope?.verdicts;
	if (!Array.isArray(rawList)) {
		return Err(
			preconditionViolationError([
				{ code: "verdicts.shape", expected: '{ "verdicts": [] }', actual: typeof rawList },
			]),
		);
	}

	const validated: JudgeVerdict[] = [];
	for (const raw of rawList) {
		const parsed = JudgeVerdictSchema.safeParse(raw);
		if (!parsed.success) {
			return Err(
				preconditionViolationError(
					parsed.error.issues.map((i) => ({
						code: i.path.join(".") || "verdicts.item",
						expected: "valid JudgeVerdict",
						actual: i.message,
					})),
				),
			);
		}
		validated.push(parsed.data);
	}

	const alreadyJudged = new Set<string>();
	for await (const o of deps.outcomesSource.readOutcomes({ source: "model-judge" })) {
		alreadyJudged.add(o.decision_id);
	}
	const unjudgedIds = new Set(
		deps.decisions.filter((d) => !alreadyJudged.has(d.decision_id)).map((d) => d.decision_id),
	);
	const decisionMap = new Map(deps.decisions.map((d) => [d.decision_id, d]));

	const reasonPrefix = input.evidence_truncated ? "[evidence_truncated] " : "";
	let emitted = 0;
	for (const v of validated) {
		if (!unjudgedIds.has(v.decision_id)) continue;
		const dec = decisionMap.get(v.decision_id);
		if (!dec) continue;
		const cleanReason = sanitizeReason(v.reason) ?? "";
		const outcome: RoutingOutcome = {
			outcome_id: deps.uuid(),
			decision_id: v.decision_id,
			dimension: v.dimension,
			verdict: v.verdict,
			source: "model-judge",
			slice_id: dec.slice_id,
			workflow_id: dec.workflow_id ?? "tff:ship",
			reason: `${reasonPrefix}${cleanReason}`,
			emitted_at: deps.now(),
		};
		await deps.writer.append(outcome);
		emitted += 1;
	}

	return Ok({
		outcomes_emitted: emitted,
		skipped: deps.decisions.length - unjudgedIds.size,
		model_judge_already_had: alreadyJudged.size,
	});
};
