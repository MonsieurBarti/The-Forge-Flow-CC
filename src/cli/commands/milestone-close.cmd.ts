import { resolveMilestoneId } from "../../application/milestone/resolve-milestone-id.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import { isOk } from "../../domain/result.js";
import { checkMilestoneActive } from "../../domain/state-machine/preconditions.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const milestoneCloseSchema: CommandSchema = {
	name: "milestone:close",
	purpose: "Close a milestone",
	requiredFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Milestone UUID or M-label (e.g., M01) to close",
		},
	],
	optionalFlags: [
		{
			name: "reason",
			type: "string",
			description: "Reason for closing",
		},
	],
	examples: [
		"milestone:close --milestone-id M01",
		"milestone:close --milestone-id <uuid>",
		'milestone:close --milestone-id M01 --reason "Completed"',
	],
};

export const milestoneCloseCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, milestoneCloseSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "milestone-id": rawMilestoneId, reason } = parsed.data as {
		"milestone-id": string;
		reason?: string;
	};

	const closableStores = createClosableStateStoresUnchecked();
	const { db, milestoneStore } = closableStores;

	try {
		const resolved = resolveMilestoneId(milestoneStore, rawMilestoneId);
		if (!isOk(resolved)) {
			return JSON.stringify({ ok: false, error: resolved.error });
		}

		// Precondition: milestone must not already be closed.
		const precheck = checkMilestoneActive(milestoneStore, resolved.data);
		if (!precheck.ok) {
			return JSON.stringify({
				ok: false,
				error: preconditionViolationError(precheck.violations),
			});
		}

		let businessError: DomainError | null = null;
		const txResult = await withTransaction(db, () => {
			const r = milestoneStore.closeMilestone(resolved.data, reason);
			if (!r.ok) businessError = r.error;
			return { data: null, tmpRenames: [] };
		});
		if (!txResult.ok) return JSON.stringify({ ok: false, error: txResult.error });
		if (businessError) return JSON.stringify({ ok: false, error: businessError });
		return JSON.stringify({ ok: true, data: { status: "closed", reason } });
	} finally {
		closableStores.close();
	}
};
