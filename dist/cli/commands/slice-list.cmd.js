import { isOk } from "../../domain/result.js";
import { withBranchGuard } from "../with-branch-guard.js";
export const sliceListCmd = async (args) => {
    const [milestoneId] = args;
    return withBranchGuard(async ({ sliceStore }) => {
        const result = sliceStore.listSlices(milestoneId);
        if (isOk(result))
            return JSON.stringify({ ok: true, data: result.data });
        return JSON.stringify({ ok: false, error: result.error });
    });
};
//# sourceMappingURL=slice-list.cmd.js.map