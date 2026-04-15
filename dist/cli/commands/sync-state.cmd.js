import { generateState } from "../../application/sync/generate-state.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { withBranchGuard } from "../with-branch-guard.js";
import { withSyncLock } from "../with-sync-lock.js";
export const syncStateCmd = async (args) => {
    const [milestoneId] = args;
    if (!milestoneId) {
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: sync:state <milestone-id>" },
        });
    }
    const result = await withSyncLock(async () => {
        return withBranchGuard(async ({ milestoneStore, sliceStore, taskStore }) => {
            const artifactStore = new MarkdownArtifactAdapter(process.cwd());
            const result = await generateState({ milestoneId }, { milestoneStore, sliceStore, taskStore, artifactStore });
            if (isOk(result))
                return JSON.stringify({ ok: true, data: null });
            return JSON.stringify({ ok: false, error: result.error });
        });
    });
    // If result is a string, it came from the inner function; otherwise it's a SyncLockResult
    if (typeof result === "string")
        return result;
    return JSON.stringify(result);
};
//# sourceMappingURL=sync-state.cmd.js.map