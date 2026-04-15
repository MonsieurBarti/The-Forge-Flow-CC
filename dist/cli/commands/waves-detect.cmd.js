import { detectWaves } from "../../application/waves/detect-waves.js";
import { isOk } from "../../domain/result.js";
const USAGE = 'Usage: waves:detect \'[{"id":"T01","dependsOn":[]},{"id":"T02","dependsOn":["T01"]}]\'';
export const wavesDetectCmd = async (args) => {
    const input = args[0];
    if (!input)
        return JSON.stringify({ ok: false, error: { code: "INVALID_ARGS", message: USAGE } });
    let tasks;
    try {
        tasks = JSON.parse(input);
    }
    catch {
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: `Invalid JSON. ${USAGE}` },
        });
    }
    if (!Array.isArray(tasks) ||
        !tasks.every((t) => typeof t?.id === "string" && Array.isArray(t?.dependsOn))) {
        return JSON.stringify({
            ok: false,
            error: {
                code: "INVALID_ARGS",
                message: `Each task must have { id: string, dependsOn: string[] }. ${USAGE}`,
            },
        });
    }
    const result = detectWaves(tasks);
    if (isOk(result))
        return JSON.stringify({ ok: true, data: result.data });
    return JSON.stringify({ ok: false, error: result.error });
};
//# sourceMappingURL=waves-detect.cmd.js.map