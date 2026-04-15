import type { DomainEvent } from "../../domain/events/domain-event.js";
import type { EventBus } from "../../domain/ports/event-bus.port.js";
import type { JournalRepository } from "../../domain/ports/journal-repository.port.js";
import type { PhaseChangedEntry } from "../../domain/value-objects/journal-entry.js";

export class JournalEventHandler {
	constructor(private readonly journal: JournalRepository) {}

	register(eventBus: EventBus): void {
		eventBus.subscribe("SLICE_STATUS_CHANGED", (event) => this.onSliceStatusChanged(event));
	}

	private onSliceStatusChanged(event: DomainEvent): void {
		const { sliceId, from, to } = event.payload as { sliceId: string; from: string; to: string };
		const entry: Omit<PhaseChangedEntry, "seq"> = {
			type: "phase-changed",
			sliceId,
			timestamp: event.occurredAt.toISOString(),
			from,
			to,
		};
		this.journal.append(sliceId, entry);
	}
}
