import { shouldAutoTransition } from "../../application/lifecycle/chain-workflow.js";
export const workflowShouldAutoCmd = async (args) => {
    const [status, mode] = args;
    if (!status || !mode)
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: workflow:should-auto <status> <mode>" },
        });
    return JSON.stringify({
        ok: true,
        data: { autoTransition: shouldAutoTransition(status, mode) },
    });
};
//# sourceMappingURL=workflow-should-auto.cmd.js.map