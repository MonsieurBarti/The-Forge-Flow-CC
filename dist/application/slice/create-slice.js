import { createDomainError } from "../../domain/errors/domain-error.js";
import { Err, isOk, Ok } from "../../domain/result.js";
export const createSliceUseCase = async (input, deps) => {
    const milestoneResult = deps.milestoneStore.getMilestone(input.milestoneId);
    if (!isOk(milestoneResult))
        return milestoneResult;
    const milestone = milestoneResult.data;
    if (!milestone) {
        return Err(createDomainError("NOT_FOUND", `Milestone "${input.milestoneId}" not found`));
    }
    const existingSlicesResult = deps.sliceStore.listSlices(input.milestoneId);
    if (!isOk(existingSlicesResult))
        return existingSlicesResult;
    const sliceNumber = existingSlicesResult.data.length + 1;
    const sliceResult = deps.sliceStore.createSlice({
        milestoneId: input.milestoneId,
        number: sliceNumber,
        title: input.title,
    });
    if (!isOk(sliceResult))
        return sliceResult;
    const slice = sliceResult.data;
    // Create slice directory with stub PLAN.md
    const milestoneDir = `.tff/milestones/${input.milestoneId}`;
    const sliceDir = `${milestoneDir}/slices/${slice.id}`;
    await deps.artifactStore.mkdir(sliceDir);
    await deps.artifactStore.write(`${sliceDir}/PLAN.md`, `# Plan — ${slice.id}: ${input.title}\n\n_Plan will be defined during /tff:plan._\n`);
    if (deps.stateBranch) {
        const forkResult = await deps.stateBranch.fork(`slice/${slice.id}`, `tff-state/milestone/${input.milestoneId}`);
        if (!isOk(forkResult)) {
            console.warn(`[tff] Failed to create slice state branch: ${forkResult.error.message}`);
        }
    }
    return Ok({ slice });
};
//# sourceMappingURL=create-slice.js.map