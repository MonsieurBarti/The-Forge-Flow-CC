import { open, unlink } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

const DEFAULT_MAX_ATTEMPTS = 50;
const DEFAULT_RETRY_MS = 20;

/**
 * Wraps an append operation with an advisory `.lock` file.
 * On contention, retries up to `maxAttempts` times with `retryMs` backoff.
 * Throws a timeout error if the lock is never acquired.
 *
 * Not a distributed lock — only guards against interleaved writes in the
 * same Node process (and best-effort across cooperating processes).
 */
export const withAppendLock = async <T>(
	path: string,
	fn: () => Promise<T>,
	opts: { maxAttempts?: number; retryMs?: number } = {},
): Promise<T> => {
	const lockPath = `${path}.lock`;
	const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
	const retryMs = opts.retryMs ?? DEFAULT_RETRY_MS;

	let attempts = 0;
	// Acquire
	while (true) {
		try {
			const handle = await open(lockPath, "wx");
			await handle.close();
			break;
		} catch (err) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code !== "EEXIST") throw err;
			if (++attempts >= maxAttempts) {
				throw new Error(
					`routing: append lock timeout on ${path} (held by another process after ${maxAttempts} attempts)`,
				);
			}
			await sleep(retryMs);
		}
	}

	// Release in finally
	try {
		return await fn();
	} finally {
		try {
			await unlink(lockPath);
		} catch (_err) {
			// best-effort; if the lock file was removed externally, that's fine
		}
	}
};
