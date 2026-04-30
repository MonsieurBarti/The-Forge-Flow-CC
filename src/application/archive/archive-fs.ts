import { existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Milestone } from "../../domain/entities/milestone.js";
import type { Slice } from "../../domain/entities/slice.js";
import { milestoneLabel, sliceLabelFor } from "../../domain/helpers/branch-naming.js";
import { milestoneDir, sliceDirFor, tffCcPath } from "../../shared/paths.js";

/**
 * Repo-relative archive root: .tff-cc/archive
 *
 * Buckets are created lazily under this root by the FS helpers below
 * (.tff-cc/archive/{milestones,quick,debug}/<label>/).
 */
export const ARCHIVE_DIR = tffCcPath("archive");

type FsResult = { ok: true } | { ok: false; reason: string };

/**
 * Move a quick/debug ad-hoc slice's spec dir into the archive bucket.
 *
 * Idempotent: if the source is missing AND the destination already exists,
 * the slice is treated as already-archived and the helper returns ok. If
 * neither exists there is nothing to do; we still return ok so the caller
 * doesn't have to special-case bare DB rows. The only failure surfaced is
 * an explicit collision where both source and destination are present
 * (defensive — caller should log).
 */
export const archiveSliceFs = (slice: Slice, cwd: string): FsResult => {
	if (slice.kind === "milestone") {
		return {
			ok: false,
			reason: "archiveSliceFs called on milestone slice — use archiveMilestoneFs",
		};
	}
	const label = sliceLabelFor(slice);
	const srcRel = sliceDirFor(slice, undefined, label);
	const dstRel = `${ARCHIVE_DIR}/${slice.kind}/${label}`;
	return performRename(cwd, srcRel, dstRel);
};

/**
 * Move a milestone's spec dir into the archive bucket. Same idempotence
 * rules as {@link archiveSliceFs}.
 */
export const archiveMilestoneFs = (milestone: Milestone, cwd: string): FsResult => {
	const msLabel = milestoneLabel(milestone.number);
	const srcRel = milestoneDir(msLabel);
	const dstRel = `${ARCHIVE_DIR}/milestones/${msLabel}`;
	return performRename(cwd, srcRel, dstRel);
};

const performRename = (cwd: string, srcRel: string, dstRel: string): FsResult => {
	const srcAbs = resolve(cwd, srcRel);
	const dstAbs = resolve(cwd, dstRel);
	const srcExists = existsSync(srcAbs);
	const dstExists = existsSync(dstAbs);

	if (!srcExists && dstExists) return { ok: true };
	if (!srcExists && !dstExists) return { ok: true };
	if (srcExists && dstExists) return { ok: false, reason: "destination already exists" };

	try {
		mkdirSync(dirname(dstAbs), { recursive: true });
		renameSync(srcAbs, dstAbs);
		return { ok: true };
	} catch (e) {
		return { ok: false, reason: `rename failed: ${e instanceof Error ? e.message : String(e)}` };
	}
};
