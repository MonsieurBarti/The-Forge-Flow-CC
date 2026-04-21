import { open, stat, unlink } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

const DEFAULT_MAX_ATTEMPTS = 50;
const DEFAULT_RETRY_MS = 20;
const DEFAULT_STALE_MS = 10_000;

/**
 * Wraps an append operation with an advisory `.lock` file.
 * On contention, retries up to `maxAttempts` times with `retryMs` backoff.
 * If an existing lockfile is older than `staleMs`, it is treated as
 * abandoned: unlinked, then re-acquired immediately (no sleep).
 * Throws a timeout error if the lock is never acquired.
 *
 * Not a distributed lock — only guards against interleaved writes in the
 * same Node process (and best-effort across cooperating processes).
 */
export const withAppendLock = async <T>(
	path: string,
	fn: () => Promise<T>,
	opts: { maxAttempts?: number; retryMs?: number; staleMs?: number } = {},
): Promise<T> => {
	const lockPath = `${path}.lock`;
	const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
	const retryMs = opts.retryMs ?? DEFAULT_RETRY_MS;
	const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;

	let attempts = 0;
	while (true) {
		try {
			const handle = await open(lockPath, "wx");
			await handle.close();
			break;
		} catch (err) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code !== "EEXIST") throw err;

			// Stale detection: if the existing lock is older than staleMs, unlink and retry now.
			try {
				const st = await stat(lockPath);
				if (Date.now() - st.mtimeMs >= staleMs) {
					try {
						await unlink(lockPath);
					} catch (uErr) {
						// Another process may have unlinked it first — that's fine.
						const uCode = (uErr as NodeJS.ErrnoException).code;
						if (uCode !== "ENOENT") throw uErr;
					}
					continue; // retry acquire immediately, no sleep
				}
			} catch (sErr) {
				// Lockfile disappeared between open and stat — retry.
				const sCode = (sErr as NodeJS.ErrnoException).code;
				if (sCode === "ENOENT") continue;
				throw sErr;
			}

			if (++attempts >= maxAttempts) {
				throw new Error(
					`routing: append lock timeout on ${path} (held by another process after ${maxAttempts} attempts)`,
				);
			}
			await sleep(retryMs);
		}
	}

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
