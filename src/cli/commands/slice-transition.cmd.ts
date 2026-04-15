import { transitionSliceUseCase } from "../../application/lifecycle/transition-slice.js";
import { generateState } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import {
	type SliceStatus,
	SliceStatusSchema,
	validTransitionsFrom,
} from "../../domain/value-objects/slice-status.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";

export const sliceTransitionCmd = async (args: string[]): Promise<string> => {
	const [sliceId, targetStatus] = args;
	if (!sliceId || !targetStatus) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "INVALID_ARGS",
				message: "Usage: slice:transition <slice-id> <target-status>",
			},
		});
	}

	try {
		SliceStatusSchema.parse(targetStatus);
	} catch {
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: `Invalid status: ${targetStatus}` },
		});
	}

	const closableStores = createClosableStateStoresUnchecked();
	const { sliceStore, milestoneStore, taskStore } = closableStores;

	try {
		const artifactStore = new MarkdownArtifactAdapter(process.cwd());

		const result = await transitionSliceUseCase(
			{ sliceId, targetStatus: targetStatus as SliceStatus },
			{ sliceStore },
		);

		if (isOk(result)) {
			const warnings: string[] = [];
			const { slice } = result.data;

			// Auto-regenerate STATE.md (non-critical)
			try {
				await generateState(
					{ milestoneId: slice.milestoneId },
					{ milestoneStore, sliceStore, taskStore, artifactStore },
				);
			} catch (e) {
				const msg = `state sync failed: ${String(e)}`;
				tffWarn(msg);
				warnings.push(msg);
			}

			// Auto-checkpoint database
			try {
				closableStores.checkpoint();
			} catch (e) {
				const msg = `checkpoint failed: ${String(e)}`;
				tffWarn(msg);
				warnings.push(msg);
			}

			// Auto-save CHECKPOINT.md (CRITICAL — blocks transition)
			try {
				const { checkpointSaveCmd } = await import("./checkpoint-save.cmd.js");
				const checkpointData = JSON.stringify({
					sliceId,
					baseCommit: "",
					currentWave: 0,
					completedWaves: [],
					completedTasks: [],
					executorLog: [],
				});
				await checkpointSaveCmd([checkpointData]);
			} catch (e) {
				return JSON.stringify({
					ok: false,
					error: { code: "CHECKPOINT_FAILED", message: `Checkpoint save failed: ${String(e)}` },
					warnings,
				});
			}

			return JSON.stringify({ ok: true, data: { status: slice.status }, warnings });
		}

		// Enhance INVALID_TRANSITION errors with valid next steps
		if (result.error.code === "INVALID_TRANSITION" && result.error.context?.from) {
			const fromStatus = result.error.context.from as SliceStatus;
			const validNext = validTransitionsFrom(fromStatus);
			const recoveryHint =
				validNext.length > 0
					? `Valid next: ${validNext.join(", ")}`
					: "No valid transitions available from this status";
			return JSON.stringify({
				ok: false,
				error: {
					code: result.error.code,
					message: result.error.message,
					recoveryHint,
				},
			});
		}

		return JSON.stringify({ ok: false, error: result.error });
	} finally {
		closableStores.close();
	}
};
