import { detectClusters, type Cluster } from "../../application/compose/detect-clusters.js";
import type { ObservationSchema } from "../../domain/value-objects/observation.js";
import type { z } from "zod";
import { parseFlags, type CommandSchema } from "../utils/flag-parser.js";

type Observation = z.infer<typeof ObservationSchema>;

export const composeDetectSchema: CommandSchema = {
	name: "compose:detect",
	purpose: "Detect clusters from observations",
	requiredFlags: [
		{
			name: "observations",
			type: "json",
			description: "JSON array of observations",
		},
	],
	optionalFlags: [
		{
			name: "options",
			type: "json",
			description: "JSON object with detection options",
		},
	],
	examples: ['compose:detect --observations \'[{"tool":"Read"},{"tool":"Write"}]\''],
};

export const composeDetectCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, composeDetectSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	try {
		const observations = parsed.data.observations as Observation[];
		const opts = (parsed.data.options as Record<string, unknown>) ?? {};
		const result: Cluster[] = detectClusters(observations, opts);
		return JSON.stringify({ ok: true, data: result });
	} catch (e) {
		return JSON.stringify({ ok: false, error: { code: "INVALID_ARGS", message: String(e) } });
	}
};
