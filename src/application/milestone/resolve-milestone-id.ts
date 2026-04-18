import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import { Err, isOk, Ok, type Result } from "../../domain/result.js";

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const M_LABEL_RE = /^M(\d+)$/;

export type ResolveMilestoneIdError =
	| { code: "INVALID_INPUT"; message: string }
	| { code: "NOT_FOUND"; message: string }
	| { code: "READ_FAILURE"; message: string };

/**
 * Resolve a milestone-id input (UUID or M-label) to a milestone UUID.
 *
 * Accepts:
 * - UUID v4 directly (passed through as-is)
 * - M-label like M01, M02, … (looks up by milestone.number)
 *
 * Returns:
 * - Err with code INVALID_INPUT when the input is neither a UUID v4 nor an M-label.
 * - Err with code NOT_FOUND when an M-label is given but no matching milestone exists.
 * - Err with code READ_FAILURE when the underlying store lookup fails.
 */
export function resolveMilestoneId(
	store: MilestoneStore,
	input: string,
): Result<string, ResolveMilestoneIdError> {
	if (UUID_V4_RE.test(input)) return Ok(input);

	const mMatch = M_LABEL_RE.exec(input);
	if (mMatch) {
		const number = Number.parseInt(mMatch[1], 10);
		const listResult = store.listMilestones();
		if (!isOk(listResult)) {
			return Err({
				code: "READ_FAILURE",
				message: listResult.error.message,
			});
		}
		const found = listResult.data.find((m) => m.number === number);
		if (!found) {
			return Err({
				code: "NOT_FOUND",
				message: `Milestone "${input}" not found`,
			});
		}
		return Ok(found.id);
	}

	return Err({
		code: "INVALID_INPUT",
		message: `--milestone-id must be a UUID or M-label (e.g., M01): got "${input}"`,
	});
}
