import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface SkillBaseline {
	readonly sha256: string;
	readonly originalCommitSha: string;
	readonly approvedAt: string;
	readonly refinementId: string | null;
}

export interface Manifest {
	readonly version: 1;
	readonly skills: Record<string, SkillBaseline>;
}

const MANIFEST_REL = "skills/skill-baselines.json";

export const computeSha = (content: string): string =>
	crypto.createHash("sha256").update(content, "utf8").digest("hex");

export const readManifest = (root: string): Manifest => {
	const p = path.join(root, MANIFEST_REL);
	if (!fs.existsSync(p)) return { version: 1, skills: {} };
	const parsed = JSON.parse(fs.readFileSync(p, "utf8")) as Manifest;
	if (parsed.version !== 1) {
		throw new Error(`unsupported skill-baselines.json version: ${parsed.version}`);
	}
	if (typeof parsed.skills !== "object" || parsed.skills === null || Array.isArray(parsed.skills)) {
		throw new Error("skill-baselines.json: 'skills' must be an object");
	}
	return parsed;
};

const sortedStringify = (m: Manifest): string => {
	const skills: Record<string, SkillBaseline> = {};
	for (const id of Object.keys(m.skills).sort()) {
		const row = m.skills[id];
		// Stable object-key order within each row (alphabetical).
		skills[id] = {
			approvedAt: row.approvedAt,
			originalCommitSha: row.originalCommitSha,
			refinementId: row.refinementId,
			sha256: row.sha256,
		} as SkillBaseline;
	}
	return `${JSON.stringify({ version: 1, skills }, null, 2)}\n`;
};

export const writeManifest = (root: string, manifest: Manifest): void => {
	const p = path.join(root, MANIFEST_REL);
	fs.mkdirSync(path.dirname(p), { recursive: true });
	fs.writeFileSync(p, sortedStringify(manifest), "utf8");
};

export interface GovernanceDriftReport {
	readonly missing: string[];
	readonly mismatched: Array<{ id: string; expected: string; actual: string }>;
	readonly orphaned: string[];
}

const listSkillDirs = (root: string): string[] => {
	const skillsRoot = path.join(root, "skills");
	if (!fs.existsSync(skillsRoot)) return [];
	return fs
		.readdirSync(skillsRoot, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name)
		.filter((name) => fs.existsSync(path.join(skillsRoot, name, "SKILL.md")));
};

export const diffAgainstManifest = (root: string, manifest: Manifest): GovernanceDriftReport => {
	const skillDirs = new Set(listSkillDirs(root));
	const manifestIds = new Set(Object.keys(manifest.skills));

	const missing = [...skillDirs].filter((id) => !manifestIds.has(id)).sort();
	const orphaned = [...manifestIds].filter((id) => !skillDirs.has(id)).sort();

	const mismatched: Array<{ id: string; expected: string; actual: string }> = [];
	for (const id of [...skillDirs].sort()) {
		const row = manifest.skills[id];
		if (!row) continue;
		let content: string;
		try {
			content = fs.readFileSync(path.join(root, "skills", id, "SKILL.md"), "utf8");
		} catch (err) {
			throw new Error(
				`diffAgainstManifest: cannot read skills/${id}/SKILL.md — ${(err as NodeJS.ErrnoException).message}`,
			);
		}
		const actual = computeSha(content);
		if (actual !== row.sha256) {
			mismatched.push({ id, expected: row.sha256, actual });
		}
	}

	return { missing, mismatched, orphaned };
};
