import { createDomainError } from "./domain-error.js";

export const emptyPoolError = (workflowId: string) =>
	createDomainError("EMPTY_POOL", `Routing pool for workflow "${workflowId}" has no agents`, {
		workflowId,
	});
