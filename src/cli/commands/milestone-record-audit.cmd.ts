import { recordAuditUseCase } from "../../application/milestone/record-audit.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveMilestoneId } from "../utils/resolve-id.js";

export const milestoneRecordAuditSchema: CommandSchema = {
	name: "milestone:record-audit",
	purpose: "Record the result of a milestone audit",
	requiredFlags: [
		{ name: "milestone-id", type: "string", description: "Milestone label or UUID" },
		{ name: "verdict", type: "string", description: "Audit verdict", enum: ["ready", "not_ready"] },
	],
	optionalFlags: [{ name: "notes", type: "string", description: "Optional notes" }],
	examples: ["milestone:record-audit --milestone-id M01 --verdict ready"],
};

export const milestoneRecordAuditCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, milestoneRecordAuditSchema);
	if (!parsed.ok) return JSON.stringify(parsed);
	const {
		"milestone-id": label,
		verdict,
		notes,
	} = parsed.data as {
		"milestone-id": string;
		verdict: "ready" | "not_ready";
		notes?: string;
	};

	const stores = createClosableStateStoresUnchecked();
	try {
		const resolved = resolveMilestoneId(label, stores.milestoneStore);
		if (!resolved.ok) return JSON.stringify({ ok: false, error: resolved.error });

		const res = await recordAuditUseCase(
			{ milestoneId: resolved.data, verdict, notes },
			{ milestoneAuditStore: stores.milestoneAuditStore },
		);
		if (isOk(res)) return JSON.stringify({ ok: true, data: null });
		return JSON.stringify({ ok: false, error: res.error });
	} finally {
		stores.close();
	}
};
