import { listMilestones } from "../../application/milestone/list-milestones.js";
import { isOk } from "../../domain/result.js";
import { withBranchGuard } from "../with-branch-guard.js";
export const milestoneListCmd = async (_args) => {
    return withBranchGuard(async ({ milestoneStore }) => {
        const result = await listMilestones({ milestoneStore });
        if (isOk(result))
            return JSON.stringify({ ok: true, data: result.data });
        return JSON.stringify({ ok: false, error: result.error });
    });
};
//# sourceMappingURL=milestone-list.cmd.js.map