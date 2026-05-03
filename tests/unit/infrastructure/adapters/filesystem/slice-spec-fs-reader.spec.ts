import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { isOk } from "../../../../../src/domain/result.js";
import { SliceSpecFsReader } from "../../../../../src/infrastructure/adapters/filesystem/slice-spec-fs-reader.js";

describe("SliceSpecFsReader", () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "tff-spec-reader-"));
	});

	it("reads SPEC.md from a milestone-bound slice directory", async () => {
		// Layout matches what slice:create writes:
		//   .tff-cc/milestones/M01/slices/M01-S02/SPEC.md
		const dir = join(root, ".tff-cc", "milestones", "M01", "slices", "M01-S02");
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

	it("reads SPEC.md from a quick slice directory", async () => {
		const dir = join(root, ".tff-cc", "quick", "Q-01");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "SPEC.md"), "# quick spec", "utf8");

		const reader = new SliceSpecFsReader({ projectRoot: root });
		const res = await reader.readSpec("Q-01", 1024);

		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.text).toBe("# quick spec");
		expect(res.data.missing).toBe(false);
	});

	it("reads SPEC.md from a debug slice directory", async () => {
		const dir = join(root, ".tff-cc", "debug", "D-03");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "SPEC.md"), "# debug spec", "utf8");

		const reader = new SliceSpecFsReader({ projectRoot: root });
		const res = await reader.readSpec("D-03", 1024);

		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.text).toBe("# debug spec");
		expect(res.data.missing).toBe(false);
	});

	it("returns Err for an unparsable slice label", async () => {
		const reader = new SliceSpecFsReader({ projectRoot: root });
		const res = await reader.readSpec("not-valid!!", 1024);
		expect(isOk(res)).toBe(false);
		if (isOk(res)) throw new Error("expected error");
		expect(res.error.code).toBe("VALIDATION_ERROR");
	});

	it("returns missing=true when the slice directory does not exist", async () => {
		const reader = new SliceSpecFsReader({ projectRoot: root });
		const res = await reader.readSpec("M99-S99", 1024);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.missing).toBe(true);
		expect(res.data.text).toBe("");
	});

	it("returns missing=true when the slice dir exists but SPEC.md is absent", async () => {
		const dir = join(root, ".tff-cc", "milestones", "M01", "slices", "M01-S02");
		mkdirSync(dir, { recursive: true });

		const reader = new SliceSpecFsReader({ projectRoot: root });
		const res = await reader.readSpec("M01-S02", 1024);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.missing).toBe(true);
		expect(res.data.text).toBe("");
	});

	it("truncates text larger than maxBytes and marks truncated=true", async () => {
		const dir = join(root, ".tff-cc", "milestones", "M01", "slices", "M01-S02");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "SPEC.md"), "x".repeat(500), "utf8");

		const reader = new SliceSpecFsReader({ projectRoot: root });
		const res = await reader.readSpec("M01-S02", 100);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.text.length).toBeLessThanOrEqual(100 + 64);
		expect(res.data.truncated).toBe(true);
	});
});
