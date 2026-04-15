import { Ok } from "../../domain/result.js";
const DEFAULT_TTL_MINUTES = 30;
export const checkStaleClaims = async (input, deps) => {
    const ttl = input.ttlMinutes ?? DEFAULT_TTL_MINUTES;
    const result = deps.taskStore.listStaleClaims(ttl);
    if (!result.ok)
        return result;
    return Ok({ staleClaims: result.data });
};
//# sourceMappingURL=check-stale-claims.js.map