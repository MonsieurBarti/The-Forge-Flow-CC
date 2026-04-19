import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { tffDebug } from "../../infrastructure/adapters/logging/warn.js";

export interface ReconcileInput {
	stateMdPath: string;
	renderStateMd: () => Promise<string>;
}

export type ReconcileAction = "noop" | "regenerated" | "render-failed" | "missing-regenerated";

export interface ReconcileResult {
	action: ReconcileAction;
}

const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

/**
 * Write `content` atomically: stage to `${finalPath}.tmp`, then rename. If any
 * step fails, attempt to unlink the tmp so stale staging files never leak.
 * Returns true on success.
 */
const atomicWrite = (finalPath: string, content: string): boolean => {
	const tmp = `${finalPath}.tmp`;
	try {
		writeFileSync(tmp, content);
		renameSync(tmp, finalPath);
		return true;
	} catch {
		try {
			if (existsSync(tmp)) unlinkSync(tmp);
		} catch {
			// best-effort
		}
		return false;
	}
};

/**
 * Reconciles STATE.md against a DB-derived render. If the rendered checksum
 * matches the on-disk file, noop. Otherwise regenerates in place via an
 * atomic tmp+rename. Renderer failures are swallowed: the read path must
 * remain non-fatal.
 */
export const reconcileState = async (input: ReconcileInput): Promise<ReconcileResult> => {
	let rendered: string;
	try {
		rendered = await input.renderStateMd();
	} catch (e) {
		tffDebug("reconcile: renderStateMd threw; leaving STATE.md unchanged", {
			stateMdPath: input.stateMdPath,
			error: e instanceof Error ? e.message : String(e),
		});
		return { action: "render-failed" };
	}
	if (!existsSync(input.stateMdPath)) {
		const wrote = atomicWrite(input.stateMdPath, rendered);
		if (!wrote) {
			tffDebug("reconcile: atomic write failed for missing STATE.md", {
				stateMdPath: input.stateMdPath,
			});
			return { action: "render-failed" };
		}
		return { action: "missing-regenerated" };
	}
	const onDisk = readFileSync(input.stateMdPath, "utf8");
	if (sha256(onDisk) === sha256(rendered)) return { action: "noop" };
	const wrote = atomicWrite(input.stateMdPath, rendered);
	if (!wrote) {
		tffDebug("reconcile: atomic write failed for drifted STATE.md", {
			stateMdPath: input.stateMdPath,
		});
		return { action: "render-failed" };
	}
	return { action: "regenerated" };
};
