import { mergeBranchUseCase } from "../../application/state-branch/merge-branch.js";
import { isOk } from "../../domain/result.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { GitStateBranchAdapter } from "../../infrastructure/adapters/git/git-state-branch.adapter.js";
export const branchMergeCmd = async (args) => {
    const [childCodeBranch, parentCodeBranch, sliceId] = args;
    if (!childCodeBranch || !parentCodeBranch || !sliceId)
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: branch:merge <child> <parent> <slice-id>" },
        });
    const gitOps = new GitCliAdapter(process.cwd());
    const stateBranch = new GitStateBranchAdapter(gitOps, process.cwd());
    const result = await mergeBranchUseCase({ childCodeBranch, parentCodeBranch, sliceId }, { stateBranch });
    if (isOk(result))
        return JSON.stringify({ ok: true, data: result.data });
    return JSON.stringify({ ok: false, error: result.error });
};
//# sourceMappingURL=branch-merge.cmd.js.map