import { existsSync, lstatSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";

export interface RecoverInput {
	stagingDirs: string[];
	lockPaths: string[];
	now?: () => number;
	thresholdMs?: number;
}

export interface RecoverResult {
	cleanedTmps: number;
	cleanedLocks: number;
}

const DEFAULT_THRESHOLD_MS = 5 * 60 * 1000;
// Defensive ceiling — even without cycles, a runaway tree shouldn't consume
// unbounded memory during startup recovery. 100k dirs is far beyond any real
// project home and well below Node's default heap.
const MAX_DIRS_VISITED = 100_000;

export const recoverOrphans = async (input: RecoverInput): Promise<RecoverResult> => {
	const nowMs = (input.now ?? Date.now)();
	const threshold = input.thresholdMs ?? DEFAULT_THRESHOLD_MS;
	let cleanedTmps = 0;
	let cleanedLocks = 0;

	for (const dir of input.stagingDirs) {
		if (!existsSync(dir)) continue;
		cleanedTmps += sweepStaleTmps(dir, nowMs, threshold);
	}

	for (const p of input.lockPaths) {
		if (!existsSync(p)) continue;
		try {
			// Lock paths may legitimately be a directory (proper-lockfile) or a
			// plain file; either way, use lstat so a symlinked lock can't trick
			// us into deleting outside the intended tree.
			const st = lstatSync(p);
			if (st.isSymbolicLink()) continue;
			if (nowMs - st.mtimeMs > threshold) {
				rmSync(p, { recursive: true, force: true });
				cleanedLocks++;
			}
		} catch {
			// skip
		}
	}

	return { cleanedTmps, cleanedLocks };
};

function sweepStaleTmps(root: string, nowMs: number, thresholdMs: number): number {
	let cleaned = 0;
	const visited = new Set<string>();
	try {
		visited.add(realpathSync(root));
	} catch {
		return 0;
	}

	const stack: string[] = [root];

	while (stack.length > 0) {
		if (visited.size > MAX_DIRS_VISITED) break;
		const current = stack.pop();
		if (current === undefined) break;

		let entries: import("node:fs").Dirent[];
		try {
			entries = readdirSync(current, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of entries) {
			const p = join(current, entry.name);

			if (entry.isSymbolicLink()) {
				// Never descend into symlinked entries. This is the cycle break.
				continue;
			}

			if (entry.isDirectory()) {
				let real: string;
				try {
					real = realpathSync(p);
				} catch {
					continue;
				}
				if (visited.has(real)) continue;
				visited.add(real);
				stack.push(p);
				continue;
			}

			if (!entry.isFile()) continue;
			if (!entry.name.endsWith(".tmp")) continue;

			try {
				const st = lstatSync(p);
				if (!st.isFile()) continue;
				if (nowMs - st.mtimeMs > thresholdMs) {
					rmSync(p, { force: true });
					cleaned++;
				}
			} catch {
				// skip unreadable entries
			}
		}
	}

	return cleaned;
}
