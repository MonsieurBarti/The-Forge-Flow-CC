import { classifyComplexity, type ComplexitySignals } from "../../application/lifecycle/classify-complexity.js";
import { parseFlags, type CommandSchema } from "../utils/flag-parser.js";

export const sliceClassifySchema: CommandSchema = {
	name: "slice:classify",
	purpose: "Classify a slice's complexity tier based on signals",
	requiredFlags: [
		{
			name: "signals",
			type: "json",
			description: "JSON object with classification signals",
		},
	],
	optionalFlags: [],
	examples: ['slice:classify --signals \'{"hasResearch":true,"taskCount":5}"'],
};

export const sliceClassifyCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, sliceClassifySchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { signals } = parsed.data as { signals: ComplexitySignals };

	try {
		const tier = classifyComplexity(signals);
		return JSON.stringify({ ok: true, data: { tier } });
	} catch (e) {
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: `Classification failed: ${String(e)}` },
		});
	}
};
