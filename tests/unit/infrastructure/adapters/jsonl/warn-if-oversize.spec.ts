import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { warnIfOversize } from "../../../../../src/infrastructure/adapters/jsonl/warn-if-oversize.js";

describe("warnIfOversize", () => {
	let dir: string;
	let path: string;
	let stderrSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "oversize-"));
		path = join(dir, "big.jsonl");
		stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
	});

	afterEach(async () => {
		stderrSpy.mockRestore();
		await rm(dir, { recursive: true, force: true });
	});

	it("warns when file exceeds threshold", async () => {
		await writeFile(path, "x".repeat(2048), "utf8");
		await warnIfOversize(path, 1024);
		expect(stderrSpy).toHaveBeenCalledTimes(1);
		expect(String(stderrSpy.mock.calls[0][0])).toContain("exceeds");
		expect(String(stderrSpy.mock.calls[0][0])).toContain(path);
	});

	it("does not warn under threshold", async () => {
		await writeFile(path, "x".repeat(100), "utf8");
		await warnIfOversize(path, 1024);
		expect(stderrSpy).not.toHaveBeenCalled();
	});

	it("does not throw on missing file", async () => {
		await expect(warnIfOversize(join(dir, "missing.jsonl"), 1024)).resolves.toBeUndefined();
		expect(stderrSpy).not.toHaveBeenCalled();
	});
});
