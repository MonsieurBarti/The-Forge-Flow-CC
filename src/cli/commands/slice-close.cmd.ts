import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import { isOk } from "../../domain/result.js";
import { checkTasksClosed } from "../../domain/state-machine/preconditions.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";

export const sliceCloseSchema: CommandSchema = {
	name: "slice:close",
	purpose: "Close a slice",
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID to close",
			pattern: "^M\\d+-S\\d+$",
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
		"slice:close --slice-id M01-S01",
		'slice:close --slice-id M01-S01 --reason "Completed"',
	],
};

export const sliceCloseCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceCloseSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": rawSliceId, reason } = parsed.data as {
		"slice-id": string;
		reason?: string;
	};

	const closableStores = createClosableStateStoresUnchecked();
	const { sliceStore, taskStore } = closableStores;

	try {
		const resolved = resolveSliceId(rawSliceId, sliceStore);
		if (!resolved.ok) {
			return JSON.stringify({ ok: false, error: resolved.error });
		}
		const sliceId = resolved.data;

		// Precondition: all tasks under the slice must be closed before closing
		// the slice. This makes the invariant explicit (vs. relying on whatever
		// transition rules may or may not enforce it).
		const precheck = checkTasksClosed(taskStore, sliceId);
		if (!precheck.ok) {
			return JSON.stringify({
				ok: false,
				error: preconditionViolationError(precheck.violations),
			});
		}

		// Transition to closed via the normal transition path.
		const result = sliceStore.transitionSlice(sliceId, "closed");
		if (isOk(result)) return JSON.stringify({ ok: true, data: { status: "closed", reason } });
		return JSON.stringify({ ok: false, error: result.error });
	} finally {
		closableStores.close();
	}
};
