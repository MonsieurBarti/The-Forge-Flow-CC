import { mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { recoverOrphans } from "../../../src/application/recovery/recover-orphans.js";

let home: string;

beforeEach(() => {
	home = mkdtempSync(join(tmpdir(), "tff-cycle-"));
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

describe("recoverOrphans against a cyclic symlink tree", () => {
	it("terminates and sweeps stale .tmp files when worktrees/<slice>/.tff-cc cycles back to home", async () => {
		const worktree = join(home, "worktrees", "M01-S01");
		mkdirSync(worktree, { recursive: true });
		symlinkSync(home, join(worktree, ".tff-cc"));

		const staleTmp = join(home, "milestones", "M01", "STATE.md.tmp");
		mkdirSync(join(home, "milestones", "M01"), { recursive: true });
		writeFileSync(staleTmp, "stale");
		const old = Math.floor(Date.now() / 1000) - 600;
		utimesSync(staleTmp, old, old);

		const start = Date.now();
		const result = await recoverOrphans({
			stagingDirs: [home],
			lockPaths: [],
			now: () => Date.now(),
		});
		const elapsed = Date.now() - start;

		expect(elapsed).toBeLessThan(2000);
		expect(result.cleanedTmps).toBe(1);
	});

	it("does not descend through symlinked directories at all", async () => {
		const staleTmp = join(home, "milestones", "STATE.md.tmp");
		mkdirSync(join(home, "milestones"), { recursive: true });
		writeFileSync(staleTmp, "stale");
		const old = Math.floor(Date.now() / 1000) - 600;
		utimesSync(staleTmp, old, old);

		const worktree = join(home, "worktrees", "M01-S01");
		mkdirSync(worktree, { recursive: true });
		symlinkSync(home, join(worktree, ".tff-cc"));

		const result = await recoverOrphans({
			stagingDirs: [home],
			lockPaths: [],
			now: () => Date.now(),
		});
		expect(result.cleanedTmps).toBe(1);
	});
});
