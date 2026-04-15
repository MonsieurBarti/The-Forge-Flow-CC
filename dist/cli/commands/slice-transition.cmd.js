import { transitionSliceUseCase } from "../../application/lifecycle/transition-slice.js";
import { syncBranchUseCase } from "../../application/state-branch/sync-branch.js";
import { generateState } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import { SliceStatusSchema, validTransitionsFrom, } from "../../domain/value-objects/slice-status.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { GitStateBranchAdapter } from "../../infrastructure/adapters/git/git-state-branch.adapter.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { withBranchGuard } from "../with-branch-guard.js";
export const sliceTransitionCmd = async (args) => {
    const [sliceId, targetStatus] = args;
    if (!sliceId || !targetStatus) {
        return JSON.stringify({
            ok: false,
            error: {
                code: "INVALID_ARGS",
                message: "Usage: slice:transition <slice-id> <target-status>",
            },
        });
    }
    try {
        SliceStatusSchema.parse(targetStatus);
    }
    catch {
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: `Invalid status: ${targetStatus}` },
        });
    }
    return withBranchGuard(async ({ sliceStore, milestoneStore, taskStore }) => {
        const artifactStore = new MarkdownArtifactAdapter(process.cwd());
        const result = await transitionSliceUseCase({ sliceId, targetStatus: targetStatus }, { sliceStore });
        if (isOk(result)) {
            const warnings = [];
            const { slice } = result.data;
            // Auto-regenerate STATE.md (non-critical)
            try {
                await generateState({ milestoneId: slice.milestoneId }, { milestoneStore, sliceStore, taskStore, artifactStore });
            }
            catch (e) {
                const msg = `state sync failed: ${String(e)}`;
                tffWarn(msg);
                warnings.push(msg);
            }
            // Auto-sync state branch (S03)
            try {
                const closableStores = createClosableStateStoresUnchecked();
                try {
                    closableStores.checkpoint();
                }
                finally {
                    closableStores.close();
                }
                const gitOps = new GitCliAdapter(process.cwd());
                const stateBranchAdapter = new GitStateBranchAdapter(gitOps, process.cwd());
                const branchR = await gitOps.getCurrentBranch();
                if (isOk(branchR)) {
                    const existsR = await stateBranchAdapter.exists(branchR.data);
                    if (isOk(existsR) && existsR.data) {
                        await syncBranchUseCase({ codeBranch: branchR.data, message: `sync: ${sliceId} -> ${targetStatus}` }, { stateBranch: stateBranchAdapter });
                    }
                }
            }
            catch (e) {
                const syncMsg = `state branch sync failed: ${String(e)}`;
                tffWarn(syncMsg);
                warnings.push(syncMsg);
            }
            // Auto-save CHECKPOINT.md (CRITICAL — blocks transition)
            try {
                const { checkpointSaveCmd } = await import("./checkpoint-save.cmd.js");
                const checkpointData = JSON.stringify({
                    sliceId,
                    baseCommit: "",
                    currentWave: 0,
                    completedWaves: [],
                    completedTasks: [],
                    executorLog: [],
                });
                await checkpointSaveCmd([checkpointData]);
            }
            catch (e) {
                return JSON.stringify({
                    ok: false,
                    error: { code: "CHECKPOINT_FAILED", message: `Checkpoint save failed: ${String(e)}` },
                    warnings,
                });
            }
            return JSON.stringify({ ok: true, data: { status: slice.status }, warnings });
        }
        // Enhance INVALID_TRANSITION errors with valid next steps
        if (result.error.code === "INVALID_TRANSITION" && result.error.context?.from) {
            const fromStatus = result.error.context.from;
            const validNext = validTransitionsFrom(fromStatus);
            const recoveryHint = validNext.length > 0
                ? `Valid next: ${validNext.join(", ")}`
                : "No valid transitions available from this status";
            return JSON.stringify({
                ok: false,
                error: {
                    code: result.error.code,
                    message: result.error.message,
                    recoveryHint,
                },
            });
        }
        return JSON.stringify({ ok: false, error: result.error });
    });
};
//# sourceMappingURL=slice-transition.cmd.js.map