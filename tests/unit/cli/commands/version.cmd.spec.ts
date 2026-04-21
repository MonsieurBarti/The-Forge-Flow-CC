// tests/unit/cli/commands/version.cmd.spec.ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { versionCmd, versionSchema } from "../../../../src/cli/commands/version.cmd.js";

let repo: string;

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), "tff-ver-"));
	vi.spyOn(process, "cwd").mockReturnValue(repo);
});
afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
	vi.restoreAllMocks();
});

describe("versionCmd", () => {
	it("schema declares version command with optional verbose flag", () => {
		expect(versionSchema.name).toBe("version");
		const names = [...versionSchema.requiredFlags, ...versionSchema.optionalFlags].map(
			(f) => f.name,
		);
		expect(names).toContain("verbose");
	});

	it("default output returns { ok, data: { version } }", async () => {
		const out = JSON.parse(await versionCmd([]));
		expect(out.ok).toBe(true);
		expect(typeof out.data.version).toBe("string");
		expect(out.data.binding).toBeUndefined();
	});

	it("verbose output includes binding, nodeAbi, platform, arch, lastRecovery", async () => {
		const out = JSON.parse(await versionCmd(["--verbose"]));
		expect(out.ok).toBe(true);
		expect(out.data.nodeAbi).toBe(process.versions.modules);
		expect(out.data.platform).toBe(process.platform);
		expect(out.data.arch).toBe(process.arch);
		expect(out.data.lastRecovery).toEqual({ status: "ok" });
		// binding is either an object or null (never missing in verbose mode)
		expect(out.data.binding === null || typeof out.data.binding.path === "string").toBe(true);
	});

	it("verbose output with marker present reports lastRecovery.status=skipped", async () => {
		mkdirSync(join(repo, ".tff-cc"), { recursive: true });
		const marker = {
			timestamp: "2026-04-21T14:32:07.421Z",
			errorMessage: "prior failure",
			errorStack: "Error: prior failure",
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch,
		};
		writeFileSync(join(repo, ".tff-cc", ".recovery-marker"), JSON.stringify(marker));
		const out = JSON.parse(await versionCmd(["--verbose"]));
		expect(out.data.lastRecovery).toEqual({
			status: "skipped",
			timestamp: "2026-04-21T14:32:07.421Z",
			errorMessage: "prior failure",
		});
	});

	it("verbose output reports binding: null when native binding fails to load", async () => {
		const open = await import("../../../../src/infrastructure/adapters/sqlite/open-database.js");
		const { NativeBindingError } = await import(
			"../../../../src/infrastructure/adapters/sqlite/native-binding-error.js"
		);
		const spy = vi.spyOn(open, "openDatabaseWithTrace").mockImplementation(() => {
			throw new NativeBindingError({
				platform: process.platform,
				arch: process.arch,
				nodeAbi: process.versions.modules,
				candidates: [],
			});
		});
		const out = JSON.parse(await versionCmd(["--verbose"]));
		expect(out.ok).toBe(true);
		expect(out.data.binding).toBeNull();
		spy.mockRestore();
	});
});
