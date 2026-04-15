import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
/**
 * Recursively copy .tff/ directory to worktree, excluding worktrees/ subdirectory.
 */
export function copyTffToWorktree(tffDir, worktreePath) {
    if (!existsSync(tffDir))
        return;
    const destTffDir = path.join(worktreePath, ".tff");
    mkdirSync(destTffDir, { recursive: true });
    for (const entry of readdirSync(tffDir)) {
        if (entry === "worktrees" || entry === "branch-meta.json" || entry === "state.db")
            continue;
        const src = path.join(tffDir, entry);
        const dest = path.join(destTffDir, entry);
        if (statSync(src).isDirectory()) {
            cpSync(src, dest, { recursive: true });
        }
        else {
            cpSync(src, dest);
        }
    }
}
//# sourceMappingURL=copy-tff-to-worktree.js.map