import { spawnSync } from "node:child_process";
import { type ApproveSkillGit, approveSkill } from "../../application/skills/approve-skill.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const skillsApproveSchema: CommandSchema = {
	name: "skills:approve",
	purpose: "Record the current sha256 of a skill in skill-baselines.json",
	mutates: true,
	requiredFlags: [
		{ name: "id", type: "string", description: "Skill id (directory name under skills/)" },
		{
			name: "reason",
			type: "string",
			description: "Human-readable rationale; echoed for the commit message",
		},
	],
	optionalFlags: [
		{
			name: "seed-original-commit-sha",
			type: "string",
			description: "Used by the seed script only; sets originalCommitSha when creating a new row",
		},
	],
	examples: ['skills:approve --id brainstorming --reason "align with new brainstorming flow"'],
};

const makeGit = (cwd: string): ApproveSkillGit => ({
	isPathDirty: async (relPath) => {
		// `git status --porcelain <path>` returns empty output when the path is clean.
		const result = spawnSync("git", ["status", "--porcelain", "--", relPath], {
			cwd,
			encoding: "utf8",
			timeout: 30_000,
		});
		if (result.status !== 0) {
			throw new Error(`git status failed: ${result.stderr?.trim() || `exit ${result.status}`}`);
		}
		return result.stdout.trim().length > 0;
	},
	showAtHead: async (relPath) => {
		const result = spawnSync("git", ["show", `HEAD:${relPath}`], {
			cwd,
			encoding: "utf8",
			timeout: 30_000,
		});
		if (result.status !== 0) {
			throw new Error(result.stderr?.trim() || `git show exited ${result.status}`);
		}
		return result.stdout;
	},
});

export const skillsApproveCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, skillsApproveSchema);
	if (!parsed.ok) return JSON.stringify(parsed);

	const id = parsed.data.id as string;
	const reason = parsed.data.reason as string;
	const seedOriginalCommitSha = parsed.data["seed-original-commit-sha"] as string | undefined;

	const result = await approveSkill({
		skillId: id,
		reason,
		root: process.cwd(),
		git: makeGit(process.cwd()),
		seedOriginalCommitSha,
	});

	if (!result.ok) {
		return JSON.stringify({ ok: false, error: { code: "APPROVE_FAILED", message: result.reason } });
	}
	return JSON.stringify({ ok: true, data: { ...result.data, noop: result.noop } });
};
