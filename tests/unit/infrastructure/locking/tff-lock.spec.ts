import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	acquireRestoreLock,
	acquireSyncLock,
	isLocked,
} from "../../../../src/infrastructure/locking/tff-lock.js";

describe("tff-lock", () => {
	let tmpDir: string;
	let lockTarget: string;

	beforeEach(() => {
		tmpDir = join(os.tmpdir(), `tff-lock-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		mkdirSync(tmpDir, { recursive: true });
		lockTarget = join(tmpDir, "state.db");
		writeFileSync(lockTarget, "data");
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("acquireRestoreLock", () => {
		it("acquires and releases lock", async () => {
			const release = await acquireRestoreLock(lockTarget);
			expect(release).not.toBeNull();
			expect(await isLocked(lockTarget)).toBe(true);
			await release!();
			expect(await isLocked(lockTarget)).toBe(false);
		});

		it("returns null when lock is held and timeout expires", async () => {
			const release = await acquireRestoreLock(lockTarget);
			expect(release).not.toBeNull();
			const second = await acquireRestoreLock(lockTarget, 200);
			expect(second).toBeNull();
			await release!();
		});

		it("allows lock after previous is released", async () => {
			const release1 = await acquireRestoreLock(lockTarget);
			await release1!();
			const release2 = await acquireRestoreLock(lockTarget);
			expect(release2).not.toBeNull();
			await release2!();
		});
	});

	describe("acquireSyncLock", () => {
		it("acquires and releases lock", async () => {
			const release = await acquireSyncLock(lockTarget);
			expect(release).not.toBeNull();
			expect(await isLocked(lockTarget)).toBe(true);
			await release!();
			expect(await isLocked(lockTarget)).toBe(false);
		});

		it("returns null when lock is held and timeout expires", async () => {
			const release = await acquireSyncLock(lockTarget);
			expect(release).not.toBeNull();
			const second = await acquireSyncLock(lockTarget, 200);
			expect(second).toBeNull();
			await release!();
		});

		it("allows lock after previous is released", async () => {
			const release1 = await acquireSyncLock(lockTarget);
			await release1!();
			const release2 = await acquireSyncLock(lockTarget);
			expect(release2).not.toBeNull();
			await release2!();
		});

		it("serializes against acquireRestoreLock on same file", async () => {
			// Acquire lock via restore
			const restoreRelease = await acquireRestoreLock(lockTarget);
			expect(restoreRelease).not.toBeNull();

			// Sync lock should fail (short timeout)
			const syncAttempt = await acquireSyncLock(lockTarget, 200);
			expect(syncAttempt).toBeNull();

			// Release restore lock
			await restoreRelease!();

			// Now sync lock should succeed
			const syncRelease = await acquireSyncLock(lockTarget);
			expect(syncRelease).not.toBeNull();
			await syncRelease!();
		});

		it("allows sync to acquire after sync releases", async () => {
			const release1 = await acquireSyncLock(lockTarget);
			await release1!();
			const release2 = await acquireSyncLock(lockTarget);
			expect(release2).not.toBeNull();
			await release2!();
		});
	});
});
