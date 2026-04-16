import type { CommandSchema } from "../utils/flag-parser.js";
import { getCommandSchema, getAllCommandNames } from "./registry.js";

export const schemaCmd = async (args: string[]): Promise<string> => {
	// Parse --command flag
	let commandName: string | undefined;
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--command" && i + 1 < args.length) {
			commandName = args[i + 1];
			break;
		}
		if (args[i]?.startsWith("--command=")) {
			commandName = args[i].slice("--command=".length);
			break;
		}
	}

	if (!commandName) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "MISSING_REQUIRED_FLAG",
				message: "Missing required flag: --command",
				requiredFlags: ["--command"],
				availableCommands: getAllCommandNames(),
			},
		});
	}

	const schema = getCommandSchema(commandName);
	if (!schema) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "UNKNOWN_COMMAND",
				message: `Unknown command "${commandName}"`,
				availableCommands: getAllCommandNames(),
			},
		});
	}

	return JSON.stringify({
		ok: true,
		data: {
			command: schema.name,
			flags: schemaToJsonSchema(schema),
		},
	});
};

/**
 * Convert a CommandSchema to JSON Schema format
 */
function schemaToJsonSchema(schema: CommandSchema): Record<string, unknown> {
	const properties: Record<string, Record<string, unknown>> = {};
	const required: string[] = [];

	for (const flag of schema.requiredFlags) {
		required.push(flag.name);
		properties[flag.name] = flagToJsonSchema(flag);
	}

	for (const flag of schema.optionalFlags) {
		properties[flag.name] = flagToJsonSchema(flag);
	}

	return {
		type: "object",
		required,
		properties,
	};
}

/**
 * Convert a FlagDefinition to JSON Schema format
 */
function flagToJsonSchema(flag: {
	name: string;
	type: string;
	description: string;
	enum?: string[];
	pattern?: string;
}): Record<string, unknown> {
	const schema: Record<string, unknown> = {
		type: flag.type === "json" ? "object" : flag.type,
		description: flag.description,
	};

	if (flag.enum) {
		schema.enum = flag.enum;
	}

	if (flag.pattern) {
		schema.pattern = flag.pattern;
	}

	return schema;
}

/**
 * Schema for the schema command itself
 */
export const schemaCmdSchema: CommandSchema = {
	name: "schema",
	purpose: "Get JSON Schema for any command's flags",
	requiredFlags: [
		{
			name: "command",
			type: "string",
			description: "Name of the command to get schema for",
		},
	],
	optionalFlags: [],
	examples: ["schema --command slice:transition"],
};
