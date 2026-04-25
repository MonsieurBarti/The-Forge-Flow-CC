import type { DomainError } from "../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import type { DiffReader } from "../../domain/ports/diff-reader.port.js";
import type { OutcomeSource } from "../../domain/ports/outcome-source.port.js";
import type { SliceMergeLookup } from "../../domain/ports/slice-merge-lookup.port.js";
import type { SliceSpecReader } from "../../domain/ports/slice-spec-reader.port.js";
import { Err, isOk, Ok, type Result } from "../../domain/result.js";
import type { JudgeEvidence } from "../../domain/value-objects/judge-evidence.js";
import type { Signals } from "../../domain/value-objects/signals.js";
import type { ModelTier } from "../../domain/value-objects/tier-decision.js";

export interface PrepareJudgeEvidenceInput {
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

export interface PrepareJudgeEvidenceDeps {
	sliceStatus: string;
	sliceLabel: string;
	decisions: JudgeKnownDecision[];
	debugEvents: JudgeDebugEvent[];
	outcomesSource: OutcomeSource;
	mergeLookup: SliceMergeLookup;
	mergeBranches: string[];
	pendingMergeSha?: string;
	diffReader: DiffReader;
	specReader: SliceSpecReader;
	maxPatchBytes: number;
	maxSpecBytes: number;
	modelJudgeEnabled: boolean;
}

export interface PrepareJudgeEvidenceResult {
	evidence: JudgeEvidence | null;
	unjudged_decision_ids: string[];
	skipped: number;
	model_judge_already_had: number;
	merge_commit: string | null;
	spec_missing: boolean;
}

export const prepareJudgeEvidenceUseCase = async (
	_input: PrepareJudgeEvidenceInput,
	deps: PrepareJudgeEvidenceDeps,
): Promise<Result<PrepareJudgeEvidenceResult, DomainError>> => {
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
	if (deps.decisions.length === 0) {
		return Ok({
			evidence: null,
			unjudged_decision_ids: [],
			skipped: 0,
			model_judge_already_had: 0,
			merge_commit: null,
			spec_missing: false,
		});
	}

	const alreadyJudged = new Set<string>();
	for await (const o of deps.outcomesSource.readOutcomes({ source: "model-judge" })) {
		alreadyJudged.add(o.decision_id);
	}
	const unjudged = deps.decisions.filter((d) => !alreadyJudged.has(d.decision_id));
	if (unjudged.length === 0) {
		return Ok({
			evidence: null,
			unjudged_decision_ids: [],
			skipped: deps.decisions.length,
			model_judge_already_had: deps.decisions.length,
			merge_commit: null,
			spec_missing: false,
		});
	}

	let mergeSha: string;
	if (deps.pendingMergeSha) {
		mergeSha = deps.pendingMergeSha;
	} else {
		const mergeRes = await deps.mergeLookup.findMergeCommit(deps.sliceLabel, deps.mergeBranches);
		if (!isOk(mergeRes)) return mergeRes;
		mergeSha = mergeRes.data;
	}

	const diffRes = await deps.diffReader.readMergeDiff(mergeSha, deps.maxPatchBytes);
	if (!isOk(diffRes)) return diffRes;

	const specRes = await deps.specReader.readSpec(deps.sliceLabel, deps.maxSpecBytes);
	if (!isOk(specRes)) return specRes;

	// CLI boundary already filters debug events to the slice.
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

	return Ok({
		evidence,
		unjudged_decision_ids: unjudged.map((d) => d.decision_id),
		skipped: deps.decisions.length - unjudged.length,
		model_judge_already_had: alreadyJudged.size,
		merge_commit: mergeSha,
		spec_missing: specRes.data.missing,
	});
};
