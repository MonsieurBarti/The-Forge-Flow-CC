import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";

export const depAddSchema: CommandSchema = {
	name: "dep:add",
	purpose: "Add a dependency between two entities",
	mutates: true,
	requiredFlags: [
		{ name: "from-id", type: "string", description: "ID of the entity that is blocked" },
		{ name: "to-id", type: "string", description: "ID of the blocking entity" },
	],
	optionalFlags: [
		{
			name: "type",
			type: "string",
			description: "Entity type: 'task' (default) or 'slice'",
			enum: ["task", "slice"],
		},
	],
	examples: [
		"dep:add --from-id <task-uuid> --to-id <task-uuid>",
		"dep:add --from-id M01-S02 --to-id M01-S01 --type slice",
	],
};

export const depAddCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, depAddSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const {
		"from-id": fromLabel,
		"to-id": toLabel,
		type,
	} = parsed.data as {
		"from-id": string;
		"to-id": string;
		type?: string;
	};

	const stores = createClosableStateStoresUnchecked();
	const { dependencyStore, sliceDependencyStore, sliceStore } = stores;

	try {
		if (type === "slice") {
			const fromResult = resolveSliceId(fromLabel, sliceStore);
			if (!fromResult.ok) return JSON.stringify({ ok: false, error: fromResult.error });
			const toResult = resolveSliceId(toLabel, sliceStore);
			if (!toResult.ok) return JSON.stringify({ ok: false, error: toResult.error });

			const result = sliceDependencyStore.addSliceDependency(fromResult.data, toResult.data);
			if (isOk(result)) return JSON.stringify({ ok: true, data: null });
			return JSON.stringify({ ok: false, error: result.error });
		}

		// Default: task dependency
		const result = dependencyStore.addDependency(fromLabel, toLabel, "blocks");
		if (isOk(result)) return JSON.stringify({ ok: true, data: null });
		return JSON.stringify({ ok: false, error: result.error });
	} finally {
		stores.close();
	}
};
