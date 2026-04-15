import type { EventBus } from "../../domain/ports/event-bus.port.js";
import type { JournalRepository } from "../../domain/ports/journal-repository.port.js";
export declare class JournalEventHandler {
    private readonly journal;
    constructor(journal: JournalRepository);
    register(eventBus: EventBus): void;
    private onSliceStatusChanged;
}
//# sourceMappingURL=journal-event-handler.d.ts.map