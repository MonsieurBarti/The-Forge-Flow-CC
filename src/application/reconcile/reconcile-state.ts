import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

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
 * Reconciles STATE.md against a DB-derived render. If the rendered checksum
 * matches the on-disk file, noop. Otherwise regenerates in place. Renderer
 * failures are swallowed: the read path must remain non-fatal.
 */
export const reconcileState = async (input: ReconcileInput): Promise<ReconcileResult> => {
	let rendered: string;
	try {
		rendered = await input.renderStateMd();
	} catch {
		return { action: "render-failed" };
	}
	if (!existsSync(input.stateMdPath)) {
		try {
			writeFileSync(input.stateMdPath, rendered);
			return { action: "missing-regenerated" };
		} catch {
			return { action: "render-failed" };
		}
	}
	const onDisk = readFileSync(input.stateMdPath, "utf8");
	if (sha256(onDisk) === sha256(rendered)) return { action: "noop" };
	try {
		writeFileSync(input.stateMdPath, rendered);
		return { action: "regenerated" };
	} catch {
		return { action: "render-failed" };
	}
};
