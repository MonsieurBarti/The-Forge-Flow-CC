import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	archiveMilestoneFs,
	archiveSliceFs,
} from "../../../../src/application/archive/archive-fs.js";
import type { Milestone } from "../../../../src/domain/entities/milestone.js";
import type { Slice } from "../../../../src/domain/entities/slice.js";

const sliceFixture = (overrides: Partial<Slice> = {}): Slice => ({
	id: "11111111-1111-4111-8111-111111111111",
	kind: "quick",
	number: 1,
	title: "T",
	status: "discussing",
	createdAt: new Date(),
	...overrides,
});

const milestoneFixture = (overrides: Partial<Milestone> = {}): Milestone => ({
	id: "22222222-2222-4222-8222-222222222222",
	projectId: "p",
	name: "M",
	number: 1,
	status: "open",
	branch: "milestone/22222222",
	createdAt: new Date(),
	...overrides,
});

describe("archive-fs", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "tff-archive-fs-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	describe("archiveSliceFs (quick)", () => {
		it("moves .tff-cc/quick/Q-01 to .tff-cc/archive/quick/Q-01", () => {
			const slice = sliceFixture({ kind: "quick", number: 1 });
			const src = join(cwd, ".tff-cc/quick/Q-01");
			mkdirSync(src, { recursive: true });
			writeFileSync(join(src, "PLAN.md"), "plan");

			const result = archiveSliceFs(slice, cwd);

			expect(result.ok).toBe(true);
			expect(existsSync(src)).toBe(false);
			const dst = join(cwd, ".tff-cc/archive/quick/Q-01");
			expect(existsSync(dst)).toBe(true);
			expect(existsSync(join(dst, "PLAN.md"))).toBe(true);
		});

		it("is idempotent when src is missing AND dst already exists", () => {
			const slice = sliceFixture({ kind: "quick", number: 7 });
			const dst = join(cwd, ".tff-cc/archive/quick/Q-07");
			mkdirSync(dst, { recursive: true });
			writeFileSync(join(dst, "PLAN.md"), "already archived");

			const result = archiveSliceFs(slice, cwd);

			expect(result.ok).toBe(true);
			expect(existsSync(dst)).toBe(true);
		});

		it("returns ok when neither src nor dst exists (nothing to do)", () => {
			const slice = sliceFixture({ kind: "quick", number: 99 });
			const result = archiveSliceFs(slice, cwd);
			expect(result.ok).toBe(true);
		});

		it("returns error when both src and dst exist", () => {
			const slice = sliceFixture({ kind: "quick", number: 3 });
			mkdirSync(join(cwd, ".tff-cc/quick/Q-03"), { recursive: true });
			mkdirSync(join(cwd, ".tff-cc/archive/quick/Q-03"), { recursive: true });

			const result = archiveSliceFs(slice, cwd);

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("destination already exists");
		});
	});

	describe("archiveSliceFs (debug)", () => {
		it("moves .tff-cc/debug/D-02 to .tff-cc/archive/debug/D-02", () => {
			const slice = sliceFixture({ kind: "debug", number: 2 });
			const src = join(cwd, ".tff-cc/debug/D-02");
			mkdirSync(src, { recursive: true });
			writeFileSync(join(src, "REPRO.md"), "repro");

			const result = archiveSliceFs(slice, cwd);

			expect(result.ok).toBe(true);
			expect(existsSync(src)).toBe(false);
			expect(existsSync(join(cwd, ".tff-cc/archive/debug/D-02"))).toBe(true);
		});
	});

	describe("archiveSliceFs (milestone)", () => {
		it("rejects milestone-kind slices with a clear reason", () => {
			const slice = sliceFixture({ kind: "milestone", number: 1, milestoneId: "m" });
			const result = archiveSliceFs(slice, cwd);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toContain("milestone");
		});
	});

	describe("archiveMilestoneFs", () => {
		it("moves .tff-cc/milestones/M01 to .tff-cc/archive/milestones/M01", () => {
			const ms = milestoneFixture({ number: 1 });
			const src = join(cwd, ".tff-cc/milestones/M01");
			mkdirSync(src, { recursive: true });
			writeFileSync(join(src, "PLAN.md"), "plan");

			const result = archiveMilestoneFs(ms, cwd);

			expect(result.ok).toBe(true);
			expect(existsSync(src)).toBe(false);
			const dst = join(cwd, ".tff-cc/archive/milestones/M01");
			expect(existsSync(dst)).toBe(true);
			expect(existsSync(join(dst, "PLAN.md"))).toBe(true);
		});

		it("is idempotent when src is missing AND dst already exists", () => {
			const ms = milestoneFixture({ number: 5 });
			mkdirSync(join(cwd, ".tff-cc/archive/milestones/M05"), { recursive: true });

			const result = archiveMilestoneFs(ms, cwd);

			expect(result.ok).toBe(true);
		});

		it("returns error when both src and dst exist", () => {
			const ms = milestoneFixture({ number: 1 });
			mkdirSync(join(cwd, ".tff-cc/milestones/M01"), { recursive: true });
			mkdirSync(join(cwd, ".tff-cc/archive/milestones/M01"), { recursive: true });

			const result = archiveMilestoneFs(ms, cwd);

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("destination already exists");
		});
	});
});
