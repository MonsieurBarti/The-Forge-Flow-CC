import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prepareJudgeEvidenceUseCase } from "../../application/routing/prepare-judge-evidence.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import { sliceLabelFor } from "../../domain/helpers/branch-naming.js";
import { resolveBaseBranch } from "../../domain/helpers/slice-resolvers.js";
import type { DiffReader } from "../../domain/ports/diff-reader.port.js";
import type { SliceMergeLookup } from "../../domain/ports/slice-merge-lookup.port.js";
import type { SliceSpecReader } from "../../domain/ports/slice-spec-reader.port.js";
import { isOk } from "../../domain/result.js";
import { SliceSpecFsReader } from "../../infrastructure/adapters/filesystem/slice-spec-fs-reader.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { GitDiffReader } from "../../infrastructure/adapters/git/git-diff-reader.js";
import { GitSliceMergeLookup } from "../../infrastructure/adapters/git/git-slice-merge-lookup.js";
import { JsonlRoutingDecisionReader } from "../../infrastructure/adapters/jsonl/jsonl-routing-decision-reader.js";
import { JsonlRoutingOutcomeReader } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-reader.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { resolvePluginRoot } from "../../infrastructure/plugin-root.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveSliceId } from "../utils/resolve-id.js";
import { resolveRoutingPaths } from "../utils/routing-paths.js";

const execFileP = promisify(execFile);

const runGit = async (cmd: string, args: string[], opts: { cwd: string }): Promise<string> => {
	const { stdout } = await execFileP(cmd, args, { cwd: opts.cwd, maxBuffer: 16 * 1024 * 1024 });
	return stdout;
};

export const routingJudgePrepareSchema: CommandSchema = {
	name: "routing:judge-prepare",
	purpose: "Fetch JudgeEvidence for a closed slice — feeds the tff-outcome-judge agent",
	mutates: false,
	requiredFlags: [{ name: "slice", type: "string", description: "Slice label (M##-S##) or UUID" }],
	optionalFlags: [
		{
			name: "max-patch-bytes",
			type: "number",
			description: "Override model_judge.max_patch_bytes",
		},
	],
	examples: ["routing:judge-prepare --slice M01-S02"],
};

export interface RoutingJudgePrepareFactoryOverrides {
	mergeLookupFactory?: (opts: { cwd: string }) => SliceMergeLookup;
	diffReaderFactory?: (opts: { cwd: string }) => DiffReader;
	specReaderFactory?: (opts: { projectRoot: string }) => SliceSpecReader;
	sliceStatusLookup?: (sliceId: string) => Promise<string>;
	sliceLabelLookup?: (sliceId: string) => Promise<string>;
	sliceContextLookup?: (sliceId: string) => Promise<{
		mergeBranches: string[];
		pendingMergeSha?: string;
	}>;
}

export const routingJudgePrepareCmd = async (
	args: string[],
	overrides: RoutingJudgePrepareFactoryOverrides = {},
): Promise<string> => {
	const parsed = parseFlags(args, routingJudgePrepareSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const flags = parsed.data as {
		slice: string;
		"max-patch-bytes"?: number;
	};

	const projectRoot = process.cwd();
	const pluginRoot = resolvePluginRoot();

	const configReader = new YamlRoutingConfigReader({ projectRoot, pluginRoot });
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

	const { routingPath, outcomesPath } = resolveRoutingPaths(
		projectRoot,
		configRes.data.logging.path,
	);

	let sliceId: string;
	let sliceLabel: string;
	let sliceStatus: string;
	let mergeBranches: string[] = ["main"];
	let pendingMergeSha: string | undefined;

	if (overrides.sliceLabelLookup && overrides.sliceStatusLookup) {
		sliceId = flags.slice;
		sliceLabel = await overrides.sliceLabelLookup(sliceId);
		sliceStatus = await overrides.sliceStatusLookup(sliceId);
		if (overrides.sliceContextLookup) {
			const ctx = await overrides.sliceContextLookup(sliceId);
			mergeBranches = ctx.mergeBranches;
			pendingMergeSha = ctx.pendingMergeSha;
		}
	} else {
		const { sliceStore, milestoneStore, pendingJudgmentStore } =
			createClosableStateStoresUnchecked();
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
		let milestone: { id: string; number: number; branch?: string } | undefined;
		if (sliceEntity.data.milestoneId) {
			const milestoneRes = milestoneStore.getMilestone(sliceEntity.data.milestoneId);
			if (!milestoneRes.ok || !milestoneRes.data) {
				return JSON.stringify({
					ok: false,
					error: preconditionViolationError([
						{ code: "milestone.exists", expected: "parent milestone", actual: "not found" },
					]),
				});
			}
			milestone = milestoneRes.data;
		}

		// Resolve merge branches: slice's resolved base branch, plus default branch.
		// TODO: detect default from `git symbolic-ref refs/remotes/origin/HEAD`.
		const defaultBranch = "main";
		let baseBranch: string;
		try {
			baseBranch = resolveBaseBranch(sliceEntity.data, milestone);
		} catch {
			baseBranch = defaultBranch;
		}
		mergeBranches = [...new Set([baseBranch, defaultBranch])];

		sliceLabel = sliceLabelFor(sliceEntity.data, milestone);
		sliceStatus = sliceEntity.data.status;

		const pendingRes = pendingJudgmentStore.getPending(sliceId);
		if (pendingRes.ok && pendingRes.data?.mergeSha) {
			pendingMergeSha = pendingRes.data.mergeSha;
		}
	}

	const decisionReader = new JsonlRoutingDecisionReader(routingPath);
	const knownDecisions = await decisionReader.readKnownDecisions();
	const sliceDecisions = knownDecisions
		.filter((k) => k.slice_id === sliceLabel)
		.map((k) => ({
			decision_id: k.decision_id,
			agent: k.agent ?? "unknown",
			tier: k.tier ?? ("sonnet" as const),
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

	const maxPatchBytes = flags["max-patch-bytes"] ?? modelJudgeCfg?.max_patch_bytes ?? 32768;
	const maxSpecBytes = modelJudgeCfg?.max_spec_bytes ?? 16384;

	const mergeLookup: SliceMergeLookup = overrides.mergeLookupFactory
		? overrides.mergeLookupFactory({ cwd: projectRoot })
		: new GitSliceMergeLookup({ run: runGit, cwd: projectRoot });
	const diffReader: DiffReader = overrides.diffReaderFactory
		? overrides.diffReaderFactory({ cwd: projectRoot })
		: new GitDiffReader({ run: runGit, cwd: projectRoot });
	const specReader: SliceSpecReader = overrides.specReaderFactory
		? overrides.specReaderFactory({ projectRoot })
		: new SliceSpecFsReader({ projectRoot });

	const res = await prepareJudgeEvidenceUseCase(
		{ slice_id: sliceId },
		{
			sliceStatus,
			sliceLabel,
			decisions: sliceDecisions,
			debugEvents,
			outcomesSource,
			mergeLookup,
			mergeBranches,
			pendingMergeSha,
			diffReader,
			specReader,
			maxPatchBytes,
			maxSpecBytes,
			modelJudgeEnabled,
		},
	);
	if (!isOk(res)) return JSON.stringify({ ok: false, error: res.error });
	if (res.data.spec_missing) {
		process.stderr.write(
			`routing:judge-prepare: warning — SPEC.md missing for slice ${sliceLabel}; verdicts may be less reliable.\n`,
		);
	}
	return JSON.stringify({
		ok: true,
		data: { ...res.data, slice_label: sliceLabel },
	});
};
