import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import { Err, Ok } from "../../../domain/result.js";
const exec = promisify(execFile);
const gitError = (message, context) => createDomainError("GIT_CONFLICT", message, context);
/** Strip GIT_* env vars to prevent CI runner state from leaking into subprocesses. */
const cleanGitEnv = () => {
    const env = {};
    for (const [k, v] of Object.entries(process.env)) {
        if (!k.startsWith("GIT_") && v !== undefined)
            env[k] = v;
    }
    return env;
};
const runGit = async (args, cwd) => {
    try {
        const { stdout } = await exec("git", args, { cwd, timeout: 30_000, env: cleanGitEnv() });
        return Ok(stdout.trim());
    }
    catch (err) {
        // execFile errors include stdout/stderr on the error object
        const e = err;
        const detail = e.stderr?.trim() || e.stdout?.trim() || e.message || String(err);
        return Err(gitError(`git ${args.join(" ")} failed: ${detail}`, { args }));
    }
};
export class GitCliAdapter {
    repoRoot;
    cache = new Map();
    TTL_MS = 5000;
    constructor(repoRoot) {
        this.repoRoot = repoRoot;
    }
    getCached(key) {
        const entry = this.cache.get(key);
        if (!entry || Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    setCache(key, value) {
        this.cache.set(key, { value, expiresAt: Date.now() + this.TTL_MS });
    }
    invalidateCache() {
        this.cache.clear();
    }
    async createBranch(name, from) {
        const r = await runGit(["branch", name, from], this.repoRoot);
        if (!r.ok)
            return r;
        this.invalidateCache();
        return Ok(undefined);
    }
    async createWorktree(path, branch, startPoint) {
        const args = ["worktree", "add", path, "-b", branch];
        if (startPoint)
            args.push(startPoint);
        const r = await runGit(args, this.repoRoot);
        if (!r.ok)
            return r;
        return Ok(undefined);
    }
    async deleteWorktree(path) {
        const r = await runGit(["worktree", "remove", path, "--force"], this.repoRoot);
        if (!r.ok)
            return r;
        return Ok(undefined);
    }
    async listWorktrees() {
        const r = await runGit(["worktree", "list", "--porcelain"], this.repoRoot);
        if (!r.ok)
            return r;
        return Ok(r.data
            .split("\n")
            .filter((l) => l.startsWith("worktree "))
            .map((l) => l.replace("worktree ", "")));
    }
    async commit(message, files, worktreePath) {
        const cwd = worktreePath ?? this.repoRoot;
        const addR = await runGit(["add", ...files], cwd);
        if (!addR.ok)
            return addR;
        const commitR = await runGit(["commit", "-m", message], cwd);
        if (!commitR.ok)
            return commitR;
        const shaR = await runGit(["rev-parse", "--short", "HEAD"], cwd);
        if (!shaR.ok)
            return shaR;
        this.invalidateCache();
        return Ok({ sha: shaR.data, message });
    }
    async revert(commitSha, worktreePath) {
        const cwd = worktreePath ?? this.repoRoot;
        const r = await runGit(["revert", "--no-edit", commitSha], cwd);
        if (!r.ok)
            return r;
        const shaR = await runGit(["rev-parse", "--short", "HEAD"], cwd);
        if (!shaR.ok)
            return shaR;
        return Ok({ sha: shaR.data, message: `Revert "${commitSha}"` });
    }
    async merge(source, target) {
        await runGit(["checkout", target], this.repoRoot);
        const r = await runGit(["merge", source, "--no-ff"], this.repoRoot);
        if (!r.ok)
            return r;
        return Ok(undefined);
    }
    async getCurrentBranch(worktreePath) {
        const cwd = worktreePath ?? this.repoRoot;
        const cacheKey = `branch:${cwd}`;
        const cached = this.getCached(cacheKey);
        if (cached)
            return Ok(cached);
        const r = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
        if (r.ok)
            this.setCache(cacheKey, r.data);
        return r;
    }
    async getHeadSha(worktreePath) {
        const cwd = worktreePath ?? this.repoRoot;
        const cacheKey = `sha:${cwd}`;
        const cached = this.getCached(cacheKey);
        if (cached)
            return Ok(cached);
        const r = await runGit(["rev-parse", "--short", "HEAD"], cwd);
        if (r.ok)
            this.setCache(cacheKey, r.data);
        return r;
    }
    async createOrphanWorktree(path, branchName) {
        const r = await runGit(["worktree", "add", "--detach", path], this.repoRoot);
        if (!r.ok)
            return r;
        const orphanR = await runGit(["checkout", "--orphan", branchName], path);
        if (!orphanR.ok) {
            await runGit(["worktree", "remove", path, "--force"], this.repoRoot);
            return orphanR;
        }
        await runGit(["rm", "-rf", "--cached", "."], path);
        return Ok(undefined);
    }
    async checkoutWorktree(path, existingBranch) {
        const r = await runGit(["worktree", "add", path, existingBranch], this.repoRoot);
        if (!r.ok)
            return r;
        return Ok(undefined);
    }
    async branchExists(name) {
        const r = await runGit(["rev-parse", "--verify", `refs/heads/${name}`], this.repoRoot);
        return Ok(r.ok);
    }
    async deleteBranch(name) {
        const r = await runGit(["branch", "-D", name], this.repoRoot);
        if (!r.ok)
            return r;
        this.invalidateCache();
        return Ok(undefined);
    }
    async pruneWorktrees() {
        const r = await runGit(["worktree", "prune"], this.repoRoot);
        if (!r.ok)
            return r;
        return Ok(undefined);
    }
    async lsTree(ref) {
        const r = await runGit(["ls-tree", "-r", "--name-only", ref], this.repoRoot);
        if (!r.ok)
            return r;
        return Ok(r.data.split("\n").filter(Boolean));
    }
    async extractFile(ref, filePath) {
        // CRITICAL: Cannot use runGit — it calls stdout.trim() which corrupts binary data.
        // Use raw execFile with encoding: 'buffer' for binary-safe extraction.
        const { execFile: execFileRaw } = await import("node:child_process");
        return new Promise((resolve) => {
            execFileRaw("git", ["show", `${ref}:${filePath}`], {
                cwd: this.repoRoot,
                timeout: 30_000,
                encoding: "buffer",
                maxBuffer: 10 * 1024 * 1024,
                env: cleanGitEnv(),
            }, (err, stdout) => {
                if (err) {
                    resolve(Err(gitError(`git show ${ref}:${filePath} failed: ${err}`, { ref, filePath })));
                }
                else {
                    resolve(Ok(stdout));
                }
            });
        });
    }
    async detectDefaultBranch() {
        const originR = await runGit(["symbolic-ref", "refs/remotes/origin/HEAD"], this.repoRoot);
        if (originR.ok) {
            const ref = originR.data.replace("refs/remotes/origin/", "");
            if (ref)
                return Ok(ref);
        }
        const configR = await runGit(["config", "init.defaultBranch"], this.repoRoot);
        if (configR.ok && configR.data)
            return Ok(configR.data);
        return Ok("main");
    }
    async pushBranch(branch, remote = "origin") {
        const r = await runGit(["push", remote, `${branch}:${branch}`], this.repoRoot);
        if (!r.ok)
            return r;
        return Ok(undefined);
    }
    async fetchBranch(branch, remote = "origin") {
        const r = await runGit(["fetch", remote, `${branch}:${branch}`], this.repoRoot);
        if (!r.ok)
            return r;
        return Ok(undefined);
    }
}
//# sourceMappingURL=git-cli.adapter.js.map