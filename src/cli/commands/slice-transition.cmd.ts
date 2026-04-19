import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderCheckpoint } from "../../application/checkpoint/save-checkpoint.js";
import { renderStateMd } from "../../application/sync/generate-state.js";
import { transitionSlice as transitionSliceDomain } from "../../domain/entities/slice.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { createDomainError } from "../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import { checkSliceStatus } from "../../domain/state-machine/preconditions.js";
import {
	type SliceStatus,
	SliceStatusSchema,
	validTransitionsFrom,
} from "../../domain/value-objects/slice-status.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { cleanupTmps, withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { STATE_FILE } from "../../shared/paths.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";

/**
 * Sentinel error thrown inside the tx body when a TOCTOU precondition re-check
 * fails. Carrying the DomainError allows the outer handler to re-surface it
 * as PRECONDITION_VIOLATION instead of the generic TRANSACTION_ROLLBACK wrapper.
 */
class PreconditionViolationTxError extends Error {
	readonly domainError: DomainError;
	constructor(domainError: DomainError) {
		super(domainError.message);
		this.name = "PreconditionViolationTxError";
		this.domainError = domainError;
	}
}

export const sliceTransitionSchema: CommandSchema = {
	name: "slice:transition",
	purpose: "Transition a slice to a new status",
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID (display label e.g. M01-S01 or UUID)",
			pattern:
				"^(M\\d+-S\\d+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
		},
		{
			name: "status",
			type: "string",
			description: "Target status",
			enum: [...SliceStatusSchema.options],
		},
	],
	optionalFlags: [],
	examples: ["slice:transition --slice-id M01-S01 --status planning"],
};

const sliceLabelFromSlice = (
	slice: { number: number; milestoneId: string },
	milestoneNumber: number,
): string => {
	const ms = String(milestoneNumber).padStart(2, "0");
	const sn = String(slice.number).padStart(2, "0");
	return `M${ms}-S${sn}`;
};

export const sliceTransitionCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceTransitionSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": sliceLabel, status: targetStatus } = parsed.data as {
		"slice-id": string;
		status: string;
	};

	const closableStores = createClosableStateStoresUnchecked();
	const { db, sliceStore, milestoneStore, taskStore } = closableStores;

	try {
		SliceStatusSchema.parse(targetStatus);
	} catch {
		closableStores.close();
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: `Invalid status: ${targetStatus}` },
		});
	}

	// Track tmps staged before the tx so we can clean up on body throw.
	const stagedTmps: string[] = [];

	try {
		const resolvedSlice = resolveSliceId(sliceLabel, sliceStore);
		if (!resolvedSlice.ok) {
			return JSON.stringify({ ok: false, error: resolvedSlice.error });
		}
		const sliceId = resolvedSlice.data;

		// Read current slice and milestone (outside tx).
		const currentResult = sliceStore.getSlice(sliceId);
		if (!currentResult.ok) {
			return JSON.stringify({ ok: false, error: currentResult.error });
		}
		if (!currentResult.data) {
			return JSON.stringify({
				ok: false,
				error: { code: "NOT_FOUND", message: `Slice "${sliceId}" not found` },
			});
		}
		const currentSlice = currentResult.data;

		// Pre-validate transition (pure domain) so we surface INVALID_TRANSITION
		// with a recovery hint without entering the tx.
		const validation = transitionSliceDomain(currentSlice, targetStatus as SliceStatus);
		if (!validation.ok) {
			if (validation.error.code === "INVALID_TRANSITION") {
				const validNext = validTransitionsFrom(currentSlice.status);
				const recoveryHint =
					validNext.length > 0
						? `Valid next: ${validNext.join(", ")}`
						: "No valid transitions available from this status";
				return JSON.stringify({
					ok: false,
					error: {
						code: validation.error.code,
						message: validation.error.message,
						recoveryHint,
					},
				});
			}
			return JSON.stringify({ ok: false, error: validation.error });
		}

		const milestoneResult = milestoneStore.getMilestone(currentSlice.milestoneId);
		if (!milestoneResult.ok) {
			return JSON.stringify({ ok: false, error: milestoneResult.error });
		}
		if (!milestoneResult.data) {
			return JSON.stringify({
				ok: false,
				error: {
					code: "NOT_FOUND",
					message: `Milestone "${currentSlice.milestoneId}" not found`,
				},
			});
		}
		const milestoneNumber = milestoneResult.data.number;
		const displaySliceLabel = sliceLabelFromSlice(currentSlice, milestoneNumber);

		// Render STATE.md content (reflecting the post-transition state).
		// We patch the slice status in-memory to simulate post-commit state; the
		// renderer is pure so this is safe.
		const projectedSlice = { ...currentSlice, status: targetStatus as SliceStatus };
		const stateContent = renderStateMd(
			{ milestoneId: currentSlice.milestoneId },
			{
				milestoneStore,
				sliceStore: {
					...sliceStore,
					listSlices: (mid?: string) => {
						const base = sliceStore.listSlices(mid);
						if (!base.ok) return base;
						const swapped = base.data.map((s) => (s.id === projectedSlice.id ? projectedSlice : s));
						return { ok: true as const, data: swapped };
					},
				},
				taskStore,
			},
		);
		if (!stateContent.ok) {
			return JSON.stringify({ ok: false, error: stateContent.error });
		}

		// Stage STATE.md to .tff-cc/STATE.md.tmp.
		const stateFinalAbs = resolve(process.cwd(), STATE_FILE);
		const stateTmpAbs = `${stateFinalAbs}.tmp`;
		mkdirSync(resolve(process.cwd(), ".tff-cc"), { recursive: true });
		writeFileSync(stateTmpAbs, stateContent.data, "utf8");
		stagedTmps.push(stateTmpAbs);

		// Render checkpoint content (empty / baseline checkpoint on transition).
		const checkpoint = renderCheckpoint({
			sliceId: displaySliceLabel,
			baseCommit: "",
			currentWave: 0,
			completedWaves: [],
			completedTasks: [],
			executorLog: [],
		});
		const ckptDirAbs = resolve(process.cwd(), checkpoint.dir);
		const ckptFinalAbs = resolve(process.cwd(), checkpoint.path);
		const ckptTmpAbs = `${ckptFinalAbs}.tmp`;
		mkdirSync(ckptDirAbs, { recursive: true });
		writeFileSync(ckptTmpAbs, checkpoint.content, "utf8");
		stagedTmps.push(ckptTmpAbs);

		// Closure variable: if the tx body throws due to a TOCTOU precondition
		// re-check failure, we store the DomainError here so the outer handler
		// can re-surface PRECONDITION_VIOLATION cleanly instead of the generic
		// TRANSACTION_ROLLBACK wrapper.
		let preconditionRollbackError: DomainError | undefined;

		// Run DB mutation + staged renames inside withTransaction.
		const txResult = await withTransaction(db, () => {
			// TOCTOU re-check: verify the slice is still in the expected status.
			// This defends against a writer racing between the outer read and the
			// tx opening. If the status changed, throw so the tx rolls back.
			const recheck = checkSliceStatus(sliceStore, sliceId, currentSlice.status);
			if (!recheck.ok) {
				const err = preconditionViolationError(recheck.violations);
				preconditionRollbackError = err;
				throw new PreconditionViolationTxError(err);
			}

			const transitionResult = sliceStore.transitionSlice(sliceId, targetStatus as SliceStatus);
			if (!transitionResult.ok) {
				throw new Error(`${transitionResult.error.code}: ${transitionResult.error.message}`);
			}
			return {
				data: { status: targetStatus },
				tmpRenames: [
					[stateTmpAbs, stateFinalAbs] as [string, string],
					[ckptTmpAbs, ckptFinalAbs] as [string, string],
				],
			};
		});

		if (!txResult.ok) {
			// Tx rolled back. Clean up whatever tmps we staged pre-tx.
			cleanupTmps(stagedTmps);
			// If the rollback was triggered by a TOCTOU precondition re-check,
			// re-surface the original PRECONDITION_VIOLATION error directly rather
			// than the generic TRANSACTION_ROLLBACK wrapper.
			if (preconditionRollbackError !== undefined) {
				return JSON.stringify({ ok: false, error: preconditionRollbackError });
			}
			return JSON.stringify({ ok: false, error: txResult.error });
		}

		// Best-effort WAL checkpoint (non-critical).
		const warnings: DomainError[] = [...txResult.warnings];
		try {
			closableStores.checkpoint();
		} catch (e) {
			const msg = `checkpoint failed: ${String(e)}`;
			tffWarn(msg);
			warnings.push(createDomainError("PARTIAL_SUCCESS", msg, { pendingEffect: "wal_checkpoint" }));
		}

		return JSON.stringify({ ok: true, data: { status: txResult.data.status }, warnings });
	} finally {
		closableStores.close();
	}
};
