import { isOk } from "../../domain/result.js";
import { ObservationSchema } from "../../domain/value-objects/observation.js";
import { JsonlStoreAdapter } from "../../infrastructure/adapters/jsonl/jsonl-store.adapter.js";

export const observeRecordCmd = async (args: string[]): Promise<string> => {
	const input = args[0];
	if (!input)
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: "Usage: observe:record <json>" },
		});
	try {
		const obs = ObservationSchema.parse(JSON.parse(input));
		const store = new JsonlStoreAdapter(".tff/observations");
		const result = await store.appendObservation(obs);
		if (isOk(result)) return JSON.stringify({ ok: true, data: null });
		return JSON.stringify({ ok: false, error: result.error });
	} catch (e) {
		return JSON.stringify({ ok: false, error: { code: "INVALID_ARGS", message: String(e) } });
	}
};
