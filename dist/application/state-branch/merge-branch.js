import { isOk } from "../../domain/result.js";
export const mergeBranchUseCase = async (input, deps) => {
    const mergeR = await deps.stateBranch.merge(input.childCodeBranch, input.parentCodeBranch, input.sliceId);
    if (!isOk(mergeR))
        return mergeR;
    await deps.stateBranch.deleteBranch(input.childCodeBranch);
    return mergeR;
};
//# sourceMappingURL=merge-branch.js.map