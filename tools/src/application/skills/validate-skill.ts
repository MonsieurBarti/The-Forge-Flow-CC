import { createDomainError, type DomainError } from '../../domain/errors/domain-error.js';
import { Err, Ok, type Result } from '../../domain/result.js';

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

const NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const validateSkill = (input: SkillInput): Result<ValidationResult, DomainError> => {
  const warnings: string[] = [];

  // Name validation
  if (input.name.length === 0 || input.name.length > 64) {
    return Err(createDomainError('VALIDATION_ERROR', `Skill name must be 1-64 characters, got ${input.name.length}`));
  }

  if (!NAME_REGEX.test(input.name)) {
    return Err(
      createDomainError(
        'VALIDATION_ERROR',
        `Skill name "${input.name}" must be lowercase letters, numbers, and single hyphens only`,
      ),
    );
  }

  if (input.name.includes('--')) {
    return Err(createDomainError('VALIDATION_ERROR', 'Skill name must not contain consecutive hyphens'));
  }

  // Description quality
  if (!input.description.toLowerCase().startsWith('use when')) {
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

  // Shell injection pattern check
  if (input.content?.match(/\$\(|;\s*(rm|curl|wget|eval)/)) {
    warnings.push('Content contains potential shell injection patterns');
  }

  return Ok({ valid, warnings });
};
