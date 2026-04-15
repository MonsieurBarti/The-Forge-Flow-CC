import { createDomainEvent } from "./domain-event.js";
export const sliceStatusChangedEvent = (sliceId, from, to) => createDomainEvent("SLICE_STATUS_CHANGED", { sliceId, from, to });
//# sourceMappingURL=slice-status-changed.event.js.map