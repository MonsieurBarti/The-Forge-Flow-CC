import { createDomainError, type DomainError } from "./domain-error.js";

export const transactionRollbackError = (cause: unknown): DomainError => {
	const causeMsg = cause instanceof Error ? cause.message : String(cause);
	return createDomainError("TRANSACTION_ROLLBACK", `Transaction rolled back: ${causeMsg}`, {
		cause: causeMsg,
	});
};
