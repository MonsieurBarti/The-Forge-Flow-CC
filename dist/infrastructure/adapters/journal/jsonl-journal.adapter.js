import { appendFileSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createDomainError } from "../../../domain/errors/domain-error.js";
import { Err, Ok } from "../../../domain/result.js";
import { JournalEntrySchema, } from "../../../domain/value-objects/journal-entry.js";
function isNodeError(error) {
    if (!(error instanceof Error))
        return false;
    if (!("code" in error))
        return false;
    const descriptor = Object.getOwnPropertyDescriptor(error, "code");
    return descriptor !== undefined && typeof descriptor.value === "string";
}
export class JsonlJournalAdapter {
    basePath;
    constructor(basePath) {
        this.basePath = basePath;
    }
    filePath(sliceId) {
        return join(this.basePath, `${sliceId}.jsonl`);
    }
    append(sliceId, entry) {
        const countResult = this.count(sliceId);
        if (!countResult.ok)
            return countResult;
        const seq = countResult.data;
        try {
            const fullEntry = JournalEntrySchema.parse({ ...entry, seq });
            mkdirSync(this.basePath, { recursive: true });
            appendFileSync(this.filePath(sliceId), `${JSON.stringify(fullEntry)}\n`, "utf-8");
            return Ok(seq);
        }
        catch (error) {
            if (error instanceof Error && error.name === "ZodError") {
                return Err(createDomainError("JOURNAL_WRITE_FAILED", `Invalid journal entry: ${error.message}`));
            }
            return Err(createDomainError("JOURNAL_WRITE_FAILED", error instanceof Error ? error.message : String(error)));
        }
    }
    readAll(sliceId) {
        let content;
        try {
            content = readFileSync(this.filePath(sliceId), "utf-8");
        }
        catch (error) {
            if (isNodeError(error) && error.code === "ENOENT")
                return Ok([]);
            return Err(createDomainError("JOURNAL_READ_FAILED", error instanceof Error ? error.message : String(error)));
        }
        const lines = content.split("\n").filter((l) => l.trim());
        const entries = [];
        for (let i = 0; i < lines.length; i++) {
            try {
                const raw = JSON.parse(lines[i]);
                entries.push(JournalEntrySchema.parse(raw));
            }
            catch {
                // Skip corrupt lines
            }
        }
        return Ok(entries);
    }
    readSince(sliceId, afterSeq) {
        const result = this.readAll(sliceId);
        if (!result.ok)
            return result;
        return Ok(result.data.filter((e) => e.seq > afterSeq));
    }
    count(sliceId) {
        const result = this.readAll(sliceId);
        if (!result.ok)
            return result;
        return Ok(result.data.length);
    }
    reset() {
        try {
            const files = readdirSync(this.basePath);
            for (const file of files) {
                if (file.endsWith(".jsonl"))
                    unlinkSync(join(this.basePath, file));
            }
        }
        catch {
            /* basePath doesn't exist yet */
        }
    }
}
//# sourceMappingURL=jsonl-journal.adapter.js.map