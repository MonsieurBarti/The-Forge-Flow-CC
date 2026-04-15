import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { BranchMismatchError } from "../../../domain/errors/branch-mismatch.error.js";
import { BranchMetaSchema } from "../../../domain/value-objects/branch-meta.js";
import { JsonlJournalAdapter } from "../journal/jsonl-journal.adapter.js";
import { SQLiteStateAdapter } from "./sqlite-state.adapter.js";
function checkBranchAlignment(tffDir) {
    try {
        const stampPath = path.join(tffDir, "branch-meta.json");
        const dbFilePath = path.join(tffDir, "state.db");
        if (existsSync(stampPath)) {
            const raw = JSON.parse(readFileSync(stampPath, "utf8"));
            const meta = BranchMetaSchema.parse(raw);
            const currentBranch = execSync("git branch --show-current", {
                cwd: path.dirname(tffDir), // run git from parent of .tff/
                encoding: "utf8",
            }).trim();
            if (meta.codeBranch !== currentBranch) {
                throw new BranchMismatchError(meta.codeBranch, currentBranch);
            }
        }
        else if (existsSync(dbFilePath)) {
            const currentBranch = execSync("git branch --show-current", {
                cwd: path.dirname(tffDir),
                encoding: "utf8",
            }).trim();
            throw new BranchMismatchError("unknown", currentBranch);
        }
    }
    catch (e) {
        if (e instanceof BranchMismatchError)
            throw e;
        // execSync failed (not git repo) or stamp parse failed — skip guard
    }
}
export function createStateStoresUnchecked(dbPath) {
    const resolvedPath = dbPath ?? path.join(process.cwd(), ".tff", "state.db");
    const adapter = SQLiteStateAdapter.create(resolvedPath);
    const initResult = adapter.init();
    if (!initResult.ok)
        throw new Error(`DB init failed: ${initResult.error.message}`);
    const tffDir = path.dirname(resolvedPath);
    const journalPath = path.join(tffDir, "journal");
    const journalRepository = new JsonlJournalAdapter(journalPath);
    return {
        db: adapter,
        projectStore: adapter,
        milestoneStore: adapter,
        sliceStore: adapter,
        taskStore: adapter,
        dependencyStore: adapter,
        sessionStore: adapter,
        reviewStore: adapter,
        journalRepository,
    };
}
export function createStateStores(dbPath) {
    const resolvedPath = dbPath ?? path.join(process.cwd(), ".tff", "state.db");
    checkBranchAlignment(path.dirname(resolvedPath));
    return createStateStoresUnchecked(dbPath);
}
export function createClosableStateStoresUnchecked(dbPath) {
    const resolvedPath = dbPath ?? path.join(process.cwd(), ".tff", "state.db");
    const adapter = SQLiteStateAdapter.create(resolvedPath);
    const initResult = adapter.init();
    if (!initResult.ok)
        throw new Error(`DB init failed: ${initResult.error.message}`);
    const tffDir = path.dirname(resolvedPath);
    const journalPath = path.join(tffDir, "journal");
    const journalRepository = new JsonlJournalAdapter(journalPath);
    return {
        db: adapter,
        projectStore: adapter,
        milestoneStore: adapter,
        sliceStore: adapter,
        taskStore: adapter,
        dependencyStore: adapter,
        sessionStore: adapter,
        reviewStore: adapter,
        journalRepository,
        close: () => adapter.close(),
        checkpoint: () => adapter.checkpoint(),
    };
}
export function createClosableStateStores(dbPath) {
    const resolvedPath = dbPath ?? path.join(process.cwd(), ".tff", "state.db");
    checkBranchAlignment(path.dirname(resolvedPath));
    return createClosableStateStoresUnchecked(dbPath);
}
//# sourceMappingURL=create-state-stores.js.map