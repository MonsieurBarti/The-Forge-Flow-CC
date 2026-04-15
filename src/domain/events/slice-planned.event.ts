import { createDomainEvent } from "./domain-event.js";

export const slicePlannedEvent = (sliceId: string, taskCount: number) =>
	createDomainEvent("SLICE_PLANNED", { sliceId, taskCount });
