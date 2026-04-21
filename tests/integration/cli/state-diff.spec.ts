import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("state:diff command", () => {
	let tmpHome: string;
	let originalHome: string | undefined;
	let originalCwd: string;

	beforeEach(() => {
		tmpHome = mkdtempSync(join(tmpdir(), "tff-state-diff-"));
		originalHome = process.env.TFF_CC_HOME;
		originalCwd = process.cwd();
		process.env.TFF_CC_HOME = tmpHome;
	});

	afterEach(() => {
		if (originalHome === undefined) delete process.env.TFF_CC_HOME;
		else process.env.TFF_CC_HOME = originalHome;
		process.chdir(originalCwd);
		rmSync(tmpHome, { recursive: true, force: true });
	});

	it("reports inSync:true immediately after sync:state", async () => {
		const { projectInitCmd } = await import("../../../src/cli/commands/project-init.cmd.js");
		const { milestoneCreateCmd } = await import(
			"../../../src/cli/commands/milestone-create.cmd.js"
		);
		const { syncStateCmd } = await import("../../../src/cli/commands/sync-state.cmd.js");
		const { stateDiffCmd } = await import("../../../src/cli/commands/state-diff.cmd.js");

		// Set up a project in a fresh cwd
		const projectDir = mkdtempSync(join(tmpdir(), "tff-state-diff-proj-"));
		process.chdir(projectDir);

		await projectInitCmd(["--name", "demo"]);
		const createOut = JSON.parse(await milestoneCreateCmd(["--name", "M01"]));
		expect(createOut.ok).toBe(true);
		const milestoneId = createOut.data.milestone.id;

		const syncOut = JSON.parse(await syncStateCmd(["--milestone-id", milestoneId]));
		expect(syncOut.ok).toBe(true);

		const diffOut = JSON.parse(await stateDiffCmd([]));
		expect(diffOut).toEqual({ ok: true, data: { inSync: true } });

		rmSync(projectDir, { recursive: true, force: true });
	});

	it("reports inSync:false with a non-empty diff when STATE.md is hand-edited", async () => {
		const { writeFileSync, readFileSync } = await import("node:fs");
		const { projectInitCmd } = await import("../../../src/cli/commands/project-init.cmd.js");
		const { milestoneCreateCmd } = await import(
			"../../../src/cli/commands/milestone-create.cmd.js"
		);
		const { syncStateCmd } = await import("../../../src/cli/commands/sync-state.cmd.js");
		const { stateDiffCmd } = await import("../../../src/cli/commands/state-diff.cmd.js");

		const projectDir = mkdtempSync(join(tmpdir(), "tff-state-diff-drift-"));
		process.chdir(projectDir);

		await projectInitCmd(["--name", "demo"]);
		const createOut = JSON.parse(await milestoneCreateCmd(["--name", "M01"]));
		const milestoneId = createOut.data.milestone.id;
		await syncStateCmd(["--milestone-id", milestoneId]);

		// Manually corrupt STATE.md
		const stateFile = join(projectDir, ".tff-cc", "STATE.md");
		const original = readFileSync(stateFile, "utf8");
		writeFileSync(stateFile, `${original}\n<!-- hand-edit -->\n`);

		const diffOut = JSON.parse(await stateDiffCmd([]));
		expect(diffOut.ok).toBe(true);
		expect(diffOut.data.inSync).toBe(false);
		expect(typeof diffOut.data.diff).toBe("string");
		expect(diffOut.data.diff).toContain("hand-edit");

		rmSync(projectDir, { recursive: true, force: true });
	});
});
