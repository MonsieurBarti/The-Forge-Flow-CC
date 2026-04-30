import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveMilestoneId } from "../../application/milestone/resolve-milestone-id.js";
import { buildMilestoneScorecard } from "../../application/routing/build-milestone-scorecard.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../domain/errors/precondition-violation.error.js";
import { isOk } from "../../domain/result.js";
import { checkMilestoneActive } from "../../domain/state-machine/preconditions.js";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { JsonlRoutingOutcomeReader } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-reader.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { resolvePluginRoot } from "../../infrastructure/plugin-root.js";
import { milestoneDir } from "../../shared/paths.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveRoutingPaths } from "../utils/routing-paths.js";

export const milestoneCloseSchema: CommandSchema = {
	name: "milestone:close",
	purpose: "Close a milestone",
	mutates: true,
	requiredFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Milestone UUID or M-label (e.g., M01) to close",
		},
	],
	optionalFlags: [
		{
			name: "reason",
			type: "string",
			description: "Reason for closing",
		},
	],
	examples: [
		"milestone:close --milestone-id M01",
		"milestone:close --milestone-id <uuid>",
		'milestone:close --milestone-id M01 --reason "Completed"',
	],
};

export const milestoneCloseCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, milestoneCloseSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "milestone-id": rawMilestoneId, reason } = parsed.data as {
		"milestone-id": string;
		reason?: string;
	};

	const projectRoot = process.cwd();
	const closableStores = createClosableStateStoresUnchecked();
	const { db, milestoneStore, pendingJudgmentStore, sliceStore } = closableStores;

	try {
		const resolved = resolveMilestoneId(milestoneStore, rawMilestoneId);
		if (!isOk(resolved)) {
			return JSON.stringify({ ok: false, error: resolved.error });
		}

		// Precondition: milestone must not already be closed.
		const precheck = checkMilestoneActive(milestoneStore, resolved.data);
		if (!precheck.ok) {
			return JSON.stringify({
				ok: false,
				error: preconditionViolationError(precheck.violations),
			});
		}

		// Precondition: every closed slice in this milestone must have a recorded
		// routing judgment (pending_judgments empty for the milestone). Routing
		// decisions are graded post-merge per slice, and an unjudged slice means
		// the merge-to-main aggregate would be incomplete. Drain via /tff:judge
		// or judge:pending:clear before closing.
		const pendingRes = pendingJudgmentStore.listPendingForMilestone(resolved.data);
		if (!pendingRes.ok) return JSON.stringify({ ok: false, error: pendingRes.error });
		if (pendingRes.data.length > 0) {
			const labels = pendingRes.data.map((p) => {
				const s = sliceStore.getSlice(p.sliceId);
				if (!s.ok || !s.data) return p.sliceId;
				if (!s.data.milestoneId) return p.sliceId;
				const milestone = milestoneStore.getMilestone(s.data.milestoneId);
				if (!milestone.ok || !milestone.data) return p.sliceId;
				return `M${String(milestone.data.number).padStart(2, "0")}-S${String(s.data.number).padStart(2, "0")}`;
			});
			return JSON.stringify({
				ok: false,
				error: {
					code: "PENDING_JUDGMENTS",
					message: `Milestone has ${pendingRes.data.length} slice(s) with pending routing judgments: ${labels.join(", ")}. Drain via /tff:judge before closing.`,
					context: { slices: labels },
				},
			});
		}

		let businessError: DomainError | null = null;
		const txResult = await withTransaction(db, () => {
			const r = milestoneStore.closeMilestone(resolved.data, reason);
			if (!r.ok) businessError = r.error;
			return { data: null, tmpRenames: [] };
		});
		if (!txResult.ok) return JSON.stringify({ ok: false, error: txResult.error });
		if (businessError) return JSON.stringify({ ok: false, error: businessError });

		// Write a milestone-level routing scorecard aggregating per-slice
		// model-judge verdicts. Best-effort: a write failure does not undo
		// the close.
		let scorecardWritten: string | null = null;
		try {
			const milestone = milestoneStore.getMilestone(resolved.data);
			if (milestone.ok && milestone.data) {
				const milestoneLabel = `M${String(milestone.data.number).padStart(2, "0")}`;
				const slices = sliceStore.listSlices(resolved.data);
				const sliceLabels = slices.ok
					? slices.data.map((s) => `${milestoneLabel}-S${String(s.number).padStart(2, "0")}`)
					: [];

				const configReader = new YamlRoutingConfigReader({
					projectRoot,
					pluginRoot: resolvePluginRoot(),
				});
				const configRes = await configReader.readConfig();
				if (configRes.ok && configRes.data.enabled) {
					const { outcomesPath } = resolveRoutingPaths(projectRoot, configRes.data.logging.path);
					const outcomeSource = new JsonlRoutingOutcomeReader(outcomesPath);
					const scorecard = await buildMilestoneScorecard({
						milestoneId: resolved.data,
						milestoneLabel,
						sliceLabels,
						outcomeSource,
						now: () => new Date().toISOString(),
					});
					const targetDir = join(projectRoot, milestoneDir(milestoneLabel));
					mkdirSync(targetDir, { recursive: true });
					const targetPath = join(targetDir, "routing-scorecard.json");
					writeFileSync(targetPath, `${JSON.stringify(scorecard, null, 2)}\n`, "utf8");
					scorecardWritten = targetPath;
				}
			}
		} catch {
			// Best-effort: do not block close on scorecard write.
		}

		return JSON.stringify({
			ok: true,
			data: { status: "closed", reason, scorecard_path: scorecardWritten },
		});
	} finally {
		closableStores.close();
	}
};
