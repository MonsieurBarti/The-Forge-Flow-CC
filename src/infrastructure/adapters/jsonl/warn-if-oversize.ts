import { stat } from "node:fs/promises";

const DEFAULT_WARN_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Emits a one-line stderr warning if `path` exists and is larger than
 * `thresholdBytes`. Called opportunistically by writers — never throws
 * and does not slow the write path.
 */
export const warnIfOversize = async (
	path: string,
	thresholdBytes: number = DEFAULT_WARN_BYTES,
): Promise<void> => {
	try {
		const s = await stat(path);
		if (s.isFile() && s.size > thresholdBytes) {
			process.stderr.write(
				`routing: log file exceeds ${(thresholdBytes / 1024 / 1024).toFixed(0)} MB — consider archiving: ${path} (${s.size} bytes)\n`,
			);
		}
	} catch {
		// file doesn't exist yet — nothing to warn about
	}
};
