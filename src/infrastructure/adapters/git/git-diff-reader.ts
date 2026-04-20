import { createDomainError, type DomainError } from "../../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../../domain/errors/precondition-violation.error.js";
import type { DiffReader, DiffSummary } from "../../../domain/ports/diff-reader.port.js";
import { Err, Ok, type Result } from "../../../domain/result.js";
import type { GitRunner } from "./git-runner.js";

const SHA_RE = /^[0-9a-f]{7,40}$/;

const parseStat = (
	raw: string,
): { files_changed: number; insertions: number; deletions: number } => {
	// Last non-empty line of `git show --stat` is the summary.
	const line =
		raw
			.split("\n")
			.reverse()
			.find((l) => l.trim().length > 0) ?? "";
	const files = Number(/(\d+) files? changed/.exec(line)?.[1] ?? 0);
	const ins = Number(/(\d+) insertions?\(\+\)/.exec(line)?.[1] ?? 0);
	const del = Number(/(\d+) deletions?\(-\)/.exec(line)?.[1] ?? 0);
	return { files_changed: files, insertions: ins, deletions: del };
};

export interface GitDiffReaderOpts {
	run: GitRunner;
	cwd: string;
}

export class GitDiffReader implements DiffReader {
	constructor(private readonly opts: GitDiffReaderOpts) {}

	async readMergeDiff(
		mergeSha: string,
		maxPatchBytes: number,
	): Promise<Result<DiffSummary, DomainError>> {
		if (!SHA_RE.test(mergeSha)) {
			return Err(
				preconditionViolationError([
					{ code: "merge_sha.format", expected: "hex 7..40", actual: mergeSha },
				]),
			);
		}

		let statOut: string;
		let patchOut: string;
		try {
			statOut = await this.opts.run("git", ["show", "--stat", "--format=", mergeSha], {
				cwd: this.opts.cwd,
			});
			patchOut = await this.opts.run("git", ["show", "--format=", mergeSha], {
				cwd: this.opts.cwd,
			});
		} catch (err) {
			return Err(
				createDomainError("EXTERNAL_CALL_FAILED", "git show failed", {
					error: err instanceof Error ? err.message : String(err),
				}),
			);
		}

		const { files_changed, insertions, deletions } = parseStat(statOut);
		let patch = patchOut;
		let truncated = false;
		if (patch.length > maxPatchBytes) {
			const dropped = patch.length - maxPatchBytes;
			patch = `${patch.slice(0, maxPatchBytes)}\n... [truncated, ${dropped} bytes dropped]`;
			truncated = true;
		}
		return Ok({ files_changed, insertions, deletions, patch, truncated });
	}
}
