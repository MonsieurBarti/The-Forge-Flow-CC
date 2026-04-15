import { validateSkill } from "../../application/skills/validate-skill.js";
import { isOk } from "../../domain/result.js";
export const skillsValidateCmd = async (args) => {
    const input = args[0];
    if (!input)
        return JSON.stringify({
            ok: false,
            error: { code: "INVALID_ARGS", message: "Usage: skills:validate <json>" },
        });
    try {
        const data = JSON.parse(input);
        const result = validateSkill(data);
        if (isOk(result))
            return JSON.stringify({ ok: true, data: result.data });
        return JSON.stringify({ ok: false, error: result.error });
    }
    catch {
        return JSON.stringify({ ok: false, error: { code: "INVALID_ARGS", message: "Invalid JSON" } });
    }
};
//# sourceMappingURL=skills-validate.cmd.js.map