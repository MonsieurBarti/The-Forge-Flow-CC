import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
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

export const recoverOrphans = async (input: RecoverInput): Promise<RecoverResult> => {
	const nowMs = (input.now ?? Date.now)();
	const threshold = input.thresholdMs ?? DEFAULT_THRESHOLD_MS;
	let cleanedTmps = 0;
	let cleanedLocks = 0;

	for (const dir of input.stagingDirs) {
		if (!existsSync(dir)) continue;
		for (const entry of readdirSync(dir)) {
			if (!entry.endsWith(".tmp")) continue;
			const p = join(dir, entry);
			try {
				const st = statSync(p);
				if (nowMs - st.mtimeMs > threshold) {
					rmSync(p, { force: true });
					cleanedTmps++;
				}
			} catch {
				// skip unreadable entries
			}
		}
	}

	for (const p of input.lockPaths) {
		if (!existsSync(p)) continue;
		try {
			const st = statSync(p);
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
