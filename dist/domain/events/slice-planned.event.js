import { createDomainEvent } from "./domain-event.js";
export const slicePlannedEvent = (sliceId, taskCount) => createDomainEvent("SLICE_PLANNED", { sliceId, taskCount });
//# sourceMappingURL=slice-planned.event.js.map