import { getProject } from "../../application/project/get-project.js";
import { isOk } from "../../domain/result.js";
import { withBranchGuard } from "../with-branch-guard.js";

export const projectGetCmd = async (_args: string[]): Promise<string> => {
	return withBranchGuard(async ({ projectStore }) => {
		const result = await getProject({ projectStore });
		if (isOk(result)) {
			if (result.data === null) {
				return JSON.stringify({
					ok: false,
					error: { code: "NOT_FOUND", message: "No tff project found. Run /tff:new first." },
				});
			}
			return JSON.stringify({ ok: true, data: result.data });
		}
		return JSON.stringify({ ok: false, error: result.error });
	});
};
