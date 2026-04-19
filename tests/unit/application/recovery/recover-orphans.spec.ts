import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { recoverOrphans } from "../../../../src/application/recovery/recover-orphans.js";

function makeStale(p: string): void {
	const t = new Date(Math.floor(Date.now() / 1000) * 1000 - 600_000);
	utimesSync(p, t, t);
}

describe("recoverOrphans", () => {
	let stagingDir: string;
	let lockDir: string;

	beforeEach(() => {
		stagingDir = mkdtempSync(join(tmpdir(), "tff-staging-"));
		lockDir = mkdtempSync(join(tmpdir(), "tff-locks-"));
	});

	afterEach(() => {
		rmSync(stagingDir, { recursive: true, force: true });
		rmSync(lockDir, { recursive: true, force: true });
	});

	it("removes stale .tmp files and leaves fresh ones", async () => {
		const staleTmp = join(stagingDir, "old.tmp");
		const freshTmp = join(stagingDir, "new.tmp");
		const nonTmp = join(stagingDir, "keep.txt");

		writeFileSync(staleTmp, "stale");
		makeStale(staleTmp);

		writeFileSync(freshTmp, "fresh");
		writeFileSync(nonTmp, "not a tmp");

		const result = await recoverOrphans({
			stagingDirs: [stagingDir],
			lockPaths: [],
		});

		expect(result.cleanedTmps).toBe(1);
		expect(result.cleanedLocks).toBe(0);

		// stale removed, fresh and non-tmp kept
		expect(existsSync(staleTmp)).toBe(false);
		expect(existsSync(freshTmp)).toBe(true);
		expect(existsSync(nonTmp)).toBe(true);
	});

	it("removes stale lockfiles (dir-style) and leaves fresh ones", async () => {
		const staleLock = join(lockDir, "stale.lock");
		const freshLock = join(lockDir, "fresh.lock");

		mkdirSync(staleLock);
		makeStale(staleLock);

		mkdirSync(freshLock);

		const result = await recoverOrphans({
			stagingDirs: [],
			lockPaths: [staleLock, freshLock],
		});

		expect(result.cleanedLocks).toBe(1);
		expect(result.cleanedTmps).toBe(0);
	});

	it("preserves fresh entries (both tmp and lock)", async () => {
		const freshTmp = join(stagingDir, "fresh.tmp");
		const freshLock = join(lockDir, "fresh.lock");

		writeFileSync(freshTmp, "fresh");
		mkdirSync(freshLock);

		const result = await recoverOrphans({
			stagingDirs: [stagingDir],
			lockPaths: [freshLock],
		});

		expect(result.cleanedTmps).toBe(0);
		expect(result.cleanedLocks).toBe(0);
	});

	it("removes stale .tmp files in subdirectories", async () => {
		const subDir = join(stagingDir, "milestones", "M01", "slices", "M01-S01");
		mkdirSync(subDir, { recursive: true });
		const staleTmp = join(subDir, "PLAN.md.tmp");
		writeFileSync(staleTmp, "stale");
		makeStale(staleTmp);

		const result = await recoverOrphans({
			stagingDirs: [stagingDir],
			lockPaths: [],
		});

		expect(result.cleanedTmps).toBe(1);
		expect(existsSync(staleTmp)).toBe(false);
	});

	it("is idempotent: second run yields zero cleanups", async () => {
		const staleTmp = join(stagingDir, "old.tmp");
		const staleLock = join(lockDir, "stale.lock");

		writeFileSync(staleTmp, "stale");
		makeStale(staleTmp);

		mkdirSync(staleLock);
		makeStale(staleLock);

		const first = await recoverOrphans({
			stagingDirs: [stagingDir],
			lockPaths: [staleLock],
		});

		expect(first.cleanedTmps).toBe(1);
		expect(first.cleanedLocks).toBe(1);

		const second = await recoverOrphans({
			stagingDirs: [stagingDir],
			lockPaths: [staleLock],
		});

		expect(second.cleanedTmps).toBe(0);
		expect(second.cleanedLocks).toBe(0);
	});
});
