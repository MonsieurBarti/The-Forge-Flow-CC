import { createDomainError } from "./domain-error.js";
export const syncFailedError = (reason, context) => createDomainError("SYNC_FAILED", `State branch sync failed: ${reason}`, context);
//# sourceMappingURL=sync-failed.error.js.map