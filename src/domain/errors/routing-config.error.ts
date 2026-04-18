import { createDomainError } from "./domain-error.js";

export const routingConfigError = (message: string, source: string) =>
	createDomainError("ROUTING_CONFIG", `${message} (source: ${source})`, { message, source });
