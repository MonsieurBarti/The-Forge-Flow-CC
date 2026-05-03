import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createDomainError, type DomainError } from "../../../domain/errors/domain-error.js";
import type {
	SliceSpecReader,
	SliceSpecResult,
} from "../../../domain/ports/slice-spec-reader.port.js";
import { Err, Ok, type Result } from "../../../domain/result.js";
import { debugSliceDir, quickSliceDir, sliceDir } from "../../../shared/paths.js";

const MILESTONE_SLICE_RE = /^M(\d+)-S\d+$/;
const ADHOC_SLICE_RE = /^([QD])-\d+$/;

/**
 * Resolve `<projectRoot>/<sliceDir>/SPEC.md` from a slice label. Path is
 * deterministic — mirrors the layout written by slice:create. Falls back to
 * `missing: true` if the file is absent at the expected location.
 */
const specPathFor = (projectRoot: string, sliceLabel: string): string | null => {
	const milestone = MILESTONE_SLICE_RE.exec(sliceLabel);
	if (milestone) {
		const milestoneLabel = `M${milestone[1].padStart(2, "0")}`;
		return join(projectRoot, sliceDir(milestoneLabel, sliceLabel), "SPEC.md");
	}
	const adhoc = ADHOC_SLICE_RE.exec(sliceLabel);
	if (adhoc) {
		const dir = adhoc[1] === "Q" ? quickSliceDir(sliceLabel) : debugSliceDir(sliceLabel);
		return join(projectRoot, dir, "SPEC.md");
	}
	return null;
};

export interface SliceSpecFsReaderOpts {
	projectRoot: string;
}

export class SliceSpecFsReader implements SliceSpecReader {
	constructor(private readonly opts: SliceSpecFsReaderOpts) {}

	async readSpec(
		sliceLabel: string,
		maxBytes: number,
	): Promise<Result<SliceSpecResult, DomainError>> {
		const specPath = specPathFor(this.opts.projectRoot, sliceLabel);
		if (specPath === null) {
			return Err(
				createDomainError("VALIDATION_ERROR", `invalid slice label: ${sliceLabel}`, { sliceLabel }),
			);
		}

		let raw: string;
		try {
			raw = await readFile(specPath, "utf8");
		} catch {
			return Ok({ text: "", truncated: false, missing: true });
		}

		if (raw.length > maxBytes) {
			const dropped = raw.length - maxBytes;
			return Ok({
				text: `${raw.slice(0, maxBytes)}\n... [truncated, ${dropped} bytes dropped]`,
				truncated: true,
				missing: false,
			});
		}
		return Ok({ text: raw, truncated: false, missing: false });
	}
}
