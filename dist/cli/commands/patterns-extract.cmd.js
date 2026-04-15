import { extractNgrams } from "../../application/patterns/extract-ngrams.js";
import { isOk } from "../../domain/result.js";
import { JsonlStoreAdapter } from "../../infrastructure/adapters/jsonl/jsonl-store.adapter.js";
export const patternsExtractCmd = async (_args) => {
    const store = new JsonlStoreAdapter(".tff/observations");
    const obsResult = await store.readObservations();
    if (!isOk(obsResult))
        return JSON.stringify({ ok: false, error: obsResult.error });
    const bigrams = extractNgrams(obsResult.data, 2);
    const trigrams = extractNgrams(obsResult.data, 3);
    const all = [...bigrams, ...trigrams];
    // Persist extracted patterns so aggregate can read them
    await store.writePatterns(all);
    return JSON.stringify({ ok: true, data: all });
};
//# sourceMappingURL=patterns-extract.cmd.js.map