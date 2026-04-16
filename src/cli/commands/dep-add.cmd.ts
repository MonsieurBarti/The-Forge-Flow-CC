import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { parseFlags, type CommandSchema } from "../utils/flag-parser.js";

export const depAddSchema: CommandSchema = {
	name: "dep:add",
	purpose: "Add a dependency between two entities",
	requiredFlags: [
		{
			name: "from-id",
			type: "string",
			description: "ID of the entity that is blocked",
		},
		{
			name: "to-id",
			type: "string",
			description: "ID of the blocking entity",
		},
	],
	optionalFlags: [],
	examples: ["dep:add --from-id T02 --to-id T01"],
};

export const depAddCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, depAddSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "from-id": fromId, "to-id": toId } = parsed.data as {
		"from-id": string;
		"to-id": string;
	};

	const { dependencyStore } = createClosableStateStoresUnchecked();
	const result = dependencyStore.addDependency(fromId, toId, "blocks");
	if (isOk(result)) return JSON.stringify({ ok: true, data: null });
	return JSON.stringify({ ok: false, error: result.error });
};
