import { type Result, Ok, Err } from '../../domain/result.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';

interface SkillInput {
  name: string;
  description: string;
  content: string;
}

interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

const NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const validateSkill = (
  input: SkillInput,
): Result<ValidationResult, DomainError> => {
  const warnings: string[] = [];

  // Name validation
  if (input.name.length === 0 || input.name.length > 64) {
    return Err(createDomainError('VALIDATION_ERROR', `Skill name must be 1-64 characters, got ${input.name.length}`));
  }

  if (!NAME_REGEX.test(input.name)) {
    return Err(createDomainError('VALIDATION_ERROR', `Skill name "${input.name}" must be lowercase letters, numbers, and single hyphens only`));
  }

  if (input.name.includes('--')) {
    return Err(createDomainError('VALIDATION_ERROR', 'Skill name must not contain consecutive hyphens'));
  }

  // Description quality
  if (!input.description.toLowerCase().startsWith('use when')) {
    warnings.push('Description should start with "Use when"');
  }

  return Ok({ valid: true, warnings });
};
