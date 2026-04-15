import { type DomainError } from "../../domain/errors/domain-error.js";
import { type Result } from "../../domain/result.js";
interface SkillInput {
    name: string;
    description: string;
    content?: string;
    existingSkillNames?: string[];
    maxSize?: number;
}
interface ValidationResult {
    valid: boolean;
    warnings: string[];
}
export declare const validateSkill: (input: SkillInput) => Result<ValidationResult, DomainError>;
export {};
//# sourceMappingURL=validate-skill.d.ts.map