import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { SliceSpecFsReader } from "../../../../../src/infrastructure/adapters/filesystem/slice-spec-fs-reader.js";
import { isOk } from "../../../../../src/domain/result.js";

describe("SliceSpecFsReader", () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "tff-phase-e-spec-"));
	});

	it("reads SPEC.md from the slice directory", async () => {
		const dir = join(root, ".tff-cc", "milestones", "M01", "S02-auth-flow");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "SPEC.md"), "# auth flow spec\n\nbody", "utf8");
		const reader = new SliceSpecFsReader({ projectRoot: root });
		const res = await reader.readSpec("M01-S02", 1024);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.text).toBe("# auth flow spec\n\nbody");
		expect(res.data.missing).toBe(false);
		expect(res.data.truncated).toBe(false);
	});

	it("returns missing=true when no slice directory exists", async () => {
		const reader = new SliceSpecFsReader({ projectRoot: root });
		const res = await reader.readSpec("M99-S99", 1024);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.missing).toBe(true);
		expect(res.data.text).toBe("");
	});

	it("truncates text larger than maxBytes and marks truncated=true", async () => {
		const dir = join(root, ".tff-cc", "milestones", "M01", "S02-long");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "SPEC.md"), "x".repeat(500), "utf8");
		const reader = new SliceSpecFsReader({ projectRoot: root });
		const res = await reader.readSpec("M01-S02", 100);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.text.length).toBeLessThanOrEqual(100 + 64);
		expect(res.data.truncated).toBe(true);
	});
});
