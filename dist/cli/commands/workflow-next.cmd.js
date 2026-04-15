import { nextWorkflow } from "../../application/lifecycle/chain-workflow.js";
export const workflowNextCmd = async (args) => {
    const status = args[0];
    if (!status)
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: workflow:next <status>" },
        });
    return JSON.stringify({ ok: true, data: { next: nextWorkflow(status) } });
};
//# sourceMappingURL=workflow-next.cmd.js.map