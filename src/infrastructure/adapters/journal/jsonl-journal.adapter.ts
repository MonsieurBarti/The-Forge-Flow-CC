import { appendFileSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { DomainError } from "../../../domain/errors/domain-error.js";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import type { JournalRepository } from "../../../domain/ports/journal-repository.port.js";
import { Err, Ok, type Result } from "../../../domain/result.js";
import {
	type JournalEntry,
	JournalEntrySchema,
} from "../../../domain/value-objects/journal-entry.js";

function isNodeError(error: unknown): error is Error & { code: string } {
	if (!(error instanceof Error)) return false;
	if (!("code" in error)) return false;
	const descriptor = Object.getOwnPropertyDescriptor(error, "code");
	return descriptor !== undefined && typeof descriptor.value === "string";
}

export class JsonlJournalAdapter implements JournalRepository {
	constructor(private readonly basePath: string) {}

	private filePath(sliceId: string): string {
		return join(this.basePath, `${sliceId}.jsonl`);
	}

	append(sliceId: string, entry: Omit<JournalEntry, "seq">): Result<number, DomainError> {
		const countResult = this.count(sliceId);
		if (!countResult.ok) return countResult;
		const seq = countResult.data;
		try {
			const fullEntry = JournalEntrySchema.parse({ ...entry, seq });
			mkdirSync(this.basePath, { recursive: true });
			appendFileSync(this.filePath(sliceId), `${JSON.stringify(fullEntry)}\n`, "utf-8");
			return Ok(seq);
		} catch (error: unknown) {
			if (error instanceof Error && error.name === "ZodError") {
				return Err(
					createDomainError("JOURNAL_WRITE_FAILED", `Invalid journal entry: ${error.message}`),
				);
			}
			return Err(
				createDomainError(
					"JOURNAL_WRITE_FAILED",
					error instanceof Error ? error.message : String(error),
				),
			);
		}
	}

	readAll(sliceId: string): Result<readonly JournalEntry[], DomainError> {
		let content: string;
		try {
			content = readFileSync(this.filePath(sliceId), "utf-8");
		} catch (error: unknown) {
			if (isNodeError(error) && error.code === "ENOENT") return Ok([]);
			return Err(
				createDomainError(
					"JOURNAL_READ_FAILED",
					error instanceof Error ? error.message : String(error),
				),
			);
		}
		const lines = content.split("\n").filter((l) => l.trim());
		const entries: JournalEntry[] = [];
		for (let i = 0; i < lines.length; i++) {
			try {
				const raw: unknown = JSON.parse(lines[i]);
				entries.push(JournalEntrySchema.parse(raw));
			} catch {
				// Skip corrupt lines
			}
		}
		return Ok(entries);
	}

	readSince(sliceId: string, afterSeq: number): Result<readonly JournalEntry[], DomainError> {
		const result = this.readAll(sliceId);
		if (!result.ok) return result;
		return Ok(result.data.filter((e) => e.seq > afterSeq));
	}

	count(sliceId: string): Result<number, DomainError> {
		const result = this.readAll(sliceId);
		if (!result.ok) return result;
		return Ok(result.data.length);
	}

	reset(): void {
		try {
			const files = readdirSync(this.basePath);
			for (const file of files) {
				if (file.endsWith(".jsonl")) unlinkSync(join(this.basePath, file));
			}
		} catch {
			/* basePath doesn't exist yet */
		}
	}
}
