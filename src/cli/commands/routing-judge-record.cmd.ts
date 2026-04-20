import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { recordJudgedOutcomesUseCase } from "../../application/routing/record-judged-outcomes.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import { isOk } from "../../domain/result.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { JsonlRoutingDecisionReader } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-reader.js";
import { JsonlRoutingOutcomeReader } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-reader.js";
import { JsonlRoutingOutcomeWriter } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-writer.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";
import { resolveRoutingPaths } from "../utils/routing-paths.js";

export const routingJudgeRecordSchema: CommandSchema = {
	name: "routing:judge-record",
	purpose: "Persist JudgeVerdicts emitted by the tff-outcome-judge agent as model-judge outcomes",
	requiredFlags: [{ name: "slice", type: "string", description: "Slice label (M##-S##) or UUID" }],
	optionalFlags: [
		{
			name: "verdicts-path",
			type: "string",
			description: "Path to a JSON file containing { verdicts: [...] }",
		},
		{
			name: "verdicts-json",
			type: "string",
			description: "Inline JSON string (alternative to --verdicts-path)",
		},
		{
			name: "evidence-truncated",
			type: "boolean",
			description: "Prefix reasons with [evidence_truncated]",
		},
	],
	examples: ["routing:judge-record --slice M01-S02 --verdicts-path /tmp/verdicts.json"],
};

export interface RoutingJudgeRecordFactoryOverrides {
	sliceStatusLookup?: (sliceId: string) => Promise<string>;
	sliceLabelLookup?: (sliceId: string) => Promise<string>;
}

export const routingJudgeRecordCmd = async (
	args: string[],
	overrides: RoutingJudgeRecordFactoryOverrides = {},
): Promise<string> => {
	const parsed = parseFlags(args, routingJudgeRecordSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const flags = parsed.data as {
		slice: string;
		"verdicts-path"?: string;
		"verdicts-json"?: string;
		"evidence-truncated"?: boolean;
	};

	const projectRoot = process.cwd();

	const configReader = new YamlRoutingConfigReader({ projectRoot });
	const configRes = await configReader.readConfig();
	if (!isOk(configRes)) return JSON.stringify({ ok: false, error: configRes.error });
	if (!configRes.data.enabled) {
		return JSON.stringify({ ok: true, data: { skipped: true, reason: "routing_disabled" } });
	}

	const modelJudgeCfg = configRes.data.calibration?.model_judge;
	const modelJudgeEnabled = modelJudgeCfg?.enabled ?? false;
	if (!modelJudgeEnabled) {
		return JSON.stringify({
			ok: false,
			error: preconditionViolationError([
				{
					code: "settings.routing.calibration.model_judge.enabled",
					expected: "true",
					actual: "false",
				},
			]),
		});
	}

	// Resolve verdicts: prefer --verdicts-path, fall back to --verdicts-json
	let verdicts: unknown;
	if (flags["verdicts-path"]) {
		let raw: string;
		try {
			raw = readFileSync(flags["verdicts-path"], "utf8");
		} catch (err) {
			return JSON.stringify({
				ok: false,
				error: preconditionViolationError([
					{
						code: "verdicts-path.readable",
						expected: "readable file",
						actual: String(err),
					},
				]),
			});
		}
		try {
			verdicts = JSON.parse(raw);
		} catch {
			return JSON.stringify({
				ok: false,
				error: preconditionViolationError([
					{
						code: "verdicts-path.json",
						expected: "valid JSON",
						actual: "parse error",
					},
				]),
			});
		}
	} else if (flags["verdicts-json"]) {
		try {
			verdicts = JSON.parse(flags["verdicts-json"]);
		} catch {
			return JSON.stringify({
				ok: false,
				error: preconditionViolationError([
					{
						code: "verdicts-json.json",
						expected: "valid JSON",
						actual: "parse error",
					},
				]),
			});
		}
	} else {
		return JSON.stringify({
			ok: false,
			error: preconditionViolationError([
				{
					code: "verdicts.source",
					expected: "--verdicts-path or --verdicts-json",
					actual: "neither provided",
				},
			]),
		});
	}

	const { routingPath, outcomesPath } = resolveRoutingPaths(
		projectRoot,
		configRes.data.logging.path,
	);

	let sliceId: string;
	let sliceLabel: string;
	let sliceStatus: string;

	if (overrides.sliceLabelLookup && overrides.sliceStatusLookup) {
		sliceId = flags.slice;
		sliceLabel = await overrides.sliceLabelLookup(sliceId);
		sliceStatus = await overrides.sliceStatusLookup(sliceId);
	} else {
		const { sliceStore, milestoneStore } = createClosableStateStoresUnchecked();
		const resolvedRes = resolveSliceId(flags.slice, sliceStore);
		if (!resolvedRes.ok) return JSON.stringify({ ok: false, error: resolvedRes.error });
		sliceId = resolvedRes.data;
		const sliceEntity = sliceStore.getSlice(sliceId);
		if (!sliceEntity.ok || !sliceEntity.data) {
			return JSON.stringify({
				ok: false,
				error: preconditionViolationError([
					{ code: "slice.exists", expected: "known slice", actual: "not found" },
				]),
			});
		}
		const milestoneRes = milestoneStore.getMilestone(sliceEntity.data.milestoneId);
		if (!milestoneRes.ok || !milestoneRes.data) {
			return JSON.stringify({
				ok: false,
				error: preconditionViolationError([
					{ code: "milestone.exists", expected: "parent milestone", actual: "not found" },
				]),
			});
		}
		sliceLabel = `M${String(milestoneRes.data.number).padStart(2, "0")}-S${String(sliceEntity.data.number).padStart(2, "0")}`;
		sliceStatus = sliceEntity.data.status;
	}

	const decisionReader = new JsonlRoutingDecisionReader(routingPath);
	const knownDecisions = await decisionReader.readKnownDecisions();
	const sliceDecisions = knownDecisions
		.filter((k) => k.slice_id === sliceLabel)
		.map((k) => ({
			decision_id: k.decision_id,
			slice_id: k.slice_id,
			workflow_id: k.workflow_id,
		}));

	const outcomesSource = new JsonlRoutingOutcomeReader(outcomesPath);
	const writer = new JsonlRoutingOutcomeWriter(outcomesPath);

	const res = await recordJudgedOutcomesUseCase(
		{
			slice_id: sliceId,
			verdicts,
			evidence_truncated: flags["evidence-truncated"] ?? false,
		},
		{
			sliceStatus,
			decisions: sliceDecisions,
			outcomesSource,
			writer,
			modelJudgeEnabled,
			uuid: () => randomUUID(),
			now: () => new Date().toISOString(),
		},
	);
	if (!isOk(res)) return JSON.stringify({ ok: false, error: res.error });
	return JSON.stringify({
		ok: true,
		data: { ...res.data, slice_label: sliceLabel },
	});
};
