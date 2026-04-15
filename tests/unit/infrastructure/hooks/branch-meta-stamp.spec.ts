import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	readLocalStamp,
	writeLocalStamp,
	writeSyntheticStamp,
} from "../../../src/infrastructure/branch-meta-stamp.js";

describe("branch-meta-stamp", () => {
	let tffDir: string;
	let tmpBase: string;

	beforeEach(() => {
		tmpBase = join(os.tmpdir(), `tff-stamp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		tffDir = join(tmpBase, ".tff");
		mkdirSync(tffDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(tmpBase, { recursive: true, force: true });
	});

	it("returns null when no stamp exists", () => {
		expect(readLocalStamp(tffDir)).toBeNull();
	});

	it("writes and reads stamp with restoredAt", () => {
		writeLocalStamp(tffDir, {
			stateId: "550e8400-e29b-41d4-a716-446655440000",
			codeBranch: "slice/M01-S05",
			parentStateBranch: "tff-state/milestone/M01",
			createdAt: "2026-04-01T10:00:00Z",
		});
		const stamp = readLocalStamp(tffDir);
		expect(stamp).not.toBeNull();
		expect(stamp!.codeBranch).toBe("slice/M01-S05");
		expect(stamp!.restoredAt).toBeDefined();
		expect(stamp!.stateId).toBe("550e8400-e29b-41d4-a716-446655440000");
	});

	it("writeSyntheticStamp creates valid stamp for unknown state", () => {
		writeSyntheticStamp(tffDir, "some-branch");
		const stamp = readLocalStamp(tffDir);
		expect(stamp).not.toBeNull();
		expect(stamp!.codeBranch).toBe("some-branch");
		expect(stamp!.stateId).toBeDefined();
		expect(stamp!.parentStateBranch).toBeNull();
		expect(stamp!.restoredAt).toBeDefined();
	});

	it("returns null for corrupted stamp file", () => {
		writeFileSync(join(tffDir, "branch-meta.json"), "not json");
		expect(readLocalStamp(tffDir)).toBeNull();
	});
});
