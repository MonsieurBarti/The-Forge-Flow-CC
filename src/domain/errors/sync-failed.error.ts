import { createDomainError } from "./domain-error.js";

export const syncFailedError = (reason: string, context?: Record<string, unknown>) =>
	createDomainError("SYNC_FAILED", `State branch sync failed: ${reason}`, context);
