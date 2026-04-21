import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderStateMd } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { STATE_FILE } from "../../shared/paths.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const stateDiffSchema: CommandSchema = {
	name: "state:diff",
	purpose: "Diff rendered STATE.md (from SQLite) against on-disk STATE.md",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [
		{
			name: "full",
			type: "boolean",
			description: "Print the full diff; default truncates at 200 lines",
		},
	],
	examples: ["state:diff", "state:diff --full"],
};

interface DiffResult {
	inSync: boolean;
	diff?: string;
}

export const stateDiffCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, stateDiffSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const { full } = parsed.data as { full?: boolean };

	const stores = createClosableStateStoresUnchecked();
	try {
		const { milestoneStore, sliceStore, taskStore } = stores;

		const milestonesResult = milestoneStore.listMilestones();
		if (!isOk(milestonesResult)) {
			return JSON.stringify({ ok: false, error: milestonesResult.error });
		}
		if (milestonesResult.data.length === 0) {
			// No milestone → nothing to render → trivially in-sync if STATE.md absent.
			const path = resolve(process.cwd(), STATE_FILE);
			const onDisk = existsSync(path) ? readFileSync(path, "utf8") : "";
			const inSync = onDisk === "";
			const payload: DiffResult = inSync
				? { inSync }
				: { inSync, diff: unifiedDiff("", onDisk, full) };
			return JSON.stringify({ ok: true, data: payload });
		}

		const latest = milestonesResult.data[milestonesResult.data.length - 1];
		const rendered = renderStateMd(
			{ milestoneId: latest.id },
			{ milestoneStore, sliceStore, taskStore },
		);
		if (!isOk(rendered)) return JSON.stringify({ ok: false, error: rendered.error });

		const path = resolve(process.cwd(), STATE_FILE);
		const onDisk = existsSync(path) ? readFileSync(path, "utf8") : "";

		if (rendered.data === onDisk) {
			return JSON.stringify({ ok: true, data: { inSync: true } });
		}
		return JSON.stringify({
			ok: true,
			data: { inSync: false, diff: unifiedDiff(rendered.data, onDisk, full) },
		});
	} finally {
		stores.close();
	}
};

const unifiedDiff = (expected: string, actual: string, full?: boolean): string => {
	const e = expected.split("\n");
	const a = actual.split("\n");
	const out: string[] = ["--- expected (from SQLite)", "+++ actual (on disk)"];
	const max = Math.max(e.length, a.length);
	for (let i = 0; i < max; i++) {
		if (e[i] === a[i]) continue;
		if (e[i] !== undefined) out.push(`-${e[i]}`);
		if (a[i] !== undefined) out.push(`+${a[i]}`);
	}
	if (!full && out.length > 200) {
		return `${out.slice(0, 200).join("\n")}\n… (truncated; pass --full for complete diff)`;
	}
	return out.join("\n");
};
