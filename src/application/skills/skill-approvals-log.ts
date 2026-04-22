import fs from "node:fs";
import path from "node:path";

const LOG_REL = ".tff-cc/observations/skill-approvals.jsonl";

export interface SkillApprovalEntry {
	readonly ts: string;
	readonly skillId: string;
	readonly reason: string;
	readonly shaBefore: string;
	readonly shaAfter: string;
	readonly refinementId: string | null;
	readonly approvedDiffSha: string;
}

export const appendSkillApproval = (root: string, entry: SkillApprovalEntry): void => {
	const abs = path.join(root, LOG_REL);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.appendFileSync(abs, `${JSON.stringify(entry)}\n`, "utf8");
};
