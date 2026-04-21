import fs from "node:fs";
import path from "node:path";
import { computeSha, type Manifest, readManifest, writeManifest } from "./baseline-registry.js";
import { appendSkillApproval } from "./skill-approvals-log.js";

export interface ApproveSkillGit {
	readonly isPathDirty: (relPath: string) => Promise<boolean>;
	readonly showAtHead: (relPath: string) => Promise<string>;
}

export interface ApproveSkillInput {
	readonly skillId: string;
	readonly reason: string;
	readonly root: string;
	readonly git: ApproveSkillGit;
	readonly now?: () => Date;
	readonly seedOriginalCommitSha?: string;
	readonly approvedDiffSha: string;
	readonly refinementId?: string | null;
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
		readonly refinementId: string | null;
	};
}

export interface ApproveSkillFailure {
	readonly ok: false;
	readonly reason: string;
}

export type ApproveSkillResult = ApproveSkillSuccess | ApproveSkillFailure;

const SKILL_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const approveSkill = async (input: ApproveSkillInput): Promise<ApproveSkillResult> => {
	const { skillId, reason, root, git } = input;
	const now = input.now ?? (() => new Date());

	if (!SKILL_ID_PATTERN.test(skillId)) {
		return {
			ok: false,
			reason: `invalid skill id: ${JSON.stringify(skillId)}; must match ${SKILL_ID_PATTERN}`,
		};
	}

	const relPath = `skills/${skillId}/SKILL.md`;
	const absPath = path.resolve(root, relPath);
	const skillsRoot = path.resolve(root, "skills");
	if (!absPath.startsWith(skillsRoot + path.sep)) {
		return {
			ok: false,
			reason: `resolved skill path escapes skills/: ${absPath}`,
		};
	}
	if (!fs.existsSync(absPath)) {
		return { ok: false, reason: `skill not found: ${skillId}` };
	}

	if (await git.isPathDirty(relPath)) {
		return {
			ok: false,
			reason: `${relPath} has uncommitted changes; commit the content change first, then re-run skills:approve`,
		};
	}

	// Hash the COMMITTED bytes (git show HEAD:<path>), not the working copy.
	// Closes a TOCTOU between the dirty-tree check and the hash, and avoids
	// cross-platform EOL drift introduced by the filesystem layer.
	let content: string;
	try {
		content = await git.showAtHead(relPath);
	} catch (err) {
		return {
			ok: false,
			reason: `unable to read committed content for ${relPath}: ${(err as Error).message}`,
		};
	}
	const newSha = computeSha(content);

	if (newSha !== input.approvedDiffSha) {
		return {
			ok: false,
			reason: `approved-diff-sha mismatch: committed content hashes to ${newSha.slice(0, 12)}… but flag passed ${input.approvedDiffSha.slice(0, 12)}…; the reviewed content and the committed content differ`,
		};
	}

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
				refinementId: existing.refinementId,
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
	const refinementId = input.refinementId ?? null;
	const next: Manifest = {
		version: 1,
		skills: {
			...manifest.skills,
			[skillId]: {
				sha256: newSha,
				originalCommitSha: resolvedOriginalCommitSha,
				approvedAt: now().toISOString(),
				refinementId,
			},
		},
	};

	writeManifest(root, next);

	appendSkillApproval(root, {
		ts: now().toISOString(),
		skillId,
		reason,
		shaBefore: oldSha,
		shaAfter: newSha,
		refinementId,
		approvedDiffSha: input.approvedDiffSha,
	});

	return {
		ok: true,
		noop: false,
		data: {
			skillId,
			shaBefore: oldSha,
			shaAfter: newSha,
			reason,
			originalCommitSha: resolvedOriginalCommitSha,
			refinementId,
		},
	};
};
