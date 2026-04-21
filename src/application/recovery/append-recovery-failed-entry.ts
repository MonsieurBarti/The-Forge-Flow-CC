// src/application/recovery/append-recovery-failed-entry.ts
import { appendFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { withAppendLock } from "../../infrastructure/adapters/jsonl/with-append-lock.js";

const RECOVERY_EVENTS_FILE = "recovery-events.jsonl";

interface RecoveryFailedEvent {
	type: "recovery-failed";
	timestamp: string;
	error: string;
	stack: string;
	context: {
		platform: string;
		arch: string;
		nodeVersion: string;
		pid: number;
	};
}

const toEvent = (err: unknown): RecoveryFailedEvent => {
	const e = err instanceof Error ? err : new Error(String(err));
	return {
		type: "recovery-failed",
		timestamp: new Date().toISOString(),
		error: e.message,
		stack: e.stack ?? "",
		context: {
			platform: process.platform,
			arch: process.arch,
			nodeVersion: process.version,
			pid: process.pid,
		},
	};
};

export async function appendRecoveryFailedEntry(homeDir: string, err: unknown): Promise<void> {
	try {
		const st = await stat(homeDir);
		if (!st.isDirectory()) return;
	} catch {
		// .tff-cc/ absent — skip silently per spec.
		return;
	}

	const path = join(homeDir, RECOVERY_EVENTS_FILE);
	try {
		await withAppendLock(path, async () => {
			await appendFile(path, `${JSON.stringify(toEvent(err))}\n`, "utf-8");
		});
	} catch {
		// best-effort; marker + stderr are the unconditional guarantees.
	}
}
