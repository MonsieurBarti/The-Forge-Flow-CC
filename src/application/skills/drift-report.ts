import fs from "node:fs";
import path from "node:path";
import { readManifest } from "./baseline-registry.js";
import { checkDrift } from "./check-drift.js";

export const SEMANTIC_DRIFT_RATIO = 0.6;

export interface GitShow {
	show: (commitSha: string, relPath: string) => Promise<string>;
}

export interface SemanticDriftRow {
	readonly id: string;
	readonly ratio?: number;
	readonly overThreshold?: boolean;
	readonly error?: string;
}

export interface SemanticDriftReport {
	readonly skills: SemanticDriftRow[];
}

export const driftReport = async (input: {
	root: string;
	git: GitShow;
}): Promise<SemanticDriftReport> => {
	const manifest = readManifest(input.root);
	const rows: SemanticDriftRow[] = [];

	for (const id of Object.keys(manifest.skills).sort()) {
		const baseline = manifest.skills[id];
		const relPath = `skills/${id}/SKILL.md`;
		const absPath = path.join(input.root, relPath);
		if (!fs.existsSync(absPath)) {
			rows.push({ id, error: `${relPath} missing` });
			continue;
		}
		try {
			const current = fs.readFileSync(absPath, "utf8");
			const original = await input.git.show(baseline.originalCommitSha, relPath);
			const { driftScore, overThreshold } = checkDrift(original, current, {
				maxDrift: SEMANTIC_DRIFT_RATIO,
			});
			rows.push({
				id,
				ratio: driftScore,
				overThreshold,
			});
		} catch (err) {
			rows.push({ id, error: (err as Error).message });
		}
	}

	return { skills: rows };
};
