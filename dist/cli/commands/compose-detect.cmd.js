import { detectClusters } from "../../application/compose/detect-clusters.js";
export const composeDetectCmd = async (args) => {
    const input = args[0];
    if (!input)
        return JSON.stringify({
            ok: false,
            error: {
                code: "INVALID_ARGS",
                message: "Usage: compose:detect <observations-json> [options-json]",
            },
        });
    try {
        const observations = JSON.parse(input);
        const opts = args[1] ? JSON.parse(args[1]) : {};
        const result = detectClusters(observations, opts);
        return JSON.stringify({ ok: true, data: result });
    }
    catch {
        return JSON.stringify({ ok: false, error: { code: "INVALID_ARGS", message: "Invalid JSON" } });
    }
};
//# sourceMappingURL=compose-detect.cmd.js.map