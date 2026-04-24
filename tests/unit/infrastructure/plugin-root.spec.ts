import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolvePluginRoot } from "../../../src/infrastructure/plugin-root.js";

describe("resolvePluginRoot", () => {
	let dir: string;
	const ORIGINAL_ENV = process.env.TFF_PLUGIN_ROOT;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "plugin-root-"));
	});
	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
		if (ORIGINAL_ENV === undefined) delete process.env.TFF_PLUGIN_ROOT;
		else process.env.TFF_PLUGIN_ROOT = ORIGINAL_ENV;
	});

	it("returns the env-var path when TFF_PLUGIN_ROOT is set and dir contains commands/", async () => {
		await mkdir(join(dir, "commands"), { recursive: true });
		process.env.TFF_PLUGIN_ROOT = dir;
		expect(resolvePluginRoot()).toBe(dir);
	});

	it("returns the env-var path when TFF_PLUGIN_ROOT is set and dir contains agents/", async () => {
		await mkdir(join(dir, "agents"), { recursive: true });
		process.env.TFF_PLUGIN_ROOT = dir;
		expect(resolvePluginRoot()).toBe(dir);
	});

	it("ignores TFF_PLUGIN_ROOT when the directory is missing", async () => {
		process.env.TFF_PLUGIN_ROOT = join(dir, "does-not-exist");
		// falls through to import.meta.url; in the test context the bundle root
		// isn't a plugin root, so the result is null.
		expect(resolvePluginRoot()).toBeNull();
	});

	it("ignores TFF_PLUGIN_ROOT when the directory has neither commands/ nor agents/", async () => {
		process.env.TFF_PLUGIN_ROOT = dir;
		expect(resolvePluginRoot()).toBeNull();
	});

	it("returns null when neither env-var nor derivation yields a valid plugin root", () => {
		delete process.env.TFF_PLUGIN_ROOT;
		expect(resolvePluginRoot()).toBeNull();
	});
});
