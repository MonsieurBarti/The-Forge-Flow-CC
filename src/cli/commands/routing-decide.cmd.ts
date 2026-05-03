import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { decideUseCase } from "../../application/routing/decide.js";
import type { ExtractInput } from "../../domain/ports/signal-extractor.port.js";
import { isOk } from "../../domain/result.js";
import { FilesystemSignalExtractor } from "../../infrastructure/adapters/filesystem/filesystem-signal-extractor.js";
import { FilesystemTierConfigReader } from "../../infrastructure/adapters/filesystem/filesystem-tier-config-reader.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { JsonlRoutingDecisionLogger } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-logger.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { resolvePluginRoot } from "../../infrastructure/plugin-root.js";
import { buildRoutingExtractInput } from "../utils/build-routing-extract-input.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

const execFileP = promisify(execFile);

const runGit = async (cmd: string, args: string[], opts: { cwd: string }): Promise<string> => {
	const { stdout } = await execFileP(cmd, args, { cwd: opts.cwd, maxBuffer: 16 * 1024 * 1024 });
	return stdout;
};

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
	const pluginRoot = resolvePluginRoot();
	const configReader = new YamlRoutingConfigReader({ projectRoot, pluginRoot });
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
		pluginRoot,
	});
	const logger = new JsonlRoutingDecisionLogger(configRes.data.logging.path);

	const stores = createClosableStateStoresUnchecked();
	let extractInput: ExtractInput;
	try {
		extractInput = await buildRoutingExtractInput(sliceId, {
			sliceStore: stores.sliceStore,
			milestoneStore: stores.milestoneStore,
			runGit,
			projectRoot,
		});
	} finally {
		stores.close();
	}

	const res = await decideUseCase(
		{
			workflow_id: workflow,
			slice_id: sliceId,
			extract_input: extractInput,
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
