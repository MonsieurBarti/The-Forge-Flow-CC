import { repairStateBranchesUseCase } from "../../application/state-branch/repair-state-branches.js";
import { isOk } from "../../domain/result.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { GitStateBranchAdapter } from "../../infrastructure/adapters/git/git-state-branch.adapter.js";
import { withBranchGuard } from "../with-branch-guard.js";
export const stateRepairBranchesCmd = async (args) => {
    const dryRun = args.includes("--dry-run");
    return withBranchGuard(async ({ milestoneStore, sliceStore }) => {
        const cwd = process.cwd();
        const gitOps = new GitCliAdapter(cwd);
        const stateBranch = new GitStateBranchAdapter(gitOps, cwd);
        const result = await repairStateBranchesUseCase({ dryRun }, { milestoneStore, sliceStore, stateBranch });
        if (!isOk(result)) {
            return JSON.stringify({ ok: false, error: result.error });
        }
        const output = result.data;
        // Build human-readable summary
        const lines = [];
        lines.push(`State Branch Repair ${dryRun ? "(DRY RUN)" : ""}`);
        lines.push("");
        if (output.created.length > 0) {
            lines.push(`Created: ${output.created.length}`);
            for (const item of output.created) {
                lines.push(`  ✓ ${item.type}: ${item.id}`);
            }
            lines.push("");
        }
        if (output.failed.length > 0) {
            lines.push(`Failed: ${output.failed.length}`);
            for (const item of output.failed) {
                lines.push(`  ✗ ${item.type}: ${item.id} - ${item.error}`);
            }
            lines.push("");
        }
        if (output.skipped.length > 0) {
            lines.push(`Skipped: ${output.skipped.length}`);
            for (const item of output.skipped) {
                lines.push(`  → ${item.type}: ${item.id} (${item.reason})`);
            }
            lines.push("");
        }
        lines.push("");
        lines.push(`Summary: ${output.created.length} created, ${output.failed.length} failed, ${output.skipped.length} skipped`);
        return JSON.stringify({
            ok: true,
            data: {
                ...output,
                summary: lines.join("\n"),
            },
        });
    });
};
//# sourceMappingURL=state-repair-branches.cmd.js.map