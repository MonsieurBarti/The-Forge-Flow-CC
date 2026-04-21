import { type SkillInput, validateSkill } from "../../application/skills/validate-skill.js";
import { isOk } from "../../domain/result.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const skillsValidateSchema: CommandSchema = {
	name: "skills:validate",
	purpose: "Validate a skill definition",
	mutates: false,
	requiredFlags: [
		{
			name: "skill",
			type: "json",
			description: "Skill definition as JSON",
		},
	],
	optionalFlags: [],
	examples: ['skills:validate --skill \'{"name":"test","description":"A test skill"}\''],
};

export const skillsValidateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, skillsValidateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	try {
		const data = parsed.data.skill as SkillInput;
		const result = validateSkill(data);
		if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
		return JSON.stringify({ ok: false, error: result.error });
	} catch (e) {
		return JSON.stringify({ ok: false, error: { code: "INVALID_ARGS", message: String(e) } });
	}
};
