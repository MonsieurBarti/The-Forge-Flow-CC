import { freshReviewerViolationError } from "../../domain/errors/fresh-reviewer-violation.error.js";
import { Err, isOk, Ok } from "../../domain/result.js";
export const enforceFreshReviewer = async (input, deps) => {
    const executorsResult = deps.taskStore.getExecutorsForSlice(input.sliceId);
    if (!isOk(executorsResult))
        return executorsResult;
    if (executorsResult.data.includes(input.reviewerAgent))
        return Err(freshReviewerViolationError(input.sliceId, input.reviewerAgent));
    return Ok(undefined);
};
//# sourceMappingURL=enforce-fresh-reviewer.js.map