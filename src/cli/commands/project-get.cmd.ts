import { getProject } from "../../application/project/get-project.js";
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

	const { projectStore } = createClosableStateStoresUnchecked();
	const result = await getProject({ projectStore });
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
