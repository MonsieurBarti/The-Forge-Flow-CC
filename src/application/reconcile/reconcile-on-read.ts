import { join } from "node:path";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import type { SliceStore } from "../../domain/ports/slice-store.port.js";
import type { TaskStore } from "../../domain/ports/task-store.port.js";
import { renderStateMd } from "../sync/generate-state.js";
import { reconcileState } from "./reconcile-state.js";

export interface ReconcileOnReadStores {
	milestoneStore: MilestoneStore;
	sliceStore: SliceStore;
	taskStore: TaskStore;
}

/**
 * Helper shared by read-path commands (slice:list, milestone:list,
 * project:get) that reconcile STATE.md against a DB-derived render.
 *
 * Contract: never throws, never blocks the caller's read, never mutates DB.
 * If there is no open milestone, or the render fails, or the atomic write
 * fails, the helper silently returns — the read must succeed regardless.
 */
export const reconcileOnRead = async (
	cwd: string,
	stores: ReconcileOnReadStores,
): Promise<void> => {
	try {
		const activeMR = stores.milestoneStore.listMilestones();
		if (!activeMR.ok) return;
		const active = activeMR.data.find((m) => m.status !== "closed");
		if (!active) return;

		await reconcileState({
			stateMdPath: join(cwd, ".tff-cc", "STATE.md"),
			renderStateMd: async () => {
				const r = renderStateMd({ milestoneId: active.id }, stores);
				if (!r.ok) throw new Error(r.error.message);
				return r.data;
			},
		});
	} catch {
		// Intentionally swallowed: reconcile must never fail a read.
	}
};
