import { checkStaleClaims } from "../../application/claims/check-stale-claims.js";
import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const claimCheckStaleSchema: CommandSchema = {
	name: "claim:check-stale",
	purpose: "Check for stale task claims",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [
		{
			name: "ttl-minutes",
			type: "number",
			description: "Time-to-live in minutes (default: 30)",
		},
	],
	examples: ["claim:check-stale", "claim:check-stale --ttl-minutes 60"],
};

export const claimCheckStaleCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, claimCheckStaleSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const ttlMinutes = (parsed.data["ttl-minutes"] as number | undefined) ?? 30;

	if (ttlMinutes <= 0) {
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: "ttl-minutes must be a positive number" },
		});
	}

	const { taskStore } = createClosableStateStoresUnchecked();
	const result = await checkStaleClaims({ ttlMinutes }, { taskStore });
	if (isOk(result)) {
		return JSON.stringify({
			ok: true,
			data: {
				staleClaims: result.data.staleClaims.map((t) => ({
					id: t.id,
					title: t.title,
					claimedAt: t.claimedAt,
				})),
				count: result.data.staleClaims.length,
			},
		});
	}
	return JSON.stringify({ ok: false, error: result.error });
};
