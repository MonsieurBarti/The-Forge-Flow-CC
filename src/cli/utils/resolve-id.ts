import type { DomainError } from "../../domain/errors/domain-error.js";
import { createDomainError } from "../../domain/errors/domain-error.js";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import type { SliceStore } from "../../domain/ports/slice-store.port.js";
import { Err, Ok, type Result } from "../../domain/result.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MILESTONE_LABEL_RE = /^M(\d+)$/;
const SLICE_LABEL_RE = /^M(\d+)-S(\d+)$/;

export function resolveMilestoneId(
	label: string,
	milestoneStore: MilestoneStore,
): Result<string, DomainError> {
	if (UUID_RE.test(label)) return Ok(label);

	const m = MILESTONE_LABEL_RE.exec(label);
	if (!m) {
		return Err(createDomainError("VALIDATION_ERROR", `Cannot resolve milestone label: '${label}'`));
	}

	const number = parseInt(m[1], 10);
	const result = milestoneStore.getMilestoneByNumber(number);
	if (!result.ok) return result;
	if (!result.data) {
		return Err(createDomainError("NOT_FOUND", `Milestone not found: '${label}'`));
	}
	return Ok(result.data.id);
}

export function resolveSliceId(label: string, sliceStore: SliceStore): Result<string, DomainError> {
	if (UUID_RE.test(label)) return Ok(label);

	const m = SLICE_LABEL_RE.exec(label);
	if (!m) {
		return Err(createDomainError("VALIDATION_ERROR", `Cannot resolve slice label: '${label}'`));
	}

	const milestoneNumber = parseInt(m[1], 10);
	const sliceNumber = parseInt(m[2], 10);
	const result = sliceStore.getSliceByNumbers(milestoneNumber, sliceNumber);
	if (!result.ok) return result;
	if (!result.data) {
		return Err(createDomainError("NOT_FOUND", `Slice not found: '${label}'`));
	}
	return Ok(result.data.id);
}
