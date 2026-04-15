import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { restoreBranchUseCase } from "../../application/state-branch/restore-branch.js";
import { isOk } from "../../domain/result.js";
import { SQLiteStateImporter } from "../../infrastructure/adapters/export/sqlite-state-importer.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { GitStateBranchAdapter } from "../../infrastructure/adapters/git/git-state-branch.adapter.js";
import { SQLiteStateAdapter } from "../../infrastructure/adapters/sqlite/sqlite-state.adapter.js";
export const restoreBranchCmd = async (args) => {
    const [codeBranch] = args;
    if (!codeBranch)
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: restore:branch <code-branch>" },
        });
    const cwd = process.cwd();
    const tffDir = path.join(cwd, ".tff");
    const dbPath = path.join(tffDir, "state.db");
    // S02: Create SQLiteStateImporter for JSON-based state restoration
    // Ensure DB exists (create with schema if missing) so importer has a target
    let sqliteAdapter;
    if (existsSync(dbPath)) {
        sqliteAdapter = SQLiteStateAdapter.create(dbPath);
    }
    else {
        mkdirSync(tffDir, { recursive: true });
        sqliteAdapter = SQLiteStateAdapter.create(dbPath);
        const initR = sqliteAdapter.init();
        if (!isOk(initR)) {
            return JSON.stringify({
                ok: false,
                error: { code: "DB_INIT_FAILED", message: `Failed to init DB: ${initR.error.message}` },
            });
        }
    }
    const importer = new SQLiteStateImporter(sqliteAdapter);
    const gitOps = new GitCliAdapter(cwd);
    const stateBranch = new GitStateBranchAdapter(gitOps, cwd, undefined, importer);
    const result = await restoreBranchUseCase({ codeBranch, targetDir: cwd }, { stateBranch });
    if (isOk(result))
        return JSON.stringify({ ok: true, data: result.data });
    return JSON.stringify({ ok: false, error: result.error });
};
//# sourceMappingURL=restore-branch.cmd.js.map