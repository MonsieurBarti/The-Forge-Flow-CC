export class JournalEventHandler {
    journal;
    constructor(journal) {
        this.journal = journal;
    }
    register(eventBus) {
        eventBus.subscribe("SLICE_STATUS_CHANGED", (event) => this.onSliceStatusChanged(event));
    }
    onSliceStatusChanged(event) {
        const { sliceId, from, to } = event.payload;
        const entry = {
            type: "phase-changed",
            sliceId,
            timestamp: event.occurredAt.toISOString(),
            from,
            to,
        };
        this.journal.append(sliceId, entry);
    }
}
//# sourceMappingURL=journal-event-handler.js.map