import { archiveSliceFs } from "../../application/archive/archive-fs.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import { checkTasksClosed } from "../../domain/state-machine/preconditions.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";

export const sliceCloseSchema: CommandSchema = {
	name: "slice:close",
	purpose: "Close a slice",
	mutates: true,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID (M##-S##, Q-##, D-##, or UUID)",
			pattern:
				"^(M\\d+-S\\d+|Q-\\d+|D-\\d+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
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
	const { db, sliceStore, taskStore } = closableStores;

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

		// Read slice once before tx so we have its kind for the post-close
		// archive hook (kind is immutable, so this is safe to capture early).
		const currentSliceResult = sliceStore.getSlice(sliceId);
		if (!currentSliceResult.ok) {
			return JSON.stringify({ ok: false, error: currentSliceResult.error });
		}
		const currentSlice = currentSliceResult.data;

		// Transition to closed via the normal transition path.
		let businessError: DomainError | null = null;
		const txResult = await withTransaction(db, () => {
			const r = sliceStore.transitionSlice(sliceId, "closed");
			if (!r.ok) businessError = r.error;
			return { data: null, tmpRenames: [] };
		});
		if (!txResult.ok) return JSON.stringify({ ok: false, error: txResult.error });
		if (businessError) return JSON.stringify({ ok: false, error: businessError });

		// Post-close: if the slice is ad-hoc (kind=quick|debug), archive it.
		// Milestone-bound slices are archived as part of the parent milestone's
		// cascade close, so they are skipped here.
		if (currentSlice && (currentSlice.kind === "quick" || currentSlice.kind === "debug")) {
			const archiveDbResult = sliceStore.archiveSlice(sliceId);
			if (archiveDbResult.ok) {
				const fsResult = archiveSliceFs(currentSlice, process.cwd());
				if (!fsResult.ok) {
					tffWarn(`slice ${sliceId} archived in DB but FS rename failed: ${fsResult.reason}`);
				}
			} else {
				tffWarn(`slice ${sliceId} DB archive failed: ${archiveDbResult.error.message}`);
			}
		}

		return JSON.stringify({ ok: true, data: { status: "closed", reason } });
	} finally {
		closableStores.close();
	}
};
