import { randomUUID } from "node:crypto";
import {
	type KnownDecision,
	recordOutcomeUseCase,
} from "../../application/routing/record-outcome.js";
import { isOk } from "../../domain/result.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { JsonlRoutingDecisionReader } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-reader.js";
import { JsonlRoutingOutcomeWriter } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-writer.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveRoutingPaths } from "../utils/routing-paths.js";

export type { KnownDecision };

export const routingOutcomeSchema: CommandSchema = {
	name: "routing:outcome",
	purpose: "Record a manual outcome for a routing decision (Phase D feedback loop)",
	requiredFlags: [
		{
			name: "decision",
			type: "string",
			description: "Decision UUID",
			pattern: "^[0-9a-fA-F-]{36}$",
		},
		{
			name: "dimension",
			type: "string",
			description: "Outcome dimension",
			enum: ["agent", "tier", "unknown"],
		},
		{
			name: "verdict",
			type: "string",
			description: "Outcome verdict",
			enum: ["ok", "wrong", "too-low", "too-high"],
		},
	],
	optionalFlags: [
		{ name: "reason", type: "string", description: "Free-form reason (<= 500 chars)" },
	],
	examples: [
		'routing:outcome --decision <uuid> --dimension tier --verdict too-low --reason "needed opus"',
	],
};

export const routingOutcomeCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, routingOutcomeSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const { decision, dimension, verdict, reason } = parsed.data as {
		decision: string;
		dimension: "agent" | "tier" | "unknown";
		verdict: "ok" | "wrong" | "too-low" | "too-high";
		reason?: string;
	};

	const projectRoot = process.cwd();
	const configReader = new YamlRoutingConfigReader({ projectRoot });
	const configRes = await configReader.readConfig();
	if (!isOk(configRes)) return JSON.stringify({ ok: false, error: configRes.error });

	const { routingPath, outcomesPath } = resolveRoutingPaths(
		projectRoot,
		configRes.data.logging.path,
	);

	const decisionReader = new JsonlRoutingDecisionReader(routingPath);
	const knownDecisions = await decisionReader.readKnownDecisions();
	const writer = new JsonlRoutingOutcomeWriter(outcomesPath);

	const res = await recordOutcomeUseCase(
		{ decision_id: decision, dimension, verdict, reason },
		{
			writer,
			knownDecisions,
			uuid: () => randomUUID(),
			now: () => new Date().toISOString(),
		},
	);
	if (!isOk(res)) return JSON.stringify({ ok: false, error: res.error });
	return JSON.stringify({ ok: true, data: res.data });
};
