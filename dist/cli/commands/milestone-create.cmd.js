import { createMilestoneUseCase } from "../../application/milestone/create-milestone.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { GitStateBranchAdapter } from "../../infrastructure/adapters/git/git-state-branch.adapter.js";
import { withBranchGuard } from "../with-branch-guard.js";
export const milestoneCreateCmd = async (args) => {
    const name = args[0];
    if (!name) {
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: milestone:create <name>" },
        });
    }
    return withBranchGuard(async ({ milestoneStore }) => {
        const cwd = process.cwd();
        const artifactStore = new MarkdownArtifactAdapter(cwd);
        const gitOps = new GitCliAdapter(cwd);
        const stateBranch = new GitStateBranchAdapter(gitOps, cwd);
        // Auto-number: count existing milestones and increment
        const milestonesResult = milestoneStore.listMilestones();
        if (!isOk(milestonesResult)) {
            return JSON.stringify({ ok: false, error: milestonesResult.error });
        }
        const number = milestonesResult.data.length + 1;
        const result = await createMilestoneUseCase({ name, number }, { milestoneStore, artifactStore, gitOps, stateBranch });
        if (isOk(result))
            return JSON.stringify({ ok: true, data: result.data });
        return JSON.stringify({ ok: false, error: result.error });
    });
};
//# sourceMappingURL=milestone-create.cmd.js.map