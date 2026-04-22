import { join } from "node:path";
import { decideUseCase } from "../../application/routing/decide.js";
import { isOk } from "../../domain/result.js";
import { FilesystemSignalExtractor } from "../../infrastructure/adapters/filesystem/filesystem-signal-extractor.js";
import { FilesystemTierConfigReader } from "../../infrastructure/adapters/filesystem/filesystem-tier-config-reader.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { JsonlRoutingDecisionLogger } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-logger.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const routingDecideSchema: CommandSchema = {
	name: "routing:decide",
	purpose:
		"Extract signals and produce per-agent tier decisions for a workflow (unified Phase C routing)",
	mutates: true,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID",
			pattern: "^M\\d+-S\\d+$",
		},
		{
			name: "workflow",
			type: "string",
			description: "Workflow identifier (e.g., tff:ship)",
		},
	],
	optionalFlags: [
		{
			name: "json",
			type: "boolean",
			description: "Emit JSON output on stdout",
		},
	],
	examples: [
		"routing:decide --slice-id M01-S01 --workflow tff:ship",
		"routing:decide --slice-id M01-S01 --workflow tff:ship --json",
	],
};

export const routingDecideCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, routingDecideSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}
	const {
		"slice-id": sliceId,
		workflow,
		_json: json,
	} = parsed.data as {
		"slice-id": string;
		workflow: string;
		_json?: boolean;
	};

	const projectRoot = process.cwd();
	const configReader = new YamlRoutingConfigReader({ projectRoot });
	const configRes = await configReader.readConfig();
	if (!isOk(configRes)) {
		process.stderr.write(`routing: config error — ${JSON.stringify(configRes.error)}\n`);
		return JSON.stringify({ ok: false, error: configRes.error });
	}
	if (!configRes.data.enabled) {
		process.stderr.write("routing: disabled; skipping decide\n");
		return JSON.stringify({ ok: true, data: { skipped: true, reason: "routing_disabled" } });
	}

	const extractor = new FilesystemSignalExtractor();
	const tierConfigReader = new FilesystemTierConfigReader({
		projectRoot,
		agentsDir: join(projectRoot, "agents"),
	});
	const logger = new JsonlRoutingDecisionLogger(configRes.data.logging.path);

	const res = await decideUseCase(
		{
			workflow_id: workflow,
			slice_id: sliceId,
			extract_input: {
				slice_id: sliceId,
				description: `slice ${sliceId}`,
				affected_files: [],
			},
		},
		{ configReader, tierConfigReader, extractor, logger },
	);

	if (!isOk(res)) {
		process.stderr.write(`routing: decide error — ${JSON.stringify(res.error)}\n`);
		return JSON.stringify({ ok: false, error: res.error });
	}
	if (json) {
		return JSON.stringify({ ok: true, data: res.data });
	}
	return res.data.decisions.map((d) => `${d.agent}  ${d.tier}`).join("\n");
};
