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

export function nextWorkflow(currentStatus: string): string | null {
	return WORKFLOW_CHAIN[currentStatus] ?? null;
}

export function shouldAutoTransition(
	currentStatus: string,
	autonomyMode: "guided" | "plan-to-pr",
): boolean {
	if (autonomyMode === "guided") return false;
	if (HUMAN_GATES.has(currentStatus)) return false;
	return WORKFLOW_CHAIN[currentStatus] !== null;
}
