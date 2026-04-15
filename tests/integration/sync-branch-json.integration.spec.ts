import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { milestoneCreateCmd } from "../../src/cli/commands/milestone-create.cmd.js";
import { projectInitCmd } from "../../src/cli/commands/project-init.cmd.js";
import { syncBranchCmd } from "../../src/cli/commands/sync-branch.cmd.js";
import { GitCliAdapter } from "../../src/infrastructure/adapters/git/git-cli.adapter.js";
import { createStateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { writeSyntheticStamp } from "../../src/infrastructure/hooks/branch-meta-stamp.js";

describe("sync-branch-json export integration", () => {
	let tmpDir: string;
	let tffDir: string;
	let dbPath: string;
	let originalCwd: string;
	let gitOps: GitCliAdapter;
	let env: Record<string, string>;

	beforeEach(async () => {
		originalCwd = process.cwd();
		tmpDir = join(
			os.tmpdir(),
			`tff-sync-json-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		);
		mkdirSync(tmpDir, { recursive: true });
		tffDir = join(tmpDir, ".tff");
		mkdirSync(tffDir, { recursive: true });
		dbPath = join(tffDir, "state.db");
		gitOps = new GitCliAdapter(tmpDir);

		// Change to temp directory so commands use the right paths
		process.chdir(tmpDir);

		// Initialize git repo
		env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
		execSync("git init", { cwd: tmpDir, stdio: "ignore", env });
		execSync("git checkout -b main", { cwd: tmpDir, stdio: "ignore", env });
		execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: "ignore", env });
		execSync('git config user.name "Test"', { cwd: tmpDir, stdio: "ignore", env });
		execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: "ignore", env });

		// Write synthetic stamp to avoid branch mismatch errors
		const currentBranch = execSync("git branch --show-current", {
			cwd: tmpDir,
			encoding: "utf8",
		}).trim();
		writeSyntheticStamp(tffDir, currentBranch);

		// Initialize project and create milestone
		const initResult = JSON.parse(
			await projectInitCmd(["test-project", "Test project for sync json"]),
		);
		expect(initResult.ok).toBe(true);

		const milestoneResult = JSON.parse(await milestoneCreateCmd(["Test Milestone"]));
		expect(milestoneResult.ok).toBe(true);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("JSON export on sync:branch", () => {
		it("should export state to JSON and commit to state branch", async () => {
			// Get current branch for sync
			const currentBranch = execSync("git branch --show-current", {
				cwd: tmpDir,
				encoding: "utf8",
			}).trim();

			// Delete state branch if it exists from previous test attempts
			try {
				execSync(`git branch -D tff-state/${currentBranch}`, { cwd: tmpDir, stdio: "ignore", env });
			} catch {
				// Branch might not exist, that's fine
			}

			// First, create the state branch manually (sync:branch requires it to exist)
			execSync(`git checkout --orphan tff-state/${currentBranch}`, {
				cwd: tmpDir,
				stdio: "ignore",
				env,
			});

			// Write initial branch-meta.json
			const initialMeta = {
				stateId: "test-state-id",
				codeBranch: currentBranch,
				parentStateBranch: null,
				createdAt: new Date().toISOString(),
			};
			const fs = await import("node:fs");
			fs.writeFileSync(join(tmpDir, "branch-meta.json"), JSON.stringify(initialMeta, null, 2));
			execSync("git add branch-meta.json", { cwd: tmpDir, stdio: "ignore", env });
			execSync('git commit -m "init state branch"', { cwd: tmpDir, stdio: "ignore", env });

			// Return to main branch
			execSync(`git checkout ${currentBranch}`, { cwd: tmpDir, stdio: "ignore", env });

			// Run sync:branch
			const result = JSON.parse(await syncBranchCmd([currentBranch]));
			expect(result.ok).toBe(true);

			// Verify state-snapshot.json exists in state branch
			const stateBranch = `tff-state/${currentBranch}`;
			const treeResult = await gitOps.lsTree(stateBranch);
			expect(treeResult.ok).toBe(true);

			const files = treeResult.data;
			const hasJson = files.some((f) => f === ".tff/state-snapshot.json");
			const hasDb = files.some((f) => f === ".tff/state.db");

			expect(hasJson).toBe(true);
			expect(hasDb).toBe(false);
		}, 15000);

		it("should preserve local SQLite database after sync", async () => {
			// Verify local DB exists before sync
			expect(existsSync(dbPath)).toBe(true);

			// Get current branch
			const currentBranch = execSync("git branch --show-current", {
				cwd: tmpDir,
				encoding: "utf8",
			}).trim();

			// Delete state branch if it exists from previous test attempts
			try {
				execSync(`git branch -D tff-state/${currentBranch}`, { cwd: tmpDir, stdio: "ignore", env });
			} catch {
				// Branch might not exist, that's fine
			}

			// Create state branch
			execSync(`git checkout --orphan tff-state/${currentBranch}`, {
				cwd: tmpDir,
				stdio: "ignore",
				env,
			});

			// Write initial branch-meta.json
			const initialMeta = {
				stateId: "test-state-id",
				codeBranch: currentBranch,
				parentStateBranch: null,
				createdAt: new Date().toISOString(),
			};
			const fs = await import("node:fs");
			fs.writeFileSync(join(tmpDir, "branch-meta.json"), JSON.stringify(initialMeta, null, 2));
			execSync("git add branch-meta.json", { cwd: tmpDir, stdio: "ignore", env });
			execSync('git commit -m "init"', { cwd: tmpDir, stdio: "ignore", env });
			execSync(`git checkout ${currentBranch}`, { cwd: tmpDir, stdio: "ignore", env });

			// Run sync
			const result = JSON.parse(await syncBranchCmd([currentBranch]));
			expect(result.ok).toBe(true);

			// Verify local DB still exists and is queryable
			expect(existsSync(dbPath)).toBe(true);

			const stores = createStateStores(dbPath);
			const projectResult = stores.db.getProject();
			expect(projectResult.ok).toBe(true);
			expect(projectResult.data).not.toBeNull();
			stores.db.close();
		}, 15000);

		it("should produce valid StateSnapshot JSON", async () => {
			// Get current branch
			const currentBranch = execSync("git branch --show-current", {
				cwd: tmpDir,
				encoding: "utf8",
			}).trim();

			// Delete state branch if it exists from previous test attempts
			try {
				execSync(`git branch -D tff-state/${currentBranch}`, { cwd: tmpDir, stdio: "ignore", env });
			} catch {
				// Branch might not exist, that's fine
			}

			// Create state branch
			execSync(`git checkout --orphan tff-state/${currentBranch}`, {
				cwd: tmpDir,
				stdio: "ignore",
				env,
			});

			// Write initial branch-meta.json
			const initialMeta = {
				stateId: "test-state-id",
				codeBranch: currentBranch,
				parentStateBranch: null,
				createdAt: new Date().toISOString(),
			};
			const fs = await import("node:fs");
			fs.writeFileSync(join(tmpDir, "branch-meta.json"), JSON.stringify(initialMeta, null, 2));
			execSync("git add branch-meta.json", { cwd: tmpDir, stdio: "ignore", env });
			execSync('git commit -m "init"', { cwd: tmpDir, stdio: "ignore", env });
			execSync(`git checkout ${currentBranch}`, { cwd: tmpDir, stdio: "ignore", env });

			// Run sync
			const result = JSON.parse(await syncBranchCmd([currentBranch]));
			expect(result.ok).toBe(true);

			// Extract JSON from state branch
			const stateBranch = `tff-state/${currentBranch}`;
			const fileResult = await gitOps.extractFile(stateBranch, ".tff/state-snapshot.json");
			expect(fileResult.ok).toBe(true);

			// Parse and validate structure
			const jsonContent = fileResult.data.toString("utf8");
			const parsed = JSON.parse(jsonContent);

			// Verify structure without strict schema validation (dates are strings in JSON)
			expect(parsed.version).toBeGreaterThan(0);
			expect(parsed.exportedAt).toBeDefined();
			expect(parsed.project).toBeDefined();
			expect(parsed.project?.name).toBe("test-project");
			expect(parsed.milestones).toBeInstanceOf(Array);
			expect(parsed.milestones.length).toBeGreaterThan(0);
			expect(parsed.slices).toBeInstanceOf(Array);
			expect(parsed.tasks).toBeInstanceOf(Array);
			expect(parsed.dependencies).toBeInstanceOf(Array);
			expect(parsed.reviews).toBeInstanceOf(Array);
		}, 15000);
	});
});
