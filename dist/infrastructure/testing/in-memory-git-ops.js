import { createDomainError } from "../../domain/errors/domain-error.js";
import { Err, Ok } from "../../domain/result.js";
export class InMemoryGitOps {
    branches = new Set(["main"]);
    worktrees = new Map();
    currentBranch = "main";
    commits = [];
    headSha = "abc1234";
    treeFiles = new Map();
    fileContents = new Map();
    async createBranch(name, _from) {
        this.branches.add(name);
        return Ok(undefined);
    }
    async createWorktree(path, branch, _startPoint) {
        this.worktrees.set(path, branch);
        this.branches.add(branch);
        return Ok(undefined);
    }
    async deleteWorktree(path) {
        if (!this.worktrees.has(path))
            return Err(createDomainError("NOT_FOUND", `Worktree not found: ${path}`, { path }));
        this.worktrees.delete(path);
        return Ok(undefined);
    }
    async listWorktrees() {
        return Ok([...this.worktrees.keys()]);
    }
    async commit(message, _files, _worktreePath) {
        const sha = Math.random().toString(16).slice(2, 9);
        const ref = { sha, message };
        this.commits.push(ref);
        this.headSha = sha;
        return Ok(ref);
    }
    async revert(commitSha, _worktreePath) {
        const sha = Math.random().toString(16).slice(2, 9);
        const ref = { sha, message: `Revert "${commitSha}"` };
        this.commits.push(ref);
        this.headSha = sha;
        return Ok(ref);
    }
    async merge(_source, _target) {
        return Ok(undefined);
    }
    async getCurrentBranch(_worktreePath) {
        return Ok(this.currentBranch);
    }
    async getHeadSha(_worktreePath) {
        return Ok(this.headSha);
    }
    async createOrphanWorktree(path, branchName) {
        this.branches.add(branchName);
        this.worktrees.set(path, branchName);
        return Ok(undefined);
    }
    async checkoutWorktree(path, existingBranch) {
        if (!this.branches.has(existingBranch))
            return Err(createDomainError("NOT_FOUND", `Branch not found: ${existingBranch}`, { existingBranch }));
        this.worktrees.set(path, existingBranch);
        return Ok(undefined);
    }
    async branchExists(name) {
        return Ok(this.branches.has(name));
    }
    async deleteBranch(name) {
        this.branches.delete(name);
        return Ok(undefined);
    }
    async pruneWorktrees() {
        return Ok(undefined);
    }
    async lsTree(ref) {
        return Ok(this.treeFiles.get(ref) ?? []);
    }
    async extractFile(ref, filePath) {
        const key = `${ref}:${filePath}`;
        const buf = this.fileContents.get(key);
        if (!buf)
            return Err(createDomainError("NOT_FOUND", `File not found: ${key}`, { ref, filePath }));
        return Ok(buf);
    }
    async detectDefaultBranch() {
        return Ok("main");
    }
    async pushBranch(_branch, _remote) {
        return Ok(undefined);
    }
    async fetchBranch(_branch, _remote) {
        return Ok(undefined);
    }
    reset() {
        this.branches = new Set(["main"]);
        this.worktrees.clear();
        this.currentBranch = "main";
        this.commits = [];
        this.headSha = "abc1234";
        this.treeFiles.clear();
        this.fileContents.clear();
    }
    getCommits() {
        return [...this.commits];
    }
    hasBranch(name) {
        return this.branches.has(name);
    }
    setTreeFiles(ref, files) {
        this.treeFiles.set(ref, files);
    }
    setFileContent(ref, filePath, content) {
        this.fileContents.set(`${ref}:${filePath}`, content);
    }
}
//# sourceMappingURL=in-memory-git-ops.js.map