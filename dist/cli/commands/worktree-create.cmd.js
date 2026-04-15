import path from "node:path";
import { createWorktreeUseCase } from "../../application/worktree/create-worktree.js";
import { isOk } from "../../domain/result.js";
import { copyTffToWorktree } from "../../infrastructure/adapters/git/copy-tff-to-worktree.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
export const worktreeCreateCmd = async (args) => {
    const [sliceId] = args;
    if (!sliceId)
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: worktree:create <slice-id>" },
        });
    const cwd = process.cwd();
    const gitOps = new GitCliAdapter(cwd);
    // Derive milestone branch from slice ID (e.g., M01-S01 → milestone/M01)
    const milestoneMatch = sliceId.match(/^(M\d+)/);
    const startPoint = milestoneMatch ? `milestone/${milestoneMatch[1]}` : undefined;
    const result = await createWorktreeUseCase({ sliceId, startPoint }, { gitOps });
    if (isOk(result)) {
        const tffDir = path.join(cwd, ".tff");
        const worktreeAbsPath = path.resolve(cwd, result.data.worktreePath);
        copyTffToWorktree(tffDir, worktreeAbsPath);
        return JSON.stringify({ ok: true, data: result.data });
    }
    return JSON.stringify({ ok: false, error: result.error });
};
//# sourceMappingURL=worktree-create.cmd.js.map