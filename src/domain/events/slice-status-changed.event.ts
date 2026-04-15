import { createDomainEvent } from "./domain-event.js";

export const sliceStatusChangedEvent = (sliceId: string, from: string, to: string) =>
	createDomainEvent("SLICE_STATUS_CHANGED", { sliceId, from, to });
