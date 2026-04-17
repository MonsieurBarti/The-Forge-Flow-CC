import type { Milestone } from "../../domain/entities/milestone.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { milestoneLabel } from "../../domain/helpers/branch-naming.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import type { MilestoneStore } from "../../domain/ports/milestone-store.port.js";

import { isOk, Ok, type Result } from "../../domain/result.js";
import { milestoneDir as milestoneDirPath } from "../../shared/paths.js";

interface CreateMilestoneInput {
	name: string;
	number: number;
}

interface CreateMilestoneDeps {
	milestoneStore: MilestoneStore;
	artifactStore: ArtifactStore;
	gitOps: GitOps;
}

interface CreateMilestoneOutput {
	milestone: Milestone;
	branchName: string;
}

export const createMilestoneUseCase = async (
	input: CreateMilestoneInput,
	deps: CreateMilestoneDeps,
): Promise<Result<CreateMilestoneOutput, DomainError>> => {
	// Persist milestone in store (generates UUID and branch)
	const milestoneResult = deps.milestoneStore.createMilestone({
		number: input.number,
		name: input.name,
	});
	if (!isOk(milestoneResult)) return milestoneResult;

	const milestone = milestoneResult.data;
	const branchName = milestone.branch;

	// Create branch
	await deps.gitOps.createBranch(branchName, "main");

	// Create milestone directory with REQUIREMENTS.md using label format
	const label = milestoneLabel(input.number);
	const dir = milestoneDirPath(label);
	await deps.artifactStore.mkdir(`${dir}/slices`);
	await deps.artifactStore.write(
		`${dir}/REQUIREMENTS.md`,
		`# Requirements — ${input.name}\n\n_Define your requirements here._\n`,
	);

	return Ok({ milestone, branchName });
};
