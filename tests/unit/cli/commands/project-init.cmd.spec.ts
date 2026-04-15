import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectInitCmd } from "../../../../src/cli/commands/project-init.cmd.js";

describe("project:init — .tff/ auto-creation", () => {
	let tmpDir: string;
	let originalCwd: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-init-test-"));
		originalCwd = process.cwd();
		process.chdir(tmpDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("creates .tff/ directory before opening database", async () => {
		expect(existsSync(path.join(tmpDir, ".tff"))).toBe(false);

		const result = JSON.parse(await projectInitCmd(["test-project", "A test"]));

		expect(result.ok).toBe(true);
		expect(existsSync(path.join(tmpDir, ".tff"))).toBe(true);
		expect(existsSync(path.join(tmpDir, ".tff", "state.db"))).toBe(true);
	});
});
