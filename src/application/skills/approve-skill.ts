import fs from "node:fs";
import path from "node:path";
import { computeSha, type Manifest, readManifest, writeManifest } from "./baseline-registry.js";

export interface ApproveSkillGit {
	readonly isPathDirty: (relPath: string) => Promise<boolean>;
}

export interface ApproveSkillInput {
	readonly skillId: string;
	readonly reason: string;
	readonly root: string;
	readonly git: ApproveSkillGit;
	readonly now?: () => Date;
	readonly seedOriginalCommitSha?: string;
}

export interface ApproveSkillSuccess {
	readonly ok: true;
	readonly noop: boolean;
	readonly data: {
		readonly skillId: string;
		readonly shaBefore: string;
		readonly shaAfter: string;
		readonly reason: string;
		readonly originalCommitSha: string;
	};
}

export interface ApproveSkillFailure {
	readonly ok: false;
	readonly reason: string;
}

export type ApproveSkillResult = ApproveSkillSuccess | ApproveSkillFailure;

export const approveSkill = async (input: ApproveSkillInput): Promise<ApproveSkillResult> => {
	const { skillId, reason, root, git } = input;
	const now = input.now ?? (() => new Date());

	const relPath = `skills/${skillId}/SKILL.md`;
	const absPath = path.join(root, relPath);
	if (!fs.existsSync(absPath)) {
		return { ok: false, reason: `skill not found: ${skillId}` };
	}

	if (await git.isPathDirty(relPath)) {
		return {
			ok: false,
			reason: `${relPath} has uncommitted changes; commit the content change first, then re-run skills:approve`,
		};
	}

	const content = fs.readFileSync(absPath, "utf8");
	const newSha = computeSha(content);
	const manifest = readManifest(root);
	const existing = manifest.skills[skillId];
	const oldSha = existing?.sha256 ?? "";

	// seedOriginalCommitSha is only valid when creating a new row.
	// Silently dropping it for an existing row could erase provenance.
	if (existing && input.seedOriginalCommitSha !== undefined) {
		return {
			ok: false,
			reason: `seedOriginalCommitSha is only valid for new rows; row for ${skillId} already exists`,
		};
	}

	if (existing && existing.sha256 === newSha) {
		return {
			ok: true,
			noop: true,
			data: {
				skillId,
				shaBefore: oldSha,
				shaAfter: newSha,
				reason,
				originalCommitSha: existing.originalCommitSha,
			},
		};
	}

	if (!existing && !input.seedOriginalCommitSha) {
		return {
			ok: false,
			reason: `no manifest row for ${skillId} and no seedOriginalCommitSha provided; seed the baseline first`,
		};
	}

	const resolvedOriginalCommitSha =
		existing?.originalCommitSha ?? input.seedOriginalCommitSha ?? "";
	const next: Manifest = {
		version: 1,
		skills: {
			...manifest.skills,
			[skillId]: {
				sha256: newSha,
				originalCommitSha: resolvedOriginalCommitSha,
				approvedAt: now().toISOString(),
				refinementId: null,
			},
		},
	};

	writeManifest(root, next);

	return {
		ok: true,
		noop: false,
		data: {
			skillId,
			shaBefore: oldSha,
			shaAfter: newSha,
			reason,
			originalCommitSha: resolvedOriginalCommitSha,
		},
	};
};
