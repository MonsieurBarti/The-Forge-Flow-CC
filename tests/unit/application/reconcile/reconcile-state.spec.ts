import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
});
