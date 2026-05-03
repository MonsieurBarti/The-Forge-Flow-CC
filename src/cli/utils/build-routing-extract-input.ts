import { join } from "node:path";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";
import type { ExtractInput } from "../../domain/ports/signal-extractor.port.js";
import type { SliceStore } from "../../domain/ports/slice-store.port.js";
import { isOk } from "../../domain/result.js";
import { sliceDir } from "../../shared/paths.js";

const SLICE_LABEL_RE = /^M(\d+)-S(\d+)$/;

export type GitRunner = (cmd: string, args: string[], opts: { cwd: string }) => Promise<string>;

export interface BuildExtractInputDeps {
	sliceStore: SliceStore;
	milestoneStore: MilestoneStore;
	runGit: GitRunner;
	projectRoot: string;
}

const readAffectedFiles = async (
	runGit: GitRunner,
	cwd: string,
	baseBranch: string,
): Promise<string[]> => {
	try {
		const out = await runGit("git", ["diff", "--name-only", `${baseBranch}...HEAD`], { cwd });
		return out
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l.length > 0);
	} catch {
		// Missing base branch / no git / detached HEAD — degrade to empty list
		// rather than fail the routing pipeline.
		return [];
	}
};

/**
 * Resolve a slice label (M##-S##) to a populated ExtractInput for
 * routing:decide. Looks up the slice's parent milestone, computes affected
 * files via `git diff --name-only <base>...HEAD`, and points spec_path at
 * the canonical SPEC.md location.
 *
 * Falls back to a minimal stub when the slice can't be resolved or its
 * milestone is missing — routing then degrades to the previous always-low
 * behaviour rather than failing the calling workflow.
 */
export const buildRoutingExtractInput = async (
	sliceLabel: string,
	deps: BuildExtractInputDeps,
): Promise<ExtractInput> => {
	const stub: ExtractInput = {
		slice_id: sliceLabel,
		description: `slice ${sliceLabel}`,
		affected_files: [],
	};

	const m = SLICE_LABEL_RE.exec(sliceLabel);
	if (!m) return stub;
	const milestoneNum = Number.parseInt(m[1], 10);
	const sliceNum = Number.parseInt(m[2], 10);

	const sliceRes = deps.sliceStore.getSliceByNumbers(milestoneNum, sliceNum);
	if (!isOk(sliceRes) || !sliceRes.data) return stub;
	const slice = sliceRes.data;

	let baseBranch: string | undefined = slice.baseBranch;
	if (!baseBranch && slice.milestoneId) {
		const msRes = deps.milestoneStore.getMilestone(slice.milestoneId);
		if (isOk(msRes) && msRes.data) baseBranch = msRes.data.branch;
	}
	if (!baseBranch) return stub;

	const affectedFiles = await readAffectedFiles(deps.runGit, deps.projectRoot, baseBranch);
	const milestoneLabel = `M${m[1].padStart(2, "0")}`;
	const specPath = join(deps.projectRoot, sliceDir(milestoneLabel, sliceLabel), "SPEC.md");

	return {
		slice_id: sliceLabel,
		description: `slice ${sliceLabel}`,
		affected_files: affectedFiles,
		spec_path: specPath,
	};
};
