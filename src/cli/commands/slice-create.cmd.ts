import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveMilestoneId } from "../../application/milestone/resolve-milestone-id.js";
import { milestoneLabel, sliceLabel } from "../../domain/helpers/branch-naming.js";
import { isOk } from "../../domain/result.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { cleanupTmps, withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { sliceDir as sliceDirPath } from "../../shared/paths.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const sliceCreateSchema: CommandSchema = {
	name: "slice:create",
	purpose: "Create a new slice in a milestone",
	requiredFlags: [
		{
			name: "title",
			type: "string",
			description: "Title for the new slice",
		},
	],
	optionalFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Milestone UUID or M-label (e.g., M01) — auto-detected if not provided",
		},
	],
	examples: [
		'slice:create --title "Implement feature X"',
		'slice:create --title "Fix bug Y" --milestone-id M01',
		'slice:create --title "Fix bug Y" --milestone-id <uuid>',
	],
};

export const sliceCreateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceCreateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { title, "milestone-id": explicitMilestoneId } = parsed.data as {
		title: string;
		"milestone-id"?: string;
	};

	const cwd = process.cwd();
	const closableStores = createClosableStateStoresUnchecked();
	const { db, milestoneStore, sliceStore } = closableStores;

	// Track tmps staged before the tx so we can clean up on body throw.
	const stagedTmps: string[] = [];

	try {
		let milestoneId: string;

		if (explicitMilestoneId) {
			const resolved = resolveMilestoneId(milestoneStore, explicitMilestoneId);
			if (!isOk(resolved)) {
				return JSON.stringify({ ok: false, error: resolved.error });
			}
			milestoneId = resolved.data;
		} else {
			// Auto-detect active milestone (most recent open one)
			const milestonesResult = milestoneStore.listMilestones();
			if (!isOk(milestonesResult) || milestonesResult.data.length === 0) {
				return JSON.stringify({
					ok: false,
					error: {
						code: "NOT_FOUND",
						message: "No milestone found. Run /tff:new-milestone first.",
					},
				});
			}
			// Use the last open milestone, or the last one if none are open
			const openMilestones = milestonesResult.data.filter((m) => m.status !== "closed");
			const milestone =
				openMilestones.length > 0
					? openMilestones[openMilestones.length - 1]
					: milestonesResult.data[milestonesResult.data.length - 1];
			milestoneId = milestone.id;
		}

		// Resolve milestone (needed for label and slice numbering).
		const milestoneResult = milestoneStore.getMilestone(milestoneId);
		if (!isOk(milestoneResult)) {
			return JSON.stringify({ ok: false, error: milestoneResult.error });
		}
		if (!milestoneResult.data) {
			return JSON.stringify({
				ok: false,
				error: { code: "NOT_FOUND", message: `Milestone "${milestoneId}" not found` },
			});
		}
		const milestone = milestoneResult.data;

		// Pre-compute slice numbering (outside tx; tx body re-checks via insert).
		const existingSlicesResult = sliceStore.listSlices(milestoneId);
		if (!isOk(existingSlicesResult)) {
			return JSON.stringify({ ok: false, error: existingSlicesResult.error });
		}
		const sliceNumber = existingSlicesResult.data.length + 1;

		// Pre-stage PLAN.md to *.tmp under the final slice dir.
		const msLabel = milestoneLabel(milestone.number);
		const slLabel = sliceLabel(milestone.number, sliceNumber);
		const dir = sliceDirPath(msLabel, slLabel);
		const planContent = `# Plan — ${slLabel}: ${title}\n\n_Plan will be defined during /tff:plan._\n`;

		const dirAbs = resolve(cwd, dir);
		const planFinalAbs = resolve(cwd, `${dir}/PLAN.md`);
		const planTmpAbs = `${planFinalAbs}.tmp`;
		mkdirSync(dirAbs, { recursive: true });
		writeFileSync(planTmpAbs, planContent, "utf8");
		stagedTmps.push(planTmpAbs);

		// Run DB insert + staged rename inside withTransaction.
		const txResult = await withTransaction(db, () => {
			const sliceResult = sliceStore.createSlice({
				milestoneId,
				number: sliceNumber,
				title,
			});
			if (!sliceResult.ok) {
				throw new Error(`${sliceResult.error.code}: ${sliceResult.error.message}`);
			}
			return {
				data: { slice: sliceResult.data },
				tmpRenames: [[planTmpAbs, planFinalAbs] as [string, string]],
			};
		});

		if (!txResult.ok) {
			cleanupTmps(stagedTmps);
			return JSON.stringify({ ok: false, error: txResult.error });
		}

		// Best-effort WAL checkpoint.
		const warnings = [...txResult.warnings];
		try {
			closableStores.checkpoint();
		} catch (e) {
			tffWarn(`checkpoint failed: ${String(e)}`);
		}

		return JSON.stringify({ ok: true, data: { slice: txResult.data.slice }, warnings });
	} finally {
		closableStores.close();
	}
};
