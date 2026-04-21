import { listMilestones } from "../../application/milestone/list-milestones.js";
import { reconcileOnRead } from "../../application/reconcile/reconcile-on-read.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import type { CommandSchema } from "../utils/flag-parser.js";

export const milestoneListSchema: CommandSchema = {
	name: "milestone:list",
	purpose: "List all milestones",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [],
	examples: ["milestone:list"],
};

export const milestoneListCmd = async (args: string[]): Promise<string> => {
	// Check for --help flag
	if (args.includes("--help")) {
		return JSON.stringify({
			ok: true,
			data: {
				name: milestoneListSchema.name,
				purpose: milestoneListSchema.purpose,
				syntax: milestoneListSchema.name,
				requiredFlags: [],
				optionalFlags: [],
				examples: milestoneListSchema.examples,
			},
		});
	}

	const { milestoneStore, sliceStore, taskStore } = createClosableStateStoresUnchecked();
	const result = await listMilestones({ milestoneStore });

	await reconcileOnRead(process.cwd(), { milestoneStore, sliceStore, taskStore });

	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
