import { isOk } from "../../domain/result.js";
import { ObservationSchema } from "../../domain/value-objects/observation.js";
import { JsonlStoreAdapter } from "../../infrastructure/adapters/jsonl/jsonl-store.adapter.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const observeRecordSchema: CommandSchema = {
	name: "observe:record",
	purpose: "Record an observation for pattern detection",
	requiredFlags: [
		{
			name: "ts",
			type: "string",
			description: "Timestamp",
		},
		{
			name: "session",
			type: "string",
			description: "Session ID",
		},
		{
			name: "tool",
			type: "string",
			description: "Tool name",
		},
		{
			name: "args",
			type: "json",
			description: "Tool arguments as JSON",
		},
		{
			name: "project",
			type: "string",
			description: "Project ID",
		},
	],
	optionalFlags: [],
	examples: [
		'observe:record --ts "2024-01-01T00:00:00Z" --session sess-1 --tool Read --args \'{"path":"file.ts"}\' --project proj-1',
	],
};

export const observeRecordCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, observeRecordSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	try {
		const obs = ObservationSchema.parse({
			ts: parsed.data.ts,
			session: parsed.data.session,
			tool: parsed.data.tool,
			args: parsed.data.args,
			project: parsed.data.project,
		});
		const store = new JsonlStoreAdapter(".tff-cc/observations");
		const result = await store.appendObservation(obs);
		if (isOk(result)) return JSON.stringify({ ok: true, data: null });
		return JSON.stringify({ ok: false, error: result.error });
	} catch (e) {
		return JSON.stringify({ ok: false, error: { code: "INVALID_ARGS", message: String(e) } });
	}
};
