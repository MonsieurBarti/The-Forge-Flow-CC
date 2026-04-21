// src/infrastructure/adapters/sqlite/load-native-binding.ts
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export interface BindingCandidate {
	path: string;
	source: "prebuilt" | "local";
}

/**
 * Ordered candidate iterator for the better_sqlite3 native binding.
 *
 * 1. Platform-tagged prebuilt co-located with dist/ (matches what Stage C
 *    validates on release).
 * 2. Locally-compiled binding under node_modules/better-sqlite3/build/Release/
 *    (activates only in dev or when the prebuilt is missing).
 *
 * Only paths that exist on disk are returned — absent candidates are omitted.
 */
export function getNativeBindingCandidates(dirname?: string): BindingCandidate[] {
	const dir = dirname ?? currentDir;
	const prebuiltFile = `better_sqlite3.${process.platform}-${process.arch}.node`;
	const prebuiltPath = path.join(dir, prebuiltFile);
	const localPath = path.resolve(
		process.cwd(),
		"node_modules",
		"better-sqlite3",
		"build",
		"Release",
		"better_sqlite3.node",
	);

	const out: BindingCandidate[] = [];
	if (existsSync(prebuiltPath)) out.push({ path: prebuiltPath, source: "prebuilt" });
	if (existsSync(localPath)) out.push({ path: localPath, source: "local" });
	return out;
}
