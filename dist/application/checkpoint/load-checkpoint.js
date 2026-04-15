import { createDomainError } from "../../domain/errors/domain-error.js";
import { Err, isOk, Ok } from "../../domain/result.js";
export const loadCheckpoint = async (sliceId, deps) => {
    const milestoneId = sliceId.match(/^(M\d+)/)?.[1] ?? "M01";
    const path = `.tff/milestones/${milestoneId}/slices/${sliceId}/CHECKPOINT.md`;
    const contentResult = await deps.artifactStore.read(path);
    if (!isOk(contentResult))
        return Err(createDomainError("NOT_FOUND", `No checkpoint found for slice "${sliceId}"`, { sliceId }));
    const match = contentResult.data.match(/<!-- checkpoint-json: (.+) -->/);
    if (!match)
        return Err(createDomainError("VALIDATION_ERROR", `Checkpoint file for "${sliceId}" is corrupted`, {
            sliceId,
        }));
    const data = JSON.parse(match[1]);
    return Ok(data);
};
//# sourceMappingURL=load-checkpoint.js.map