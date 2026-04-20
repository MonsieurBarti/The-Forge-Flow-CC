import type { DomainError } from "../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import { sanitizeReason } from "../../domain/helpers/sanitize-reason.js";
import type { DiffReader } from "../../domain/ports/diff-reader.port.js";
import type { OutcomeJudge } from "../../domain/ports/outcome-judge.port.js";
import type { OutcomeSource } from "../../domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../domain/ports/outcome-writer.port.js";
import type { SliceMergeLookup } from "../../domain/ports/slice-merge-lookup.port.js";
import type { SliceSpecReader } from "../../domain/ports/slice-spec-reader.port.js";
import { Err, isOk, Ok, type Result } from "../../domain/result.js";
import type { JudgeEvidence } from "../../domain/value-objects/judge-evidence.js";
import type { RoutingOutcome } from "../../domain/value-objects/routing-outcome.js";
import type { Signals } from "../../domain/value-objects/signals.js";
import type { ModelTier } from "../../domain/value-objects/tier-decision.js";

export interface JudgeOutcomesInput {
	slice_id: string;
}

export interface JudgeKnownDecision {
	decision_id: string;
	agent: string;
	tier: ModelTier;
	slice_id: string;
	workflow_id?: string;
	signals?: Signals;
	fallback_used?: boolean;
	confidence?: number;
}

export interface JudgeDebugEvent {
	slice_id: string;
}

export interface JudgeOutcomesDeps {
	sliceStatus: string;
	sliceLabel: string;
	decisions: JudgeKnownDecision[];
	debugEvents: JudgeDebugEvent[];
	outcomesSource: OutcomeSource;
	writer: OutcomeWriter;
	judge: OutcomeJudge;
	mergeLookup: SliceMergeLookup;
	diffReader: DiffReader;
	specReader: SliceSpecReader;
	maxPatchBytes: number;
	maxSpecBytes: number;
	modelJudgeEnabled: boolean;
	uuid: () => string;
	now: () => string;
}

export interface JudgeOutcomesResult {
	outcomes_emitted: number;
	skipped: number;
	model_judge_already_had: number;
	merge_commit: string | null;
	spec_missing?: boolean;
}

export const judgeOutcomesUseCase = async (
	_input: JudgeOutcomesInput,
	deps: JudgeOutcomesDeps,
): Promise<Result<JudgeOutcomesResult, DomainError>> => {
	if (!deps.modelJudgeEnabled) {
		return Err(
			preconditionViolationError([
				{
					code: "model_judge.enabled",
					expected: "true",
					actual: "false",
				},
			]),
		);
	}

	if (deps.sliceStatus !== "closed") {
		return Err(
			preconditionViolationError([
				{
					code: "slice.status",
					expected: "closed",
					actual: deps.sliceStatus,
				},
			]),
		);
	}

	if (deps.decisions.length === 0) {
		return Ok({ outcomes_emitted: 0, skipped: 0, model_judge_already_had: 0, merge_commit: null });
	}

	const alreadyJudged = new Set<string>();
	for await (const o of deps.outcomesSource.readOutcomes({ source: "model-judge" })) {
		alreadyJudged.add(o.decision_id);
	}

	const unjudged = deps.decisions.filter((d) => !alreadyJudged.has(d.decision_id));
	if (unjudged.length === 0) {
		return Ok({
			outcomes_emitted: 0,
			skipped: deps.decisions.length,
			model_judge_already_had: deps.decisions.length,
			merge_commit: null,
		});
	}

	const mergeRes = await deps.mergeLookup.findMergeCommit(deps.sliceLabel);
	if (!isOk(mergeRes)) return mergeRes;
	const mergeSha = mergeRes.data;

	const diffRes = await deps.diffReader.readMergeDiff(mergeSha, deps.maxPatchBytes);
	if (!isOk(diffRes)) return diffRes;

	const specRes = await deps.specReader.readSpec(deps.sliceLabel, deps.maxSpecBytes);
	if (!isOk(specRes)) return specRes;
	const specMissing = specRes.data.missing;

	// CLI already filters debugEvents to this slice before calling the use case.
	const debug_happened = deps.debugEvents.length > 0;

	const evidence: JudgeEvidence = {
		slice_id: unjudged[0].slice_id,
		slice_label: deps.sliceLabel,
		slice_spec: specRes.data.text,
		merge_commit: mergeSha,
		diff_summary: {
			files_changed: diffRes.data.files_changed,
			insertions: diffRes.data.insertions,
			deletions: diffRes.data.deletions,
			patch: diffRes.data.patch,
		},
		debug_happened,
		decisions: unjudged.map((d) => ({
			decision_id: d.decision_id,
			agent: d.agent,
			tier: d.tier,
			signals: d.signals ?? { complexity: "medium", risk: { level: "low", tags: [] } },
			fallback_used: d.fallback_used ?? false,
			confidence: d.confidence ?? 0,
		})),
	};

	const verdictsRes = await deps.judge.judge(evidence);
	if (!isOk(verdictsRes)) return verdictsRes;

	const evidenceTruncated = diffRes.data.truncated || specRes.data.truncated;
	const reasonPrefix = evidenceTruncated ? "[evidence_truncated] " : "";
	const unjudgedIds = new Set(unjudged.map((d) => d.decision_id));
	const decisionMap = new Map(deps.decisions.map((d) => [d.decision_id, d]));

	let emitted = 0;
	for (const v of verdictsRes.data) {
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
		skipped: deps.decisions.length - unjudged.length,
		model_judge_already_had: alreadyJudged.size,
		merge_commit: mergeSha,
		...(specMissing ? { spec_missing: true } : {}),
	});
};
