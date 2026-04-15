import { describe, expect, it } from "vitest";
import type { EventBus } from "../../../src/infrastructure/testing/event-bus.port.js";

describe("EventBus port", () => {
	it("interface exists and is importable", () => {
		const bus: EventBus = {
			publish: () => {},
			subscribe: () => {},
		};
		expect(bus.publish).toBeDefined();
		expect(bus.subscribe).toBeDefined();
	});
});
