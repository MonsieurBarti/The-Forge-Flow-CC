import { enforceFreshReviewer } from "../../application/review/enforce-fresh-reviewer.js";
import { isOk } from "../../domain/result.js";
import { withBranchGuard } from "../with-branch-guard.js";
export const reviewCheckFreshCmd = async (args) => {
    const [sliceId, agent] = args;
    if (!sliceId || !agent)
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: review:check-fresh <slice-id> <agent>" },
        });
    return withBranchGuard(async ({ taskStore, reviewStore }) => {
        const result = await enforceFreshReviewer({ sliceId, reviewerAgent: agent }, { taskStore, reviewStore });
        if (isOk(result))
            return JSON.stringify({ ok: true, data: null });
        return JSON.stringify({ ok: false, error: result.error });
    });
};
//# sourceMappingURL=review-check-fresh.cmd.js.map