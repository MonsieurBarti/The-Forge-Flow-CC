import { classifyComplexity } from "../../application/lifecycle/classify-complexity.js";
export const sliceClassifyCmd = async (args) => {
    const input = args[0];
    if (!input)
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: slice:classify <json-signals>" },
        });
    try {
        const signals = JSON.parse(input);
        const tier = classifyComplexity(signals);
        return JSON.stringify({ ok: true, data: { tier } });
    }
    catch {
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Invalid JSON input" },
        });
    }
};
//# sourceMappingURL=slice-classify.cmd.js.map