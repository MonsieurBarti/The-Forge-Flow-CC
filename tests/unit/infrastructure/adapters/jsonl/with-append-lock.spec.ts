import { access, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withAppendLock } from "../../../../../src/infrastructure/adapters/jsonl/with-append-lock.js";

describe("withAppendLock", () => {
	let dir: string;
	let path: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "append-lock-"));
		path = join(dir, "file.jsonl");
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("acquires and releases the lock around the callback", async () => {
		let callbackRan = false;
		await withAppendLock(path, async () => {
			callbackRan = true;
			// lock file should exist during the callback
			await access(`${path}.lock`);
		});
		expect(callbackRan).toBe(true);
		// lock file should NOT exist after return
		await expect(access(`${path}.lock`)).rejects.toThrow();
	});

	it("releases the lock on callback throw", async () => {
		await expect(
			withAppendLock(path, async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
		await expect(access(`${path}.lock`)).rejects.toThrow();
	});

	it("serializes concurrent callbacks", async () => {
		const order: string[] = [];
		const task = (label: string, ms: number) =>
			withAppendLock(path, async () => {
				order.push(`enter-${label}`);
				await new Promise((r) => setTimeout(r, ms));
				order.push(`exit-${label}`);
			});
		await Promise.all([task("a", 30), task("b", 10)]);
		// whichever acquired first must exit before the other enters
		expect(order).toHaveLength(4);
		const a = order.indexOf("enter-a");
		const b = order.indexOf("enter-b");
		const exitA = order.indexOf("exit-a");
		const exitB = order.indexOf("exit-b");
		if (a < b) {
			expect(exitA).toBeLessThan(b);
		} else {
			expect(exitB).toBeLessThan(a);
		}
	});

	it("times out if lock is held too long", async () => {
		// manually create a stale lock
		await writeFile(`${path}.lock`, "", { flag: "wx" });
		await expect(
			withAppendLock(path, async () => "done", { maxAttempts: 3, retryMs: 5 }),
		).rejects.toThrow(/timeout/);
	});

	it("unlinks a stale lockfile and proceeds within one retry tick", async () => {
		// write a lockfile whose mtime is 30s in the past
		await writeFile(`${path}.lock`, "", { flag: "wx" });
		const past = (Date.now() - 30_000) / 1000; // utimes expects POSIX seconds
		await utimes(`${path}.lock`, past, past);

		const started = Date.now();
		const result = await withAppendLock(
			path,
			async () => "done",
			// staleMs must be less than the 30s age set above so the lockfile is treated as stale
			{ maxAttempts: 5, retryMs: 20, staleMs: 10_000 },
		);
		const elapsed = Date.now() - started;

		expect(result).toBe("done");
		expect(elapsed).toBeLessThan(50); // should complete without any retry sleep
		await expect(access(`${path}.lock`)).rejects.toThrow(); // released cleanly
	});
});
