import { createDomainError, type DomainError } from "../../../domain/errors/domain-error.js";
import { preconditionViolationError } from "../../../domain/errors/precondition-violation.error.js";
import type { SliceMergeLookup } from "../../../domain/ports/slice-merge-lookup.port.js";
import { Err, Ok, type Result } from "../../../domain/result.js";

const SLICE_LABEL_RE = /^M\d+-S\d+$/;

export type GitRunner = (cmd: string, args: string[], opts: { cwd: string }) => Promise<string>;

export interface GitSliceMergeLookupOpts {
	run: GitRunner;
	defaultBranch: string;
	cwd: string;
}

export class GitSliceMergeLookup implements SliceMergeLookup {
	constructor(private readonly opts: GitSliceMergeLookupOpts) {}

	async findMergeCommit(sliceLabel: string): Promise<Result<string, DomainError>> {
		if (!SLICE_LABEL_RE.test(sliceLabel)) {
			return Err(
				preconditionViolationError([
					{ code: "slice_label.format", expected: "M<d+>-S<d+>", actual: sliceLabel },
				]),
			);
		}

		let stdout: string;
		try {
			stdout = await this.opts.run(
				"git",
				["log", "--grep", sliceLabel, "--format=%H", this.opts.defaultBranch],
				{ cwd: this.opts.cwd },
			);
		} catch (err) {
			return Err(
				createDomainError("EXTERNAL_CALL_FAILED", "git log failed", {
					error: err instanceof Error ? err.message : String(err),
				}),
			);
		}

		const first = stdout.split("\n").find((l) => l.trim().length > 0);
		if (!first) {
			return Err(
				preconditionViolationError([
					{
						code: "slice.merge_commit",
						expected: `merge commit matching ${sliceLabel} on ${this.opts.defaultBranch}`,
						actual: "no match",
					},
				]),
			);
		}
		return Ok(first.trim());
	}
}
