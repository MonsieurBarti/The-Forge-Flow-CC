import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createDomainError, type DomainError } from "../../../domain/errors/domain-error.js";
import type {
	SliceSpecReader,
	SliceSpecResult,
} from "../../../domain/ports/slice-spec-reader.port.js";
import { Err, Ok, type Result } from "../../../domain/result.js";

const SLICE_LABEL_RE = /^M(\d+)-S(\d+)$/;

export interface SliceSpecFsReaderOpts {
	projectRoot: string;
}

export class SliceSpecFsReader implements SliceSpecReader {
	constructor(private readonly opts: SliceSpecFsReaderOpts) {}

	async readSpec(
		sliceLabel: string,
		maxBytes: number,
	): Promise<Result<SliceSpecResult, DomainError>> {
		const m = SLICE_LABEL_RE.exec(sliceLabel);
		if (!m) {
			return Err(
				createDomainError("VALIDATION_ERROR", `invalid slice label: ${sliceLabel}`, { sliceLabel }),
			);
		}
		const mNum = m[1].padStart(2, "0");
		const sNum = m[2].padStart(2, "0");
		const milestoneDir = join(this.opts.projectRoot, ".tff-cc", "milestones", `M${mNum}`);

		let entries: string[];
		try {
			entries = await readdir(milestoneDir);
		} catch {
			return Ok({ text: "", truncated: false, missing: true });
		}

		const prefix = `S${sNum}-`;
		const sliceDirName = entries.find((e) => e.startsWith(prefix));
		if (!sliceDirName) {
			return Ok({ text: "", truncated: false, missing: true });
		}

		const specPath = join(milestoneDir, sliceDirName, "SPEC.md");
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
