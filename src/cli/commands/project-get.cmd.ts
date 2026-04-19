import { join } from "node:path";
import { getProject } from "../../application/project/get-project.js";
import { reconcileState } from "../../application/reconcile/reconcile-state.js";
import { renderStateMd } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import type { CommandSchema } from "../utils/flag-parser.js";

export const projectGetSchema: CommandSchema = {
	name: "project:get",
	purpose: "Get the current project information",
	requiredFlags: [],
	optionalFlags: [],
	examples: ["project:get"],
};

export const projectGetCmd = async (args: string[]): Promise<string> => {
	// No flags to parse, but we still use the schema for consistency
	// Check for --help flag manually since we skip parseFlags when no required flags
	if (args.includes("--help")) {
		return JSON.stringify({
			ok: true,
			data: {
				name: projectGetSchema.name,
				purpose: projectGetSchema.purpose,
				syntax: projectGetSchema.name,
				requiredFlags: [],
				optionalFlags: [],
				examples: projectGetSchema.examples,
			},
		});
	}

	const { projectStore, milestoneStore, sliceStore, taskStore } =
		createClosableStateStoresUnchecked();
	const result = await getProject({ projectStore });

	// Reconcile STATE.md against DB-derived render. Non-fatal: never blocks the read.
	try {
		const activeMR = milestoneStore.listMilestones();
		if (activeMR.ok) {
			const active = activeMR.data.find((m) => m.status !== "closed");
			if (active) {
				await reconcileState({
					stateMdPath: join(process.cwd(), ".tff-cc", "STATE.md"),
					renderStateMd: async () => {
						const r = renderStateMd(
							{ milestoneId: active.id },
							{ milestoneStore, sliceStore, taskStore },
						);
						if (!r.ok) throw new Error(r.error.message);
						return r.data;
					},
				});
			}
		}
	} catch {
		// Intentionally swallowed: reconcile must never fail a read.
	}

	if (isOk(result)) {
		if (result.data === null) {
			return JSON.stringify({
				ok: false,
				error: { code: "NOT_FOUND", message: "No tff project found. Run /tff:new first." },
			});
		}
		return JSON.stringify({ ok: true, data: result.data });
	}
	return JSON.stringify({ ok: false, error: result.error });
};
