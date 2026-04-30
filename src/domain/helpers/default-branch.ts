/**
 * Detect the repository's default branch name.
 *
 * Best-effort, never throws. Tries (in order):
 *   1. `git symbolic-ref refs/remotes/origin/HEAD --short` → strip `origin/`.
 *   2. `git config --get init.defaultBranch`.
 *   3. Fallback to "main".
 */

export type RunGit = (cmd: string, args: string[], opts: { cwd: string }) => Promise<string>;

export const detectDefaultBranch = async (
	runGit: RunGit,
	opts: { cwd: string },
): Promise<string> => {
	try {
		const out = await runGit("git", ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"], opts);
		const trimmed = out.trim();
		if (trimmed.startsWith("origin/")) {
			const name = trimmed.slice("origin/".length).trim();
			if (name.length > 0) return name;
		} else if (trimmed.length > 0) {
			return trimmed;
		}
	} catch {
		// Fall through to next strategy.
	}

	try {
		const out = await runGit("git", ["config", "--get", "init.defaultBranch"], opts);
		const trimmed = out.trim();
		if (trimmed.length > 0) return trimmed;
	} catch {
		// Fall through to final fallback.
	}

	return "main";
};
