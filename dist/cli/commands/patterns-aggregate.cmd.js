import { aggregatePatterns } from "../../application/patterns/aggregate-patterns.js";
import { isOk } from "../../domain/result.js";
import { JsonlStoreAdapter } from "../../infrastructure/adapters/jsonl/jsonl-store.adapter.js";
export const patternsAggregateCmd = async (args) => {
    const store = new JsonlStoreAdapter(".tff/observations");
    const patternsResult = await store.readPatterns();
    if (!isOk(patternsResult))
        return JSON.stringify({ ok: false, error: patternsResult.error });
    const minCount = parseInt(args[0] ?? "3", 10);
    const result = aggregatePatterns(patternsResult.data, { minCount });
    await store.writePatterns(result);
    return JSON.stringify({ ok: true, data: result });
};
//# sourceMappingURL=patterns-aggregate.cmd.js.map