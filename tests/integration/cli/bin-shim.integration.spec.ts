// tests/integration/cli/bin-shim.integration.spec.ts
//
// Contract test for bin/tff-tools. Claude Code prepends $PLUGIN_ROOT/bin to
// PATH for installed plugins, so this shim makes `tff-tools <cmd>` resolve
// to the bundled CLI. The test locks down two guarantees:
//   1. Direct invocation (absolute path) produces the same help envelope as
//      `node dist/cli/index.js --help`.
//   2. PATH-based resolution works — the shim stays self-locating even when
//      invoked as a bare name through PATH.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SHIM = join(ROOT, "bin/tff-tools");
const CLI = join(ROOT, "dist/cli/index.js");

describe("bin/tff-tools shim", () => {
	it("exists and is executable", () => {
		expect(existsSync(SHIM)).toBe(true);
		const r = spawnSync("test", ["-x", SHIM]);
		expect(r.status).toBe(0);
	});

	it("absolute invocation produces the same --help envelope as node dist/cli/index.js --help", () => {
		const viaShim = spawnSync(SHIM, ["--help"], { encoding: "utf-8", timeout: 30_000 });
		const viaNode = spawnSync("node", [CLI, "--help"], { encoding: "utf-8", timeout: 30_000 });
		expect(viaShim.status).toBe(0);
		expect(viaNode.status).toBe(0);
		expect(JSON.parse(viaShim.stdout)).toEqual(JSON.parse(viaNode.stdout));
	});

	it("forwards arguments and exit status (unknown command yields error envelope)", () => {
		const r = spawnSync(SHIM, ["definitely:not:a:command"], {
			encoding: "utf-8",
			timeout: 30_000,
		});
		expect(r.status).toBe(0);
		const out = JSON.parse(r.stdout);
		expect(out.ok).toBe(false);
		expect(out.error.code).toBe("UNKNOWN_COMMAND");
	});

	it("resolves via PATH when bin/ is prepended — mirrors Claude Code plugin install", () => {
		const binDir = join(ROOT, "bin");
		const r = spawnSync("tff-tools", ["--version"], {
			encoding: "utf-8",
			timeout: 30_000,
			env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ""}` },
		});
		expect(r.status).toBe(0);
		const out = JSON.parse(r.stdout);
		expect(out.ok).toBe(true);
		expect(typeof out.data.version).toBe("string");
	});
});
