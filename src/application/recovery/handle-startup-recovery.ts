// src/application/recovery/handle-startup-recovery.ts

import { appendRecoveryFailedEntry } from "./append-recovery-failed-entry.js";
import type { RecoverResult } from "./recover-orphans.js";
import { recoverOrphans as defaultRecover } from "./recover-orphans.js";
import { recoveryMarkerExists, writeRecoveryMarker } from "./recovery-marker.js";

const WARNING = "tff: orphan recovery skipped — run /tff:health to diagnose\n";

export interface HandleStartupRecoveryInput {
	homeDir: string;
	recover?: () => Promise<RecoverResult>;
}

export interface HandleStartupRecoveryResult {
	threw: boolean;
	result?: RecoverResult;
}

export async function handleStartupRecovery(
	input: HandleStartupRecoveryInput,
): Promise<HandleStartupRecoveryResult> {
	const recover =
		input.recover ?? (() => defaultRecover({ stagingDirs: [input.homeDir], lockPaths: [] }));

	try {
		const result = await recover();
		if (result.cleanedTmps + result.cleanedLocks > 0) {
			process.stderr.write(
				`recovered ${result.cleanedTmps} stale tmp files, ${result.cleanedLocks} stale locks\n`,
			);
		}
		if (await recoveryMarkerExists(input.homeDir)) {
			process.stderr.write(WARNING);
		}
		return { threw: false, result };
	} catch (err) {
		try {
			await writeRecoveryMarker(input.homeDir, err);
		} catch {
			// marker write is best-effort; stderr below is the unconditional guarantee.
		}
		// appendRecoveryFailedEntry is contractually non-throwing (swallows its own
		// errors); the stderr write below is therefore the unconditional guarantee.
		await appendRecoveryFailedEntry(input.homeDir, err);
		process.stderr.write(WARNING);
		return { threw: true };
	}
}
