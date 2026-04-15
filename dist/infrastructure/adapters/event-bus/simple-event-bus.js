export class SimpleEventBus {
    handlers = new Map();
    publish(event) {
        const handlers = this.handlers.get(event.type) ?? [];
        for (const handler of handlers) {
            handler(event);
        }
    }
    subscribe(type, handler) {
        const existing = this.handlers.get(type) ?? [];
        this.handlers.set(type, [...existing, handler]);
    }
}
//# sourceMappingURL=simple-event-bus.js.map