import { isOk } from "../../domain/result.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";

export const sliceListCmd = async (args: string[]): Promise<string> => {
	const [milestoneId] = args;

	const { sliceStore } = createClosableStateStoresUnchecked();
	const result = sliceStore.listSlices(milestoneId);
	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
