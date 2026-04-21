import { checkAuditPassed } from "../../application/milestone/check-audit-passed.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveMilestoneId } from "../utils/resolve-id.js";

export const milestoneAuditStatusSchema: CommandSchema = {
	name: "milestone:audit-status",
	purpose: "Check whether a milestone has a passing audit (gate for complete-milestone)",
	mutates: false,
	requiredFlags: [{ name: "milestone-id", type: "string", description: "Milestone label or UUID" }],
	optionalFlags: [],
	examples: ["milestone:audit-status --milestone-id M01"],
};

export const milestoneAuditStatusCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, milestoneAuditStatusSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const { "milestone-id": label } = parsed.data as { "milestone-id": string };

	const stores = createClosableStateStoresUnchecked();
	try {
		const resolved = resolveMilestoneId(label, stores.milestoneStore);
		if (!resolved.ok) return JSON.stringify({ ok: false, error: resolved.error });
		const result = checkAuditPassed(resolved.data, stores.milestoneAuditStore);
		if (isOk(result)) return JSON.stringify({ ok: true, data: { verdict: "ready" } });
		return JSON.stringify({ ok: false, error: result.error });
	} finally {
		stores.close();
	}
};
