const WORKFLOW_CHAIN: Record<string, string | null> = {
	discussing: "research-slice",
	researching: "plan-slice",
	planning: null,
	executing: "verify-slice",
	verifying: "ship-slice",
	reviewing: "ship-slice",
	completing: null,
	closed: null,
};
const HUMAN_GATES = new Set(["planning", "completing"]);

/**
 * User-facing command suggestion per slice status.
 *
 * Aligns with @references/next-steps.md. Unlike {@link nextWorkflow} (which
 * returns the internal workflow id used for auto-transitions), this returns the
 * slash command the user should run to advance from the current status.
 *
 * For `closed`, the current slice is done — the suggestion moves to the NEXT
 * slice, which always starts in `discussing`.
 */
const SUGGESTED_COMMAND: Record<string, string> = {
	discussing: "/tff:discuss",
	researching: "/tff:research",
	planning: "/tff:plan",
	executing: "/tff:execute",
	verifying: "/tff:verify",
	reviewing: "/tff:ship",
	completing: "/tff:complete-milestone",
	closed: "/tff:discuss",
};

export function nextWorkflow(currentStatus: string): string | null {
	return WORKFLOW_CHAIN[currentStatus] ?? null;
}

/**
 * Return the suggested user-facing `/tff:<cmd>` for the given slice status.
 * Returns null for unknown statuses.
 */
export function suggestedCommand(currentStatus: string): string | null {
	return SUGGESTED_COMMAND[currentStatus] ?? null;
}

export function shouldAutoTransition(
	currentStatus: string,
	autonomyMode: "guided" | "plan-to-pr",
): boolean {
	if (autonomyMode === "guided") return false;
	if (HUMAN_GATES.has(currentStatus)) return false;
	return WORKFLOW_CHAIN[currentStatus] !== null;
}
