import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";

export const taskReadyCmd = async (args: string[]): Promise<string> => {
	const [sliceId] = args;
	if (!sliceId)
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: "Usage: task:ready <slice-id>" },
		});

	const { taskStore } = createClosableStateStoresUnchecked();
	const result = taskStore.listReadyTasks(sliceId);
	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
