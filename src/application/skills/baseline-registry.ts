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
