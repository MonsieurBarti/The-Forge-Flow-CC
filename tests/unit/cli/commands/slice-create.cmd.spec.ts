import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { milestoneCreateCmd } from "../../../../src/cli/commands/milestone-create.cmd.js";
import { projectInitCmd } from "../../../../src/cli/commands/project-init.cmd.js";
import { sliceCreateCmd } from "../../../../src/cli/commands/slice-create.cmd.js";
import { createClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";

// Git environment variables that can leak between tests and main repo
const GIT_ENV_VARS = [
	"GIT_DIR",
	"GIT_WORK_TREE",
	"GIT_INDEX_FILE",
	"GIT_OBJECT_DIRECTORY",
	"GIT_ALTERNATE_OBJECT_DIRECTORIES",
	"GIT_CONFIG_GLOBAL",
	"GIT_CONFIG_SYSTEM",
];

describe("slice:create --milestone-id label resolution", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;
	let originalGitEnv: Record<string, string | undefined>;
	let milestoneUuid: string;

	beforeEach(async () => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-slice-create-test-"));
		homeDir = mkdtempSync(path.join(tmpdir(), "tff-home-"));
		originalCwd = process.cwd();
		originalTffCcHome = process.env.TFF_CC_HOME;

		// Save and clear git environment variables to prevent leakage
		originalGitEnv = {};
		for (const key of GIT_ENV_VARS) {
			originalGitEnv[key] = process.env[key];
			delete process.env[key];
		}

		process.env.TFF_CC_HOME = homeDir;
		process.chdir(tmpDir);

		// Initialize minimal git repo (required by milestone/slice creation)
		const gitDir = path.join(tmpDir, ".git");
		mkdirSync(gitDir, { recursive: true });
		mkdirSync(path.join(gitDir, "refs", "heads"), { recursive: true });
		mkdirSync(path.join(gitDir, "objects"), { recursive: true });
		writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n");
		writeFileSync(path.join(gitDir, "config"), "[core]\n\trepositoryformatversion = 0\n");

		// Initialize project
		await projectInitCmd(["--name", "test-project", "--vision", "A test project"]);

		// Create milestone (auto-numbered as M01) and capture its UUID
		const milestoneResult = JSON.parse(await milestoneCreateCmd(["--name", "Test Milestone"]));
		expect(milestoneResult.ok).toBe(true);
		milestoneUuid = milestoneResult.data?.milestone?.id;
		expect(milestoneUuid).toBeDefined();
	});

	afterEach(() => {
		process.chdir(originalCwd);

		if (originalTffCcHome === undefined) {
			delete process.env.TFF_CC_HOME;
		} else {
			process.env.TFF_CC_HOME = originalTffCcHome;
		}

		for (const key of GIT_ENV_VARS) {
			if (originalGitEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = originalGitEnv[key];
			}
		}

		rmSync(tmpDir, { recursive: true, force: true });
		rmSync(homeDir, { recursive: true, force: true });
	});

	it("accepts M-label (M01) and creates slice under the matching milestone UUID", async () => {
		const result = JSON.parse(
			await sliceCreateCmd(["--title", "Label test slice", "--milestone-id", "M01"]),
		);

		expect(result.ok).toBe(true);
		expect(result.data?.slice?.milestoneId).toBe(milestoneUuid);
	});

	it("accepts a UUID directly and creates slice under that milestone (backward compatible)", async () => {
		const result = JSON.parse(
			await sliceCreateCmd(["--title", "UUID test slice", "--milestone-id", milestoneUuid]),
		);

		expect(result.ok).toBe(true);
		expect(result.data?.slice?.milestoneId).toBe(milestoneUuid);
	});

	it("returns NOT_FOUND error when M-label does not match any milestone (M99)", async () => {
		const result = JSON.parse(
			await sliceCreateCmd(["--title", "Missing milestone slice", "--milestone-id", "M99"]),
		);

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("NOT_FOUND");
		expect(result.error.message).toMatch(/M99/);
	});

	it("verifies the milestone UUID in the store matches what the label resolved to", async () => {
		// Double-check via the store that the created slice has the right milestone
		const sliceResult = JSON.parse(
			await sliceCreateCmd(["--title", "Store verify slice", "--milestone-id", "M01"]),
		);
		expect(sliceResult.ok).toBe(true);

		const stores = createClosableStateStores();
		const sliceId = sliceResult.data?.slice?.id;
		const slices = stores.sliceStore.listSlices(milestoneUuid);
		stores.close();

		expect(slices.ok).toBe(true);
		const found = slices.ok && slices.data.find((s) => s.id === sliceId);
		expect(found).toBeTruthy();
	});
});
