import { recordAuditUseCase } from "../../application/milestone/record-audit.js";
import { createDomainError } from "../../domain/errors/domain-error.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveMilestoneId } from "../utils/resolve-id.js";

const NOTES_MAX_LENGTH = 1000;
// Zero-width and BOM characters that are invisible/dangerous.
const NOTES_ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/;

/** Returns true if `s` contains disallowed control or zero-width characters. */
function hasForbiddenChars(s: string): boolean {
	if (NOTES_ZERO_WIDTH.test(s)) return true;
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		// Allow \t (0x09) and \n (0x0A); reject all other C0 control chars.
		if (c <= 0x1f && c !== 0x09 && c !== 0x0a) return true;
	}
	return false;
}

export const milestoneRecordAuditSchema: CommandSchema = {
	name: "milestone:record-audit",
	purpose: "Record the result of a milestone audit",
	mutates: true,
	requiredFlags: [
		{ name: "milestone-id", type: "string", description: "Milestone label or UUID" },
		{ name: "verdict", type: "string", description: "Audit verdict", enum: ["ready", "not_ready"] },
	],
	optionalFlags: [{ name: "notes", type: "string", description: "Optional notes" }],
	examples: ["milestone:record-audit --milestone-id M01 --verdict ready"],
};

export const milestoneRecordAuditCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, milestoneRecordAuditSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const {
		"milestone-id": label,
		verdict,
		notes,
	} = parsed.data as {
		"milestone-id": string;
		verdict: "ready" | "not_ready";
		notes?: string;
	};

	if (notes !== undefined) {
		if (notes.length > NOTES_MAX_LENGTH) {
			return JSON.stringify({
				ok: false,
				error: createDomainError(
					"VALIDATION_ERROR",
					`--notes exceeds maximum length of ${NOTES_MAX_LENGTH} characters (got ${notes.length})`,
				),
			});
		}
		if (hasForbiddenChars(notes)) {
			return JSON.stringify({
				ok: false,
				error: createDomainError(
					"VALIDATION_ERROR",
					"--notes contains disallowed control or zero-width characters",
				),
			});
		}
	}

	const stores = createClosableStateStoresUnchecked();
	try {
		const resolved = resolveMilestoneId(label, stores.milestoneStore);
		if (!resolved.ok) return JSON.stringify({ ok: false, error: resolved.error });

		const res = await recordAuditUseCase(
			{ milestoneId: resolved.data, verdict, notes },
			{ milestoneAuditStore: stores.milestoneAuditStore },
		);
		if (isOk(res)) return JSON.stringify({ ok: true, data: null });
		return JSON.stringify({ ok: false, error: res.error });
	} finally {
		stores.close();
	}
};
