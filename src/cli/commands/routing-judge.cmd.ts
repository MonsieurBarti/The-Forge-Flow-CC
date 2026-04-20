import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { judgeOutcomesUseCase } from "../../application/routing/judge-outcomes.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import type { DiffReader } from "../../domain/ports/diff-reader.port.js";
import type { OutcomeJudge } from "../../domain/ports/outcome-judge.port.js";
import type { SliceMergeLookup } from "../../domain/ports/slice-merge-lookup.port.js";
import { isOk, Ok } from "../../domain/result.js";
import { HaikuOutcomeJudge } from "../../infrastructure/adapters/anthropic/haiku-outcome-judge.js";
import { SliceSpecFsReader } from "../../infrastructure/adapters/filesystem/slice-spec-fs-reader.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { GitDiffReader } from "../../infrastructure/adapters/git/git-diff-reader.js";
import { GitSliceMergeLookup } from "../../infrastructure/adapters/git/git-slice-merge-lookup.js";
import { JsonlRoutingDecisionReader } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-reader.js";
import { JsonlRoutingOutcomeReader } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-reader.js";
import { JsonlRoutingOutcomeWriter } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-writer.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";
import { resolveRoutingPaths } from "../utils/routing-paths.js";

const STUB_DIFF_READER: DiffReader = {
	readMergeDiff: async () =>
		Ok({ files_changed: 0, insertions: 0, deletions: 0, patch: "", truncated: false }),
};

const execFileP = promisify(execFile);

const runGit = async (cmd: string, args: string[], opts: { cwd: string }): Promise<string> => {
	const { stdout } = await execFileP(cmd, args, { cwd: opts.cwd, maxBuffer: 16 * 1024 * 1024 });
	return stdout;
};

export const routingJudgeSchema: CommandSchema = {
	name: "routing:judge",
	purpose: "Grade routing decisions on a closed slice via the model-judge outcome source",
	requiredFlags: [{ name: "slice", type: "string", description: "Slice label (M##-S##) or UUID" }],
	optionalFlags: [
		{ name: "model", type: "string", description: "Override model_judge.model" },
		{ name: "temperature", type: "number", description: "Override model_judge.temperature" },
		{
			name: "max-patch-bytes",
			type: "number",
			description: "Override model_judge.max_patch_bytes",
		},
	],
	examples: ["routing:judge --slice M01-S02"],
};

export interface RoutingJudgeFactoryOverrides {
	judgeFactory?: (opts: { model: string; temperature: number; timeout_ms: number }) => OutcomeJudge;
	mergeLookupFactory?: (opts: { cwd: string; defaultBranch: string }) => SliceMergeLookup;
	sliceStatusLookup?: (sliceId: string) => Promise<string>;
	sliceLabelLookup?: (sliceId: string) => Promise<string>;
}

export const routingJudgeCmd = async (
	args: string[],
	overrides: RoutingJudgeFactoryOverrides = {},
): Promise<string> => {
	const parsed = parseFlags(args, routingJudgeSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const flags = parsed.data as {
		slice: string;
		model?: string;
		temperature?: number;
		"max-patch-bytes"?: number;
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

	if (!process.env.ANTHROPIC_API_KEY && !overrides.judgeFactory) {
		return JSON.stringify({
			ok: false,
			error: preconditionViolationError([
				{ code: "env.ANTHROPIC_API_KEY", expected: "present", actual: "missing" },
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
		// Test path: CLI wiring is being exercised without a real SQLite store.
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
			agent: k.agent ?? "unknown",
			tier: "sonnet" as const,
			slice_id: k.slice_id,
			workflow_id: k.workflow_id,
			signals: k.signals,
			fallback_used: k.fallback_used ?? false,
			confidence: k.confidence ?? 0,
		}));
	const debugEvents = (await decisionReader.readDebugEvents()).filter(
		(e) => e.slice_id === sliceLabel,
	);

	const outcomesSource = new JsonlRoutingOutcomeReader(outcomesPath);
	const writer = new JsonlRoutingOutcomeWriter(outcomesPath);

	const model = flags.model ?? modelJudgeCfg?.model ?? "claude-haiku-4-5-20251001";
	const temperature = flags.temperature ?? modelJudgeCfg?.temperature ?? 0;
	const maxPatchBytes = flags["max-patch-bytes"] ?? modelJudgeCfg?.max_patch_bytes ?? 32768;
	const maxSpecBytes = modelJudgeCfg?.max_spec_bytes ?? 16384;
	const timeoutMs = modelJudgeCfg?.timeout_ms ?? 30000;

	const judge: OutcomeJudge = overrides.judgeFactory
		? overrides.judgeFactory({ model, temperature, timeout_ms: timeoutMs })
		: new HaikuOutcomeJudge({
				client: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) as never,
				model,
				temperature,
				timeout_ms: timeoutMs,
			});

	const mergeLookup: SliceMergeLookup = overrides.mergeLookupFactory
		? overrides.mergeLookupFactory({ cwd: projectRoot, defaultBranch: "main" })
		: new GitSliceMergeLookup({ run: runGit, cwd: projectRoot, defaultBranch: "main" });
	const diffReader: DiffReader = overrides.mergeLookupFactory
		? STUB_DIFF_READER
		: new GitDiffReader({ run: runGit, cwd: projectRoot });
	const specReader = new SliceSpecFsReader({ projectRoot });

	const res = await judgeOutcomesUseCase(
		{ slice_id: sliceId },
		{
			sliceStatus,
			sliceLabel,
			decisions: sliceDecisions,
			debugEvents,
			outcomesSource,
			writer,
			judge,
			mergeLookup,
			diffReader,
			specReader,
			maxPatchBytes,
			maxSpecBytes,
			modelJudgeEnabled,
			uuid: () => randomUUID(),
			now: () => new Date().toISOString(),
		},
	);
	if (!isOk(res)) return JSON.stringify({ ok: false, error: res.error });
	return JSON.stringify({
		ok: true,
		data: { ...res.data, slice_label: sliceLabel, model },
	});
};
