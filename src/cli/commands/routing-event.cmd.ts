import { isOk } from "../../domain/result.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { JsonlRoutingDecisionLogger } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-logger.js";
import { JsonlRoutingDecisionReader } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-reader.js";
import { resolvePluginRoot } from "../../infrastructure/plugin-root.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveRoutingPaths } from "../utils/routing-paths.js";

const DEBUG_DEBOUNCE_MS = 60 * 1000;

export const routingEventSchema: CommandSchema = {
	name: "routing:event",
	purpose: "Append a workflow event (e.g. debug) to routing.jsonl for Phase D feedback loop",
	mutates: true,
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
	const pluginRoot = resolvePluginRoot();
	const configReader = new YamlRoutingConfigReader({ projectRoot, pluginRoot });
	const configRes = await configReader.readConfig();
	if (!isOk(configRes)) {
		return JSON.stringify({ ok: false, error: configRes.error });
	}

	if (!configRes.data.enabled) {
		return JSON.stringify({
			ok: true,
			data: { kind, slice_id: slice, skipped: true, reason: "routing_disabled" },
		});
	}

	const { routingPath } = resolveRoutingPaths(projectRoot, configRes.data.logging.path);

	if (kind === "debug") {
		const reader = new JsonlRoutingDecisionReader(routingPath);
		const recent = await reader.readDebugEvents();
		const now = Date.now();
		const isRecent = recent.some(
			(e) => e.slice_id === slice && now - Date.parse(e.timestamp) < DEBUG_DEBOUNCE_MS,
		);
		if (isRecent) {
			return JSON.stringify({
				ok: true,
				data: { kind, slice_id: slice, skipped: true, reason: "debounced" },
			});
		}
	}

	const logger = new JsonlRoutingDecisionLogger(routingPath);
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
