// tests/integration/cli-version-verbose.integration.spec.ts
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI = join(process.cwd(), "dist/cli/index.js");

let repo: string;

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), "tff-verv-"));
	mkdirSync(join(repo, ".tff-cc"), { recursive: true });
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

const runJson = (args: string[]) => {
	const r = spawnSync("node", [CLI, ...args], {
		cwd: repo,
		timeout: 30_000,
		encoding: "utf-8",
	});
	expect(r.status).toBe(0);
	return JSON.parse(r.stdout);
};

describe("tff-tools version --verbose (built CLI)", () => {
	it("version subcommand emits default payload", () => {
		const out = runJson(["version"]);
		expect(out.ok).toBe(true);
		expect(typeof out.data.version).toBe("string");
	});

	it("version --verbose emits full payload with ok lastRecovery", () => {
		const out = runJson(["version", "--verbose"]);
		expect(out.ok).toBe(true);
		expect(out.data.nodeAbi).toBe(process.versions.modules);
		expect(out.data.platform).toBe(process.platform);
		expect(out.data.arch).toBe(process.arch);
		expect(out.data.lastRecovery).toEqual({ status: "ok" });
		expect(out.data.binding === null || typeof out.data.binding.path === "string").toBe(true);
	});

	it("top-level --version shortcut matches 'version' subcommand", () => {
		expect(runJson(["--version"])).toEqual(runJson(["version"]));
	});

	it("top-level -v shortcut matches 'version' subcommand", () => {
		expect(runJson(["-v"])).toEqual(runJson(["version"]));
	});

	it("lastRecovery.status=skipped when marker present", () => {
		const marker = {
			timestamp: "2026-04-21T14:32:07.421Z",
			errorMessage: "prior failure",
			errorStack: "Error: prior failure",
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch,
		};
		writeFileSync(join(repo, ".tff-cc", ".recovery-marker"), JSON.stringify(marker));
		const out = runJson(["version", "--verbose"]);
		expect(out.data.lastRecovery).toEqual({
			status: "skipped",
			timestamp: "2026-04-21T14:32:07.421Z",
			errorMessage: "prior failure",
		});
	});

	it("version --help prints the standard command-help envelope", () => {
		const r = spawnSync("node", [CLI, "version", "--help"], {
			cwd: repo,
			timeout: 30_000,
			encoding: "utf-8",
		});
		expect(r.status).toBe(0);
		const out = JSON.parse(r.stdout);
		expect(out.ok).toBe(true);
		expect(out.data.name).toBe("version");
	});
});
