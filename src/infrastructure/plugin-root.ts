import { existsSync, statSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Returns the plugin cache root — the directory containing the bundled
 * `commands/` and `agents/` trees — or null when it can't be determined.
 *
 * Resolution order:
 *   1. `process.env.TFF_PLUGIN_ROOT` (set by bin/tff-tools shim). Validated
 *      so a stale/bogus env var doesn't silently win.
 *   2. Derive from `import.meta.url` when the bundle is running at the
 *      conventional location `<pluginRoot>/dist/cli/index.js`. Source-mode
 *      execution (tests, direct ts-node) does NOT match this layout, so
 *      derivation returns null there — preventing a dogfood repo root from
 *      being mistaken for an installed plugin.
 *   3. null — callers treat this as "project-only lookup".
 */
export function resolvePluginRoot(): string | null {
	const fromEnv = process.env.TFF_PLUGIN_ROOT;
	if (fromEnv && isValidPluginRoot(fromEnv)) return fromEnv;

	try {
		const here = dirname(fileURLToPath(import.meta.url));
		// Only derive when we're running from the bundled CLI layout:
		//   <pluginRoot>/dist/cli/index.js
		if (basename(here) === "cli" && basename(dirname(here)) === "dist") {
			const derived = resolve(here, "..", "..");
			if (isValidPluginRoot(derived)) return derived;
		}
	} catch {
		// import.meta.url unavailable (unusual runtime) — fall through.
	}

	return null;
}

function isValidPluginRoot(dir: string): boolean {
	if (!existsSync(dir)) return false;
	try {
		if (!statSync(dir).isDirectory()) return false;
	} catch {
		return false;
	}
	return existsSync(resolve(dir, "commands")) || existsSync(resolve(dir, "agents"));
}
