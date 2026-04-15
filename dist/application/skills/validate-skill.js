import { createDomainError } from "../../domain/errors/domain-error.js";
import { Err, Ok } from "../../domain/result.js";
const NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
export const validateSkill = (input) => {
    const warnings = [];
    // Name validation
    if (input.name.length === 0 || input.name.length > 64) {
        return Err(createDomainError("VALIDATION_ERROR", `Skill name must be 1-64 characters, got ${input.name.length}`));
    }
    if (!NAME_REGEX.test(input.name)) {
        return Err(createDomainError("VALIDATION_ERROR", `Skill name "${input.name}" must be lowercase letters, numbers, and single hyphens only`));
    }
    if (input.name.includes("--")) {
        return Err(createDomainError("VALIDATION_ERROR", "Skill name must not contain consecutive hyphens"));
    }
    // Description quality
    if (!input.description.toLowerCase().startsWith("use when")) {
        warnings.push('Description should start with "Use when"');
    }
    // Name collision check
    let valid = true;
    if (input.existingSkillNames?.includes(input.name)) {
        valid = false;
        warnings.push(`Name collision: skill "${input.name}" already exists`);
    }
    // Size limit check
    const maxSize = input.maxSize ?? 50000;
    if (input.content && input.content.length > maxSize) {
        warnings.push(`Content size ${input.content.length} exceeds max size ${maxSize}`);
    }
    // Shell injection pattern check (allowlist approach)
    if (input.content) {
        const SAFE_COMMAND_PATTERNS = [
            /^`npm\s+(test|run|install)\b[^`]*`$/,
            /^`npx\s+(vitest|tsc|biome)\b[^`]*`$/,
            /^`git\s+(add|commit|status|log|diff|branch|checkout|push|pull|fetch|rebase|merge|rm)\b[^`]*`$/,
            /^`tff-tools\b[^`]*`$/,
            /^`bd\s+(create|update|close|list)\b[^`]*`$/,
            /^`gh\s+(pr|issue)\b[^`]*`$/,
            /^`ls\b[^`]*`$/,
            /^`mkdir\b[^`]*`$/,
        ];
        const DANGEROUS_PATTERNS = [
            /\$\(/, // command substitution $(...)
            /\$\{[^}]*\}/, // variable substitution ${...}
            /;\s*(rm|curl|wget|eval|sudo)\b/, // semicolon-chained dangerous commands
            /\|\s*\b(nc|ncat|bash|sh|zsh)\b/, // pipe to shell/netcat
        ];
        const hasDangerousPattern = DANGEROUS_PATTERNS.some((p) => p.test(input.content));
        // Check backtick-enclosed commands against safe list
        const backtickCommands = input.content.match(/`[^`]+`/g) || [];
        const hasUnsafeBacktickCmd = backtickCommands.some((cmd) => !SAFE_COMMAND_PATTERNS.some((safe) => safe.test(cmd)));
        if (hasDangerousPattern || hasUnsafeBacktickCmd) {
            warnings.push("Content contains potential shell injection patterns");
        }
    }
    return Ok({ valid, warnings });
};
//# sourceMappingURL=validate-skill.js.map