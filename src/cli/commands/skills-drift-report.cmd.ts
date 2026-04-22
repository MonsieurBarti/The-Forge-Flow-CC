import { spawnSync } from "node:child_process";
import { driftReport, type GitShow } from "../../application/skills/drift-report.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const skillsDriftReportSchema: CommandSchema = {
	name: "skills:drift-report",
	purpose: "Compute per-skill semantic drift against each skill's originalCommitSha",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [],
	examples: ["skills:drift-report"],
};

export const skillsDriftReportCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, skillsDriftReportSchema);
	if (!parsed.ok) return JSON.stringify(parsed);

	const git: GitShow = {
		show: async (commitSha, relPath) => {
			const result = spawnSync("git", ["show", `${commitSha}:${relPath}`], {
				encoding: "utf8",
				cwd: process.cwd(),
				timeout: 30_000,
			});
			if (result.status !== 0) {
				throw new Error(result.stderr.trim() || `git show exited ${result.status}`);
			}
			return result.stdout;
		},
	};

	const data = await driftReport({ root: process.cwd(), git });
	return JSON.stringify({ ok: true, data });
};
