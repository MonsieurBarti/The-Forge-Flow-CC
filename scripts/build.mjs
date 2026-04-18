#!/usr/bin/env node
import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
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

execSync("node scripts/add-cli-shebang.cjs", { cwd: rootDir, stdio: "inherit" });
