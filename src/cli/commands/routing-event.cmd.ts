import { isOk } from "../../domain/result.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { JsonlRoutingDecisionLogger } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-logger.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const routingEventSchema: CommandSchema = {
	name: "routing:event",
	purpose: "Append a workflow event (e.g. debug) to routing.jsonl for Phase D feedback loop",
	requiredFlags: [
		{
			name: "kind",
			type: "string",
			description: "Event kind",
			enum: ["debug"],
		},
		{
			name: "slice",
			type: "string",
			description: "Slice ID",
			pattern: "^M\\d+-S\\d+$",
		},
	],
	optionalFlags: [
		{
			name: "workflow",
			type: "string",
			description: "Workflow id (default tff:debug)",
		},
	],
	examples: ["routing:event --kind debug --slice M01-S01"],
};

export const routingEventCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, routingEventSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const { kind, slice, workflow } = parsed.data as {
		kind: "debug";
		slice: string;
		workflow?: string;
	};

	const projectRoot = process.cwd();
	const reader = new YamlRoutingConfigReader({ projectRoot });
	const configRes = await reader.readConfig();
	if (!isOk(configRes)) {
		return JSON.stringify({ ok: false, error: configRes.error });
	}

	const logger = new JsonlRoutingDecisionLogger(configRes.data.logging.path);
	const appendRes = await logger.append({
		kind,
		timestamp: new Date().toISOString(),
		workflow_id: workflow ?? "tff:debug",
		slice_id: slice,
	});
	if (!isOk(appendRes)) {
		return JSON.stringify({ ok: false, error: appendRes.error });
	}
	return JSON.stringify({ ok: true, data: { kind, slice_id: slice } });
};
