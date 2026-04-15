import { isOk } from "../../domain/result.js";
import { withBranchGuard } from "../with-branch-guard.js";
export const milestoneCloseCmd = async (args) => {
    const [milestoneId, ...rest] = args;
    if (!milestoneId)
        return JSON.stringify({
            ok: false,
            error: {
                code: "INVALID_ARGS",
                message: 'Usage: milestone:close <milestone-id> [--reason "..."]',
            },
        });
    let reason;
    const reasonIdx = rest.indexOf("--reason");
    if (reasonIdx !== -1 && rest[reasonIdx + 1]) {
        reason = rest.slice(reasonIdx + 1).join(" ");
    }
    return withBranchGuard(async ({ milestoneStore }) => {
        const result = milestoneStore.closeMilestone(milestoneId, reason);
        if (isOk(result))
            return JSON.stringify({ ok: true, data: { status: "closed", reason } });
        return JSON.stringify({ ok: false, error: result.error });
    });
};
//# sourceMappingURL=milestone-close.cmd.js.map