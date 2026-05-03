import { writeFileSync } from "node:fs";
import { renderStateMd } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { stageStateMdTmp } from "../../infrastructure/persistence/stage-state-md.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";

export const taskCreateSchema: CommandSchema = {
	name: "task:create",
	purpose: "Create a task in a slice and persist it in the DB",
	mutates: true,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID (M01-S01 / Q-1 / D-1 label, or UUID)",
			pattern:
				"^(M\\d+-S\\d+|[QD]-\\d+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
		},
		{
			name: "number",
			type: "number",
			description: "Task number within the slice (1-based)",
		},
		{
			name: "title",
			type: "string",
			description: "Task title",
		},
	],
	optionalFlags: [
		{
			name: "description",
			type: "string",
			description: "Task description",
		},
		{
			name: "wave",
			type: "number",
			description: "Wave index (0-based) for parallel execution",
		},
	],
	examples: [
		'task:create --slice-id M01-S01 --number 1 --title "Write failing test"',
		'task:create --slice-id M01-S01 --number 2 --title "Implement validator" --wave 1 --description "AC2: reject empty inputs"',
	],
};

export const taskCreateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, taskCreateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const {
		"slice-id": sliceLabel,
		number,
		title,
		description,
		wave,
	} = parsed.data as {
		"slice-id": string;
		number: number;
		title: string;
		description?: string;
		wave?: number;
	};

	const cwd = process.cwd();
	const closableStores = createClosableStateStoresUnchecked();
	const { db, milestoneStore, sliceStore, taskStore } = closableStores;

	const stagedTmps: string[] = [];
	const stagedDirs: string[] = [];

	try {
		const resolved = resolveSliceId(sliceLabel, sliceStore);
		if (!isOk(resolved)) return JSON.stringify({ ok: false, error: resolved.error });
		const sliceId = resolved.data;

		const sliceResult = sliceStore.getSlice(sliceId);
		if (!isOk(sliceResult)) return JSON.stringify({ ok: false, error: sliceResult.error });
		if (!sliceResult.data) {
			return JSON.stringify({
				ok: false,
				error: { code: "NOT_FOUND", message: `Slice "${sliceLabel}" not found` },
			});
		}
		const slice = sliceResult.data;

		// STATE.md regen is only valid for milestone-bound slices today (mirrors
		// slice:create — ad-hoc quick/debug slices don't have a per-kind STATE.md
		// rendered transactionally yet).
		const milestoneId = slice.kind === "milestone" ? slice.milestoneId : undefined;
		let stateFinalAbs: string | undefined;
		let stateTmpAbs: string | undefined;
		if (milestoneId) {
			const staged = stageStateMdTmp(cwd, stagedTmps, stagedDirs);
			stateFinalAbs = staged.stateFinalAbs;
			stateTmpAbs = staged.stateTmpAbs;
		}

		const txResult = await withTransaction(
			db,
			() => {
				const created = taskStore.createTask({
					sliceId,
					number,
					title,
					description,
					wave,
				});
				if (!created.ok) {
					throw new Error(`${created.error.code}: ${created.error.message}`);
				}

				const tmpRenames: Array<[string, string]> = [];
				if (milestoneId && stateTmpAbs && stateFinalAbs) {
					const stateContent = renderStateMd(
						{ milestoneId },
						{ milestoneStore, sliceStore, taskStore },
					);
					if (!stateContent.ok) {
						throw new Error(`${stateContent.error.code}: ${stateContent.error.message}`);
					}
					writeFileSync(stateTmpAbs, stateContent.data, "utf8");
					tmpRenames.push([stateTmpAbs, stateFinalAbs]);
				}

				return { data: { task: created.data }, tmpRenames };
			},
			stagedTmps,
			stagedDirs,
		);

		if (!txResult.ok) {
			return JSON.stringify({ ok: false, error: txResult.error });
		}

		const warnings = [...txResult.warnings];
		try {
			closableStores.checkpoint();
		} catch (e) {
			tffWarn(`checkpoint failed: ${String(e)}`);
		}

		return JSON.stringify({ ok: true, data: { task: txResult.data.task }, warnings });
	} finally {
		closableStores.close();
	}
};
