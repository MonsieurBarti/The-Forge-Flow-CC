import type { DomainEvent, DomainEventType } from "../../../domain/events/domain-event.js";
import type { EventBus } from "../../../domain/ports/event-bus.port.js";
export declare class SimpleEventBus implements EventBus {
    private handlers;
    publish(event: DomainEvent): void;
    subscribe(type: DomainEventType, handler: (event: DomainEvent) => void): void;
}
//# sourceMappingURL=simple-event-bus.d.ts.map