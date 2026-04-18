import { extractSignalsUseCase } from "../../application/routing/extract-signals.js";
import { isOk } from "../../domain/result.js";
import { AnthropicLlmEnricher } from "../../infrastructure/adapters/anthropic/anthropic-llm-enricher.js";
import { FilesystemSignalExtractor } from "../../infrastructure/adapters/filesystem/filesystem-signal-extractor.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { JsonlRoutingDecisionLogger } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-logger.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const routingExtractSchema: CommandSchema = {
	name: "routing:extract",
	purpose: "Extract routing signals for a slice (advisory; no-ops when routing disabled)",
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
		"routing:extract --slice-id M01-S01 --workflow tff:ship",
		"routing:extract --slice-id M01-S01 --workflow tff:ship --json",
	],
};

// Stub client; a real Anthropic-SDK-backed client is a follow-up task.
const makeClient = () => ({
	complete: async () => {
		throw new Error("anthropic client not configured");
	},
});

export const routingExtractCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, routingExtractSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}
	const {
		"slice-id": sliceId,
		workflow,
		json,
	} = parsed.data as {
		"slice-id": string;
		workflow: string;
		json?: boolean;
	};

	const projectRoot = process.cwd();
	const configReader = new YamlRoutingConfigReader({ projectRoot });
	const configRes = await configReader.readConfig();
	if (!isOk(configRes)) {
		process.stderr.write(`routing: config error — ${JSON.stringify(configRes.error)}\n`);
		return JSON.stringify({ ok: false, error: configRes.error });
	}
	const config = configRes.data;

	// Gating rule: CLI self-gates; markdown has no conditional.
	if (!config.enabled) {
		process.stderr.write("routing: disabled; skipping extraction\n");
		return JSON.stringify({ ok: true, data: { skipped: true } });
	}

	const extractor = new FilesystemSignalExtractor();
	const enricher = new AnthropicLlmEnricher({
		client: makeClient(),
		model: config.llm_enrichment.model,
		timeout_ms: config.llm_enrichment.timeout_ms,
	});
	const logger = new JsonlRoutingDecisionLogger(config.logging.path);

	// Minimal slice info: a follow-up will integrate slice-store + git-ops ports
	// to populate spec_path and affected_files. For Phase A the description is
	// enough to produce a signal record in the log.
	const input = {
		slice_id: sliceId,
		description: `slice ${sliceId}`,
		affected_files: [] as string[],
	};

	const res = await extractSignalsUseCase(
		{ workflow_id: workflow, input },
		{ extractor, enricher, configReader, logger },
	);
	if (!isOk(res)) {
		process.stderr.write(`routing: extraction error — ${JSON.stringify(res.error)}\n`);
		return JSON.stringify({ ok: false, error: res.error });
	}
	if (json) {
		return JSON.stringify({ ok: true, data: res.data });
	}
	return `routing: signals=${JSON.stringify(res.data.signals)} enriched=${res.data.enriched}`;
};
