import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type BranchMeta, BranchMetaSchema } from "../../domain/value-objects/branch-meta.js";

const STAMP_FILE = "branch-meta.json";

export function readLocalStamp(tffDir: string): BranchMeta | null {
	const stampPath = path.join(tffDir, STAMP_FILE);
	if (!existsSync(stampPath)) return null;
	try {
		const raw = JSON.parse(readFileSync(stampPath, "utf8"));
		return BranchMetaSchema.parse(raw);
	} catch {
		return null;
	}
}

export function writeLocalStamp(tffDir: string, meta: Omit<BranchMeta, "restoredAt">): void {
	const stampPath = path.join(tffDir, STAMP_FILE);
	const stamp = BranchMetaSchema.parse({ ...meta, restoredAt: new Date().toISOString() });
	writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
}

export function writeSyntheticStamp(tffDir: string, codeBranch: string): void {
	const stamp = BranchMetaSchema.parse({
		stateId: randomUUID(),
		codeBranch,
		parentStateBranch: null,
		createdAt: new Date().toISOString(),
		restoredAt: new Date().toISOString(),
	});
	writeFileSync(path.join(tffDir, STAMP_FILE), JSON.stringify(stamp, null, 2));
}
