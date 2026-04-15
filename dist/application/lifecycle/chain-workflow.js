const WORKFLOW_CHAIN = {
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
export function nextWorkflow(currentStatus) {
    return WORKFLOW_CHAIN[currentStatus] ?? null;
}
export function shouldAutoTransition(currentStatus, autonomyMode) {
    if (autonomyMode === "guided")
        return false;
    if (HUMAN_GATES.has(currentStatus))
        return false;
    return WORKFLOW_CHAIN[currentStatus] !== null;
}
//# sourceMappingURL=chain-workflow.js.map