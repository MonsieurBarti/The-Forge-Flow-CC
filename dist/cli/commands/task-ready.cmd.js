import { isOk } from "../../domain/result.js";
import { withBranchGuard } from "../with-branch-guard.js";
export const taskReadyCmd = async (args) => {
    const [sliceId] = args;
    if (!sliceId)
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: task:ready <slice-id>" },
        });
    return withBranchGuard(async ({ taskStore }) => {
        const result = taskStore.listReadyTasks(sliceId);
        if (isOk(result))
            return JSON.stringify({ ok: true, data: result.data });
        return JSON.stringify({ ok: false, error: result.error });
    });
};
//# sourceMappingURL=task-ready.cmd.js.map