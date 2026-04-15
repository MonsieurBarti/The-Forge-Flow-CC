import type { DomainEvent, DomainEventType } from "../events/domain-event.js";

export interface EventBus {
	publish(event: DomainEvent): void;
	subscribe(type: DomainEventType, handler: (event: DomainEvent) => void): void;
}
