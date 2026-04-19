import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderStateMd } from "../../application/sync/generate-state.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { partialSuccessWarning } from "../../domain/errors/partial-success.warning.js";
import { milestoneLabel } from "../../domain/helpers/branch-naming.js";
import { isOk } from "../../domain/result.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { stageStateMdTmp } from "../../infrastructure/persistence/stage-state-md.js";
import { mkdirTracked } from "../../infrastructure/persistence/track-mkdir.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { milestoneDir as milestoneDirPath } from "../../shared/paths.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const milestoneCreateSchema: CommandSchema = {
	name: "milestone:create",
	purpose: "Create a new milestone",
	requiredFlags: [
		{
			name: "name",
			type: "string",
			description: "Milestone name",
		},
	],
	optionalFlags: [],
	examples: ['milestone:create --name "Phase 1: Core Features"'],
};

export const milestoneCreateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, milestoneCreateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { name } = parsed.data as { name: string };

	const cwd = process.cwd();
	const closableStores = createClosableStateStoresUnchecked();
	const { db, milestoneStore, sliceStore, taskStore } = closableStores;
	const gitOps = new GitCliAdapter(cwd);

	// Track tmps staged before the tx so we can clean up on body throw.
	const stagedTmps: string[] = [];
	// Track dirs we just created (leaf-first) so we can rmSync them on rollback.
	const stagedDirs: string[] = [];

	try {
		// Auto-number: count existing milestones and increment.
		const milestonesResult = milestoneStore.listMilestones();
		if (!isOk(milestonesResult)) {
			return JSON.stringify({ ok: false, error: milestonesResult.error });
		}
		const number = milestonesResult.data.length + 1;

		// Pre-stage REQUIREMENTS.md to *.tmp under the final milestone dir.
		const label = milestoneLabel(number);
		const dir = milestoneDirPath(label);
		const slicesDirAbs = resolve(cwd, `${dir}/slices`);
		const reqFinalAbs = resolve(cwd, `${dir}/REQUIREMENTS.md`);
		const reqTmpAbs = `${reqFinalAbs}.tmp`;
		const reqContent = `# Requirements — ${name}\n\n_Define your requirements here._\n`;

		stagedDirs.push(...mkdirTracked(slicesDirAbs));
		writeFileSync(reqTmpAbs, reqContent, "utf8");
		stagedTmps.push(reqTmpAbs);

		// STATE.md staging: rendered INSIDE the tx body (after createMilestone
		// returns) so the rendered view reflects the newly-inserted milestone
		// via the tx scope. Staged atomically with REQUIREMENTS.md — on body
		// throw, withTransaction unlinks both tmps. Upholds AC7 DB<->STATE.md
		// consistency at the writer's exit boundary.
		const { stateFinalAbs, stateTmpAbs } = stageStateMdTmp(cwd, stagedTmps, stagedDirs);

		// Run DB insert + staged rename inside withTransaction.
		// Pass stagedTmps so the helper can auto-clean on rollback.
		const txResult = await withTransaction(
			db,
			() => {
				const milestoneResult = milestoneStore.createMilestone({ number, name });
				if (!milestoneResult.ok) {
					throw new Error(`${milestoneResult.error.code}: ${milestoneResult.error.message}`);
				}
				// Render STATE.md from within the tx: the just-inserted milestone
				// is visible to listMilestones / getMilestone here.
				const stateContent = renderStateMd(
					{ milestoneId: milestoneResult.data.id },
					{ milestoneStore, sliceStore, taskStore },
				);
				if (!stateContent.ok) {
					throw new Error(`${stateContent.error.code}: ${stateContent.error.message}`);
				}
				writeFileSync(stateTmpAbs, stateContent.data, "utf8");
				return {
					data: { milestone: milestoneResult.data },
					tmpRenames: [
						[reqTmpAbs, reqFinalAbs] as [string, string],
						[stateTmpAbs, stateFinalAbs] as [string, string],
					],
				};
			},
			stagedTmps,
			stagedDirs,
		);

		if (!txResult.ok) {
			// withTransaction already unlinked stagedTmps.
			return JSON.stringify({ ok: false, error: txResult.error });
		}

		const milestone = txResult.data.milestone;
		const branchName = milestone.branch;

		// Collect warnings from the tx and from any best-effort post-commit hooks.
		const warnings: DomainError[] = [...txResult.warnings];

		// Create git branch outside the tx — git is a non-rollbackable external
		// effect. If this fails, the DB+FS state is already committed; per AC6
		// we surface a PartialSuccessWarning naming the pending effect rather
		// than returning ok:false (the command succeeded; the branch creation
		// is retryable / idempotent).
		try {
			await gitOps.createBranch(branchName, "main");
		} catch (e) {
			const msg = `git branch creation failed: ${String(e)}`;
			tffWarn(msg);
			warnings.push(partialSuccessWarning(msg, `git-branch:${branchName}`));
		}

		// Best-effort WAL checkpoint.
		try {
			closableStores.checkpoint();
		} catch (e) {
			tffWarn(`checkpoint failed: ${String(e)}`);
		}

		return JSON.stringify({
			ok: true,
			data: { milestone, branchName },
			warnings,
		});
	} finally {
		closableStores.close();
	}
};
