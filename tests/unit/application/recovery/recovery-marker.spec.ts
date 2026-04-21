// tests/unit/application/recovery/recovery-marker.spec.ts
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	clearRecoveryMarker,
	readRecoveryMarker,
	recoveryMarkerExists,
	writeRecoveryMarker,
} from "../../../../src/application/recovery/recovery-marker.js";

let home: string;

beforeEach(() => {
	home = mkdtempSync(join(tmpdir(), "tff-marker-"));
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

describe("recovery-marker", () => {
	it("writes a valid JSON marker with all fields", async () => {
		const err = new Error("boom");
		err.stack = "Error: boom\n    at fakeFrame";
		await writeRecoveryMarker(home, err);
		const raw = readFileSync(join(home, ".recovery-marker"), "utf-8");
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		expect(typeof parsed.timestamp).toBe("string");
		expect(parsed.errorMessage).toBe("boom");
		expect(parsed.errorStack).toContain("fakeFrame");
		expect(parsed.nodeVersion).toBe(process.version);
		expect(parsed.platform).toBe(process.platform);
		expect(parsed.arch).toBe(process.arch);
	});

	it("overwrites a previous marker rather than appending", async () => {
		await writeRecoveryMarker(home, new Error("first"));
		await writeRecoveryMarker(home, new Error("second"));
		const m = await readRecoveryMarker(home);
		expect(m?.errorMessage).toBe("second");
	});

	it("returns null for readRecoveryMarker when the file is absent", async () => {
		expect(await readRecoveryMarker(home)).toBeNull();
	});

	it("returns null for readRecoveryMarker when the file is malformed JSON", async () => {
		writeFileSync(join(home, ".recovery-marker"), "not json{");
		expect(await readRecoveryMarker(home)).toBeNull();
	});

	it("recoveryMarkerExists reports true after write, false after clear", async () => {
		expect(await recoveryMarkerExists(home)).toBe(false);
		await writeRecoveryMarker(home, new Error("x"));
		expect(await recoveryMarkerExists(home)).toBe(true);
		await clearRecoveryMarker(home);
		expect(await recoveryMarkerExists(home)).toBe(false);
		expect(existsSync(join(home, ".recovery-marker"))).toBe(false);
	});

	it("clearRecoveryMarker is idempotent when the file is absent", async () => {
		await expect(clearRecoveryMarker(home)).resolves.toBeUndefined();
	});

	it("createes the home directory if it does not exist before write", async () => {
		rmSync(home, { recursive: true, force: true });
		await writeRecoveryMarker(home, new Error("y"));
		expect(await recoveryMarkerExists(home)).toBe(true);
	});
});
