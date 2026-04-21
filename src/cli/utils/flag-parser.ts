/**
 * Flag types for command schema definitions
 */
export type FlagType = "string" | "number" | "boolean" | "json";

/**
 * Definition of a single command flag
 */
export interface FlagDefinition {
	/** Flag name without -- prefix (e.g., "slice-id") */
	name: string;
	/** Type of the flag value */
	type: FlagType;
	/** Human-readable description */
	description: string;
	/** Valid values for enum types */
	enum?: string[];
	/** Regex pattern for validation */
	pattern?: string;
}

/**
 * Schema definition for a CLI command
 */
export interface CommandSchema {
	/** Command name (e.g., "slice:transition") */
	name: string;
	/** Brief description of what the command does */
	purpose: string;
	/** When true, wraps handler in withMutatingCommand for branch-guard enforcement */
	mutates?: boolean;
	/** Flags that must be provided */
	requiredFlags: FlagDefinition[];
	/** Flags that are optional */
	optionalFlags: FlagDefinition[];
	/** Example command invocations */
	examples: string[];
}

/**
 * Result of flag parsing - success case
 */
export interface FlagSuccess {
	ok: true;
	data: Record<string, unknown>;
}

/**
 * Error codes for flag parsing failures
 */
export type FlagErrorCode =
	| "MISSING_REQUIRED_FLAG"
	| "UNKNOWN_FLAG"
	| "INVALID_ENUM_VALUE"
	| "INVALID_NUMBER"
	| "INVALID_JSON"
	| "PATTERN_MISMATCH";

/**
 * Result of flag parsing - failure case
 */
export interface FlagFailure {
	ok: false;
	error: {
		code: FlagErrorCode;
		message: string;
		missingFlags?: string[];
		unknownFlag?: string;
		validFlags?: string[];
		flag?: string;
		provided?: string;
		validValues?: string[];
		pattern?: string;
	};
}

/**
 * Result of flag parsing
 */
export type FlagResult = FlagSuccess | FlagFailure;

/**
 * Parse command-line flags according to a command schema.
 *
 * Supports:
 * - `--flag value` syntax
 * - `--flag=value` syntax
 * - Boolean flags (no value needed)
 * - Type coercion (string, number, boolean, json)
 * - Enum validation
 * - Pattern validation
 * - Required flag checking
 * - Unknown flag detection
 */
export function parseFlags(args: string[], schema: CommandSchema): FlagResult {
	const result: Record<string, unknown> = {};
	const allFlags = [...schema.requiredFlags, ...schema.optionalFlags];
	const validFlagNames = new Set(allFlags.map((f) => f.name));

	// Add reserved flags
	validFlagNames.add("help");
	validFlagNames.add("json");

	// Build flag definition lookup
	const flagDefs = new Map<string, FlagDefinition>();
	for (const flag of allFlags) {
		flagDefs.set(flag.name, flag);
	}

	// Parse arguments
	let i = 0;
	while (i < args.length) {
		const arg = args[i];

		// Check if this is a flag
		if (!arg.startsWith("--")) {
			// Unknown argument format
			return {
				ok: false,
				error: {
					code: "UNKNOWN_FLAG",
					message: `Unexpected argument format: ${arg}`,
					unknownFlag: arg,
					validFlags: Array.from(validFlagNames),
				},
			};
		}

		// Extract flag name and value
		let flagName: string;
		let flagValue: string | undefined;
		let consumesNext = false;

		if (arg.includes("=")) {
			// --flag=value syntax
			const eqIndex = arg.indexOf("=");
			flagName = arg.slice(2, eqIndex);
			flagValue = arg.slice(eqIndex + 1);
		} else {
			// --flag value syntax
			flagName = arg.slice(2);
			consumesNext = true;
		}

		// Check for reserved flags
		if (flagName === "help") {
			result._help = true;
			i++;
			continue;
		}
		if (flagName === "json") {
			result._json = true;
			i++;
			continue;
		}

		// Validate flag name
		if (!validFlagNames.has(flagName)) {
			return {
				ok: false,
				error: {
					code: "UNKNOWN_FLAG",
					message: `Unknown flag: --${flagName}`,
					unknownFlag: flagName,
					validFlags: Array.from(validFlagNames),
				},
			};
		}

		// Get flag definition
		const flagDef = flagDefs.get(flagName);

		// Handle boolean flags
		if (flagDef?.type === "boolean") {
			result[flagName] = true;
			i++;
			continue;
		}

		// Get value for non-boolean flags
		if (flagValue === undefined) {
			if (consumesNext && i + 1 < args.length) {
				flagValue = args[i + 1];
				i += 2;
			} else {
				return {
					ok: false,
					error: {
						code: "MISSING_REQUIRED_FLAG",
						message: `Flag --${flagName} requires a value`,
						missingFlags: [flagName],
					},
				};
			}
		} else {
			i++;
		}

		// Type coercion and validation
		const coercionResult = coerceValue(flagName, flagValue, flagDef);
		if (!coercionResult.ok) {
			return coercionResult;
		}

		result[flagName] = coercionResult.data;
	}

	// Check for required flags (skip if --help is present)
	if (!result._help) {
		const providedFlags = new Set(Object.keys(result));
		const missingFlags = schema.requiredFlags
			.filter((f) => !providedFlags.has(f.name))
			.map((f) => f.name);

		if (missingFlags.length > 0) {
			return {
				ok: false,
				error: {
					code: "MISSING_REQUIRED_FLAG",
					message: `Missing required flag(s): ${missingFlags.map((f) => `--${f}`).join(", ")}`,
					missingFlags,
					validFlags: schema.requiredFlags.map((f) => f.name),
				},
			};
		}
	}

	return { ok: true, data: result };
}

/**
 * Coerce a string value to the appropriate type
 */
function coerceValue(
	flagName: string,
	value: string,
	def: FlagDefinition | undefined,
): { ok: true; data: unknown } | FlagFailure {
	if (!def) {
		// Unknown flag was already handled, but just in case
		return { ok: true, data: value };
	}

	switch (def.type) {
		case "string": {
			// Validate enum if present
			if (def.enum && !def.enum.includes(value)) {
				return {
					ok: false,
					error: {
						code: "INVALID_ENUM_VALUE",
						message: `Invalid value for --${flagName}: '${value}'. Must be one of: ${def.enum.join(", ")}`,
						flag: flagName,
						provided: value,
						validValues: def.enum,
					},
				};
			}

			// Validate pattern if present
			if (def.pattern) {
				const regex = new RegExp(def.pattern);
				if (!regex.test(value)) {
					return {
						ok: false,
						error: {
							code: "PATTERN_MISMATCH",
							message: `Invalid format for --${flagName}: '${value}'. Must match pattern: ${def.pattern}`,
							flag: flagName,
							provided: value,
							pattern: def.pattern,
						},
					};
				}
			}

			return { ok: true, data: value };
		}

		case "number": {
			const num = Number(value);
			if (Number.isNaN(num)) {
				return {
					ok: false,
					error: {
						code: "INVALID_NUMBER",
						message: `Invalid number for --${flagName}: '${value}'`,
						flag: flagName,
						provided: value,
					},
				};
			}
			return { ok: true, data: num };
		}

		case "boolean": {
			// Boolean flags should not reach here with a value
			return { ok: true, data: true };
		}

		case "json": {
			try {
				const parsed = JSON.parse(value);
				return { ok: true, data: parsed };
			} catch {
				return {
					ok: false,
					error: {
						code: "INVALID_JSON",
						message: `Invalid JSON for --${flagName}: '${value}'`,
						flag: flagName,
						provided: value,
					},
				};
			}
		}

		default:
			return { ok: true, data: value };
	}
}
