import { Ok } from "../../domain/result.js";
import { JournalEntrySchema } from "../../domain/value-objects/journal-entry.js";
export class InMemoryJournalAdapter {
    store = new Map();
    append(sliceId, entry) {
        const entries = this.store.get(sliceId) ?? [];
        const seq = entries.length;
        const fullEntry = JournalEntrySchema.parse({ ...entry, seq });
        this.store.set(sliceId, [...entries, fullEntry]);
        return Ok(seq);
    }
    readAll(sliceId) {
        return Ok(this.store.get(sliceId) ?? []);
    }
    readSince(sliceId, afterSeq) {
        const entries = this.store.get(sliceId) ?? [];
        return Ok(entries.filter((e) => e.seq > afterSeq));
    }
    count(sliceId) {
        return Ok((this.store.get(sliceId) ?? []).length);
    }
    seed(sliceId, entries) {
        this.store.set(sliceId, entries);
    }
    reset() {
        this.store.clear();
    }
}
//# sourceMappingURL=in-memory-journal.adapter.js.map