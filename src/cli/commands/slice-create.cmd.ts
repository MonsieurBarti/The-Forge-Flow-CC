import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveMilestoneId } from "../../application/milestone/resolve-milestone-id.js";
import { renderStateMd } from "../../application/sync/generate-state.js";
import type { SliceKind } from "../../domain/entities/slice.js";
import { milestoneLabel, sliceLabelFor } from "../../domain/helpers/branch-naming.js";
import { isOk } from "../../domain/result.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { stageStateMdTmp } from "../../infrastructure/persistence/stage-state-md.js";
import { mkdirTracked } from "../../infrastructure/persistence/track-mkdir.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { sliceDirFor } from "../../shared/paths.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const sliceCreateSchema: CommandSchema = {
	name: "slice:create",
	purpose: "Create a new slice in a milestone, or an ad-hoc quick/debug slice",
	mutates: true,
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
			description: "Milestone UUID or M-label — auto-detected if --kind is milestone (or omitted)",
		},
		{
			name: "kind",
			type: "string",
			description: "Slice kind: milestone (default) | quick | debug",
		},
		{
			name: "base-branch",
			type: "string",
			description: "Base branch the worktree forks from. Required when kind != milestone.",
		},
		{
			name: "branch",
			type: "string",
			description:
				"Explicit branch name for the worktree (e.g. monsieurbarti/tff-42-fix-x). Falls back to UUID-derived slice/<prefix> if omitted.",
		},
	],
	examples: [
		'slice:create --title "Implement feature X"',
		'slice:create --title "Fix bug Y" --milestone-id M01',
		'slice:create --title "Quick fix" --kind quick --base-branch main --branch fix/payload-shape',
		'slice:create --title "Debug routing crash" --kind debug --base-branch feature/x',
	],
};

const VALID_KINDS: ReadonlySet<SliceKind> = new Set(["milestone", "quick", "debug"]);

const branchExistsLocally = (branch: string): boolean => {
	try {
		execSync(`git rev-parse --verify --quiet ${JSON.stringify(branch)}`, {
			encoding: "utf8",
			stdio: "pipe",
		});
		return true;
	} catch {
		return false;
	}
};

const branchNameIsValid = (branch: string): boolean => {
	try {
		execSync(`git check-ref-format --branch ${JSON.stringify(branch)}`, {
			encoding: "utf8",
			stdio: "pipe",
		});
		return true;
	} catch {
		return false;
	}
};

export const sliceCreateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceCreateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const {
		title,
		"milestone-id": explicitMilestoneId,
		kind: kindRaw,
		"base-branch": baseBranchRaw,
		branch: branchRaw,
	} = parsed.data as {
		title: string;
		"milestone-id"?: string;
		kind?: string;
		"base-branch"?: string;
		branch?: string;
	};

	// Validate kind.
	const kind: SliceKind = (kindRaw ?? "milestone") as SliceKind;
	if (!VALID_KINDS.has(kind)) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "PRECONDITION_VIOLATION",
				message: `Precondition violated: kind.invalid (got "${kindRaw}", expected milestone|quick|debug)`,
				context: {
					violations: [
						{ code: "kind.invalid", expected: "milestone|quick|debug", actual: kindRaw ?? null },
					],
				},
			},
		});
	}

	// Mutual exclusion: --milestone-id only valid when kind === 'milestone'.
	if (kind !== "milestone" && explicitMilestoneId) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "PRECONDITION_VIOLATION",
				message: `Precondition violated: milestone_id.unexpected (cannot use --milestone-id when --kind is "${kind}")`,
				context: {
					violations: [
						{ code: "milestone_id.unexpected", expected: null, actual: explicitMilestoneId },
					],
				},
			},
		});
	}

	// Ad-hoc kinds: require --base-branch and verify it exists.
	if (kind !== "milestone") {
		if (!baseBranchRaw) {
			return JSON.stringify({
				ok: false,
				error: {
					code: "PRECONDITION_VIOLATION",
					message:
						"Precondition violated: base_branch.required (--base-branch is required when --kind is quick or debug)",
					context: {
						violations: [{ code: "base_branch.required", expected: "string", actual: null }],
					},
				},
			});
		}
		if (!branchExistsLocally(baseBranchRaw)) {
			return JSON.stringify({
				ok: false,
				error: {
					code: "PRECONDITION_VIOLATION",
					message: `Precondition violated: base_branch.not_found (branch "${baseBranchRaw}" does not exist locally)`,
					context: {
						violations: [
							{ code: "base_branch.not_found", expected: "existing branch", actual: baseBranchRaw },
						],
					},
				},
			});
		}
	}

	// Validate optional explicit branch name.
	if (branchRaw !== undefined) {
		if (!branchNameIsValid(branchRaw)) {
			return JSON.stringify({
				ok: false,
				error: {
					code: "PRECONDITION_VIOLATION",
					message: `Precondition violated: branch.invalid_format (git check-ref-format rejected "${branchRaw}")`,
					context: {
						violations: [
							{
								code: "branch.invalid_format",
								expected: "valid git branch name",
								actual: branchRaw,
							},
						],
					},
				},
			});
		}
		if (branchExistsLocally(branchRaw)) {
			return JSON.stringify({
				ok: false,
				error: {
					code: "PRECONDITION_VIOLATION",
					message: `Precondition violated: branch.collision (branch "${branchRaw}" already exists)`,
					context: {
						violations: [
							{ code: "branch.collision", expected: "unused branch name", actual: branchRaw },
						],
					},
				},
			});
		}
	}

	const baseBranch = kind === "milestone" ? undefined : baseBranchRaw;
	const branchName = branchRaw;

	const cwd = process.cwd();
	const closableStores = createClosableStateStoresUnchecked();
	const { db, milestoneStore, sliceStore } = closableStores;

	// Track tmps staged before the tx so we can clean up on body throw.
	const stagedTmps: string[] = [];
	// Track dirs we just created (leaf-first) so we can rmSync them on rollback.
	const stagedDirs: string[] = [];

	try {
		// --- Resolve milestone (only for kind === 'milestone') and slice number ---
		let milestoneId: string | undefined;
		let milestone: { id: string; number: number; branch: string } | undefined;
		let sliceNumber: number;

		if (kind === "milestone") {
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
				const openMilestones = milestonesResult.data.filter((m) => m.status !== "closed");
				const ms =
					openMilestones.length > 0
						? openMilestones[openMilestones.length - 1]
						: milestonesResult.data[milestonesResult.data.length - 1];
				milestoneId = ms.id;
			}

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
			milestone = milestoneResult.data;

			const existingSlicesResult = sliceStore.listSlices(milestoneId);
			if (!isOk(existingSlicesResult)) {
				return JSON.stringify({ ok: false, error: existingSlicesResult.error });
			}
			sliceNumber = existingSlicesResult.data.length + 1;
		} else {
			// Ad-hoc kinds: number = MAX(number) + 1 over slices of same kind.
			const existingByKind = sliceStore.listSlicesByKind(kind);
			if (!isOk(existingByKind)) {
				return JSON.stringify({ ok: false, error: existingByKind.error });
			}
			const maxNumber = existingByKind.data.reduce(
				(acc, s) => (s.number > acc ? s.number : acc),
				0,
			);
			sliceNumber = maxNumber + 1;
		}

		// --- Compute storage path via dispatchers ---
		const slLabel = sliceLabelFor({ kind, number: sliceNumber }, milestone);
		const dir = sliceDirFor(
			{ kind },
			milestone ? milestoneLabel(milestone.number) : undefined,
			slLabel,
		);
		const planContent = `# Plan — ${slLabel}: ${title}\n\n_Plan will be defined during /tff:plan._\n`;

		const dirAbs = resolve(cwd, dir);
		const planFinalAbs = resolve(cwd, `${dir}/PLAN.md`);
		const planTmpAbs = `${planFinalAbs}.tmp`;
		stagedDirs.push(...mkdirTracked(dirAbs));
		writeFileSync(planTmpAbs, planContent, "utf8");
		stagedTmps.push(planTmpAbs);

		// STATE.md staging is only valid for milestone-bound slices today.
		// TODO(slice-3): per-kind STATE.md (renderStateMd({ kind })).
		let stateFinalAbs: string | undefined;
		let stateTmpAbs: string | undefined;
		if (kind === "milestone") {
			const staged = stageStateMdTmp(cwd, stagedTmps, stagedDirs);
			stateFinalAbs = staged.stateFinalAbs;
			stateTmpAbs = staged.stateTmpAbs;
		}

		// Run DB insert + staged rename inside withTransaction.
		const txResult = await withTransaction(
			db,
			() => {
				const sliceResult = sliceStore.createSlice({
					milestoneId: kind === "milestone" ? milestoneId : undefined,
					kind,
					number: sliceNumber,
					title,
					baseBranch,
					branchName: branchName ?? undefined,
				});
				if (!sliceResult.ok) {
					throw new Error(`${sliceResult.error.code}: ${sliceResult.error.message}`);
				}
				const tmpRenames: Array<[string, string]> = [[planTmpAbs, planFinalAbs]];

				if (kind === "milestone" && milestoneId && stateTmpAbs && stateFinalAbs) {
					const stateContent = renderStateMd(
						{ milestoneId },
						{ milestoneStore, sliceStore, taskStore: closableStores.taskStore },
					);
					if (!stateContent.ok) {
						throw new Error(`${stateContent.error.code}: ${stateContent.error.message}`);
					}
					writeFileSync(stateTmpAbs, stateContent.data, "utf8");
					tmpRenames.push([stateTmpAbs, stateFinalAbs]);
				}

				return {
					data: { slice: sliceResult.data },
					tmpRenames,
				};
			},
			stagedTmps,
			stagedDirs,
		);

		if (!txResult.ok) {
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
