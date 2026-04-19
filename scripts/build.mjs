#!/usr/bin/env node
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distCliDir = resolve(rootDir, "dist", "cli");
const pkg = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8"));

mkdirSync(distCliDir, { recursive: true });

await build({
	entryPoints: [resolve(rootDir, "src/cli/index.ts")],
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node20",
	outfile: resolve(distCliDir, "index.js"),
	external: [],
	define: {
		__TFF_VERSION__: JSON.stringify(pkg.version),
	},
	banner: {
		js: 'import{createRequire as _tffCreateRequire}from"module";const require=_tffCreateRequire(import.meta.url);',
	},
	logLevel: "info",
});

const nativeDir = resolve(rootDir, "native");
for (const file of readdirSync(nativeDir).filter((f) => f.endsWith(".node"))) {
	copyFileSync(resolve(nativeDir, file), resolve(distCliDir, file));
}

// Prefer the locally-compiled better-sqlite3 binding for the CURRENT platform
// over the checked-in prebuilt one. The checked-in binding in native/ may have
// been built against a different Node ABI than the one currently running
// (e.g. CI on Node 20 vs. local machine on Node 22). Using the locally-compiled
// binding when available guarantees the ABI matches the current Node.
const localBinding = resolve(rootDir, "node_modules/better-sqlite3/build/Release/better_sqlite3.node");
if (existsSync(localBinding)) {
	const suffix =
		process.platform === "linux" && process.arch === "x64" ? "linux-x64" :
		process.platform === "linux" && process.arch === "arm64" ? "linux-arm64" :
		process.platform === "darwin" && process.arch === "arm64" ? "darwin-arm64" :
		process.platform === "darwin" && process.arch === "x64" ? "darwin-x64" :
		process.platform === "win32" && process.arch === "x64" ? "win32-x64" :
		null;
	if (suffix) {
		copyFileSync(localBinding, resolve(distCliDir, `better_sqlite3.${suffix}.node`));
	}
}

execSync("node scripts/add-cli-shebang.cjs", { cwd: rootDir, stdio: "inherit" });
