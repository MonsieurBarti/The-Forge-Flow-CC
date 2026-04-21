import { transitionSliceOrchestrator } from "../../application/slice/transition-slice.js";
import { SliceStatusSchema } from "../../domain/value-objects/slice-status.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const sliceTransitionSchema: CommandSchema = {
	name: "slice:transition",
	purpose: "Transition a slice to a new status",
	mutates: true,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID (display label e.g. M01-S01 or UUID)",
			pattern:
				"^(M\\d+-S\\d+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
		},
		{
			name: "status",
			type: "string",
			description: "Target status",
			enum: [...SliceStatusSchema.options],
		},
	],
	optionalFlags: [],
	examples: ["slice:transition --slice-id M01-S01 --status planning"],
};

/**
 * Thin CLI adapter: parse flags, open stores, delegate to the orchestrator,
 * serialize the response. All orchestration logic lives in
 * `application/slice/transition-slice.ts`.
 */
export const sliceTransitionCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceTransitionSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": sliceLabel, status: rawStatus } = parsed.data as {
		"slice-id": string;
		status: string;
	};

	// Validate status shape (flag-parser already enforces enum, but preserve the
	// historical INVALID_ARGS contract as a belt-and-braces check).
	const parsedStatus = SliceStatusSchema.safeParse(rawStatus);
	if (!parsedStatus.success) {
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: `Invalid status: ${rawStatus}` },
		});
	}

	const stores = createClosableStateStoresUnchecked();
	try {
		const response = await transitionSliceOrchestrator(
			{ sliceLabel, targetStatus: parsedStatus.data, cwd: process.cwd() },
			{ stores },
		);
		return JSON.stringify(response);
	} finally {
		stores.close();
	}
};
