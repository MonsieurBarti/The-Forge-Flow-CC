import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectInitCmd } from "../../../../src/cli/commands/project-init.cmd.js";

describe("project:init — .tff-cc/ auto-creation", () => {
	let tmpDir: string;
	let homeDir: string;
	let originalCwd: string;
	let originalTffCcHome: string | undefined;

	beforeEach(() => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-init-test-"));
		homeDir = mkdtempSync(path.join(tmpdir(), "tff-home-"));
		originalCwd = process.cwd();
		originalTffCcHome = process.env.TFF_CC_HOME;
		process.env.TFF_CC_HOME = homeDir;
		process.chdir(tmpDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (originalTffCcHome === undefined) {
			delete process.env.TFF_CC_HOME;
		} else {
			process.env.TFF_CC_HOME = originalTffCcHome;
		}
		rmSync(tmpDir, { recursive: true, force: true });
		rmSync(homeDir, { recursive: true, force: true });
	});

	it("creates .tff-cc/ directory before opening database", async () => {
		expect(existsSync(path.join(tmpDir, ".tff-cc"))).toBe(false);

		const result = JSON.parse(
			await projectInitCmd(["--name", "test-project", "--vision", "A test"]),
		);

		expect(result.ok).toBe(true);
		// .tff-cc/ is created for artifacts
		expect(existsSync(path.join(tmpDir, ".tff-cc"))).toBe(true);
		// Project ID file is created
		expect(existsSync(path.join(tmpDir, ".tff-project-id"))).toBe(true);

		// Read project ID to find home directory
		const projectId = readFileSync(path.join(tmpDir, ".tff-project-id"), "utf-8").trim();
		// Database is in home directory
		expect(existsSync(path.join(homeDir, projectId, "state.db"))).toBe(true);
	});

	it("returns error JSON when required --name flag is missing", async () => {
		const result = JSON.parse(await projectInitCmd([]));
		expect(result.ok).toBe(false);
	});

	it("returns error JSON when project already exists (PROJECT_EXISTS)", async () => {
		// Init twice to trigger PROJECT_EXISTS
		await projectInitCmd(["--name", "test-project"]);
		const result = JSON.parse(await projectInitCmd(["--name", "test-project"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PROJECT_EXISTS");
	});
});
