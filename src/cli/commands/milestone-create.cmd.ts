import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { milestoneLabel } from "../../domain/helpers/branch-naming.js";
import { isOk } from "../../domain/result.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { cleanupTmps, withTransaction } from "../../infrastructure/persistence/with-transaction.js";
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
	const { db, milestoneStore } = closableStores;
	const gitOps = new GitCliAdapter(cwd);

	// Track tmps staged before the tx so we can clean up on body throw.
	const stagedTmps: string[] = [];

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

		mkdirSync(slicesDirAbs, { recursive: true });
		writeFileSync(reqTmpAbs, reqContent, "utf8");
		stagedTmps.push(reqTmpAbs);

		// Run DB insert + staged rename inside withTransaction.
		const txResult = await withTransaction(db, () => {
			const milestoneResult = milestoneStore.createMilestone({ number, name });
			if (!milestoneResult.ok) {
				throw new Error(`${milestoneResult.error.code}: ${milestoneResult.error.message}`);
			}
			return {
				data: { milestone: milestoneResult.data },
				tmpRenames: [[reqTmpAbs, reqFinalAbs] as [string, string]],
			};
		});

		if (!txResult.ok) {
			cleanupTmps(stagedTmps);
			return JSON.stringify({ ok: false, error: txResult.error });
		}

		const milestone = txResult.data.milestone;
		const branchName = milestone.branch;

		// Create git branch outside the tx — git is a non-rollbackable external
		// effect. If this fails the DB+FS state is already committed; surface
		// the error but keep the commit durable (the user can re-run and the
		// branch creation is idempotent / diagnosable).
		try {
			await gitOps.createBranch(branchName, "main");
		} catch (e) {
			tffWarn(`git branch creation failed: ${String(e)}`);
			return JSON.stringify({
				ok: false,
				error: {
					code: "WRITE_FAILURE",
					message: `Milestone persisted but git branch creation failed: ${String(e)}`,
				},
			});
		}

		// Best-effort WAL checkpoint.
		const warnings = [...txResult.warnings];
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
