import type { DomainEvent, DomainEventType } from "../../../domain/events/domain-event.js";
import type { EventBus } from "../../../domain/ports/event-bus.port.js";

export class SimpleEventBus implements EventBus {
	private handlers = new Map<DomainEventType, Array<(event: DomainEvent) => void>>();

	publish(event: DomainEvent): void {
		const handlers = this.handlers.get(event.type) ?? [];
		for (const handler of handlers) {
			handler(event);
		}
	}

	subscribe(type: DomainEventType, handler: (event: DomainEvent) => void): void {
		const existing = this.handlers.get(type) ?? [];
		this.handlers.set(type, [...existing, handler]);
	}
}
