import { checkDrift } from "../../application/skills/check-drift.js";
export const skillsDriftCmd = async (args) => {
    const [original, current] = args;
    if (!original || !current)
        return JSON.stringify({
            ok: false,
            error: {
                code: "INVALID_ARGS",
                message: "Usage: skills:drift <original-content> <current-content>",
            },
        });
    const result = checkDrift(original, current);
    return JSON.stringify({ ok: true, data: result });
};
//# sourceMappingURL=skills-drift.cmd.js.map