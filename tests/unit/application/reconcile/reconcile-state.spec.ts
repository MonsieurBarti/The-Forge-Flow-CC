import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reconcileState } from "../../../../src/application/reconcile/reconcile-state.js";

describe("reconcileState", () => {
	let tmpDir: string;
	let stateMdPath: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "reconcile-state-test-"));
		stateMdPath = join(tmpDir, "STATE.md");
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("returns noop when STATE.md content matches renderer output", async () => {
		const content = "consistent content";
		writeFileSync(stateMdPath, content);
		const renderStateMd = vi.fn().mockResolvedValue(content);

		const result = await reconcileState({ stateMdPath, renderStateMd });

		expect(result.action).toBe("noop");
		expect(renderStateMd).toHaveBeenCalledOnce();
		// File must remain untouched
		expect(readFileSync(stateMdPath, "utf8")).toBe(content);
	});

	it("regenerates when STATE.md content does not match renderer output", async () => {
		const oldContent = "old content";
		const newContent = "new content";
		writeFileSync(stateMdPath, oldContent);
		const renderStateMd = vi.fn().mockResolvedValue(newContent);

		const result = await reconcileState({ stateMdPath, renderStateMd });

		expect(result.action).toBe("regenerated");
		expect(readFileSync(stateMdPath, "utf8")).toBe(newContent);
	});

	it("is idempotent: second back-to-back call is a noop after first regeneration", async () => {
		const oldContent = "old content";
		const newContent = "new content";
		writeFileSync(stateMdPath, oldContent);
		const renderStateMd = vi.fn().mockResolvedValue(newContent);

		const first = await reconcileState({ stateMdPath, renderStateMd });
		const second = await reconcileState({ stateMdPath, renderStateMd });

		expect(first.action).toBe("regenerated");
		expect(second.action).toBe("noop");
		expect(readFileSync(stateMdPath, "utf8")).toBe(newContent);
	});

	it("returns render-failed and leaves file untouched when renderer throws", async () => {
		const existingContent = "existing content";
		writeFileSync(stateMdPath, existingContent);
		const renderStateMd = vi.fn().mockRejectedValue(new Error("render error"));

		const result = await reconcileState({ stateMdPath, renderStateMd });

		expect(result.action).toBe("render-failed");
		expect(readFileSync(stateMdPath, "utf8")).toBe(existingContent);
	});

	it("returns missing-regenerated when STATE.md does not exist and write succeeds", async () => {
		// stateMdPath doesn't exist yet — this is the "missing" case
		expect(existsSync(stateMdPath)).toBe(false);
		const content = "new content";
		const renderStateMd = vi.fn().mockResolvedValue(content);

		const result = await reconcileState({ stateMdPath, renderStateMd });

		expect(result.action).toBe("missing-regenerated");
		expect(existsSync(stateMdPath)).toBe(true);
		expect(readFileSync(stateMdPath, "utf8")).toBe(content);
	});

	it("leaves no stale .tmp behind when the atomic write fails", async () => {
		// Point stateMdPath inside a non-existent directory to force writeFileSync
		// (during atomic staging) to throw. The helper must not leak a .tmp.
		const missingDir = join(tmpDir, "does-not-exist");
		const badPath = join(missingDir, "STATE.md");
		const renderStateMd = vi.fn().mockResolvedValue("new content");

		const result = await reconcileState({ stateMdPath: badPath, renderStateMd });

		expect(result.action).toBe("render-failed");
		expect(existsSync(`${badPath}.tmp`)).toBe(false);
		expect(existsSync(badPath)).toBe(false);
	});

	it("returns render-failed when file exists with drifted content but atomic write fails", async () => {
		// Write existing content, then make the directory read-only so
		// the tmp staging write throws → exercises lines 70-73 in reconcile-state.ts
		const oldContent = "old drifted content";
		const newContent = "new different content";
		writeFileSync(stateMdPath, oldContent);
		chmodSync(tmpDir, 0o555); // read + execute, no write
		const renderStateMd = vi.fn().mockResolvedValue(newContent);

		let result: { action: string };
		try {
			result = await reconcileState({ stateMdPath, renderStateMd });
		} finally {
			chmodSync(tmpDir, 0o755); // restore so afterEach rmSync can clean up
		}

		expect(result!.action).toBe("render-failed");
		// Original file must be untouched (we couldn't write)
		expect(readFileSync(stateMdPath, "utf8")).toBe(oldContent);
	});
});
