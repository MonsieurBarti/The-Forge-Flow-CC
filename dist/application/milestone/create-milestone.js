import { formatMilestoneNumber } from "../../domain/entities/milestone.js";
import { isOk, Ok } from "../../domain/result.js";
export const createMilestoneUseCase = async (input, deps) => {
    const branchName = `milestone/${formatMilestoneNumber(input.number)}`;
    // Persist milestone in store
    const milestoneResult = deps.milestoneStore.createMilestone({
        number: input.number,
        name: input.name,
    });
    if (!isOk(milestoneResult))
        return milestoneResult;
    const milestone = milestoneResult.data;
    // Create branch
    await deps.gitOps.createBranch(branchName, "main");
    // Create milestone directory with REQUIREMENTS.md
    const milestoneDir = `.tff/milestones/${formatMilestoneNumber(input.number)}`;
    await deps.artifactStore.mkdir(`${milestoneDir}/slices`);
    await deps.artifactStore.write(`${milestoneDir}/REQUIREMENTS.md`, `# Requirements — ${input.name}\n\n_Define your requirements here._\n`);
    if (deps.stateBranch) {
        const forkResult = await deps.stateBranch.fork(branchName, "tff-state/main");
        if (!isOk(forkResult)) {
            console.warn(`[tff] Failed to create milestone state branch: ${forkResult.error.message}`);
        }
    }
    return Ok({ milestone, branchName });
};
//# sourceMappingURL=create-milestone.js.map