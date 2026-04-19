import { join } from "node:path";
import { selectTierUseCase } from "../../application/routing/select-tier.js";
import { isOk } from "../../domain/result.js";
import { SignalsSchema } from "../../domain/value-objects/signals.js";
import { FilesystemTierConfigReader } from "../../infrastructure/adapters/filesystem/filesystem-tier-config-reader.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { JsonlRoutingDecisionLogger } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-logger.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const routingSelectTierSchema: CommandSchema = {
	name: "routing:select-tier",
	purpose: "Select a model tier for a slice/agent pair (advisory; no-ops when routing disabled)",
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID",
			pattern: "^M\\d+-S\\d+$",
		},
		{
			name: "agent",
			type: "string",
			description: "Agent identifier (e.g., tff-code-reviewer)",
			pattern: "^[a-z][a-z0-9-]*$",
		},
		{
			name: "signals",
			type: "json",
			description: "Routing signals as JSON (complexity + risk)",
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
		'routing:select-tier --slice-id M01-S01 --agent tff-code-reviewer --signals \'{"complexity":"low","risk":{"level":"low","tags":[]}}\'',
		'routing:select-tier --slice-id M01-S01 --agent tff-code-reviewer --signals \'{"complexity":"high","risk":{"level":"high","tags":["auth"]}}\' --json',
	],
};

export const routingSelectTierCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, routingSelectTierSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}
	const {
		"slice-id": sliceId,
		agent,
		signals: rawSignals,
		_json: json,
	} = parsed.data as {
		"slice-id": string;
		agent: string;
		signals: unknown;
		_json?: boolean;
	};

	// Validate signals shape
	const signalsResult = SignalsSchema.safeParse(rawSignals);
	if (!signalsResult.success) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "INVALID_SIGNALS",
				message: `Invalid signals: ${signalsResult.error.message}`,
			},
		});
	}
	const signals = signalsResult.data;

	const projectRoot = process.cwd();
	const configReader = new YamlRoutingConfigReader({ projectRoot });
	const configRes = await configReader.readConfig();
	if (!isOk(configRes)) {
		process.stderr.write(`routing: config error — ${JSON.stringify(configRes.error)}\n`);
		return JSON.stringify({ ok: false, error: configRes.error });
	}
	const config = configRes.data;

	if (!config.enabled) {
		process.stderr.write("routing: disabled; skipping tier selection\n");
		return JSON.stringify({ ok: true, data: { skipped: true } });
	}

	const tierConfigReader = new FilesystemTierConfigReader({
		projectRoot,
		agentsDir: join(projectRoot, "agents"),
	});
	const logger = new JsonlRoutingDecisionLogger(config.logging.path);

	const res = await selectTierUseCase(
		{
			workflow_id: "tff:ship",
			slice_id: sliceId,
			agent_id: agent,
			signals,
		},
		{ tierConfigReader, logger },
	);

	if (!isOk(res)) {
		process.stderr.write(`routing: tier selection error — ${JSON.stringify(res.error)}\n`);
		return JSON.stringify({ ok: false, error: res.error });
	}

	if (json) {
		return JSON.stringify({ ok: true, data: res.data });
	}
	return res.data.tier;
};
