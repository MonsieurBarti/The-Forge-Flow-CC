import { describe, expect, it } from 'vitest';
import { alreadyClaimedError } from './already-claimed.error.js';
import { DomainErrorCodeSchema } from './domain-error.js';
import { hasOpenChildrenError } from './has-open-children.error.js';
import { versionMismatchError } from './version-mismatch.error.js';

describe('DomainErrorCodeSchema', () => {
  it('includes ALREADY_CLAIMED', () => {
    expect(DomainErrorCodeSchema.safeParse('ALREADY_CLAIMED').success).toBe(true);
  });
  it('includes VERSION_MISMATCH', () => {
    expect(DomainErrorCodeSchema.safeParse('VERSION_MISMATCH').success).toBe(true);
  });
  it('includes HAS_OPEN_CHILDREN', () => {
    expect(DomainErrorCodeSchema.safeParse('HAS_OPEN_CHILDREN').success).toBe(true);
  });
});

describe('Error factories', () => {
  it('alreadyClaimedError creates correct error', () => {
    const err = alreadyClaimedError('task-1');
    expect(err.code).toBe('ALREADY_CLAIMED');
    expect(err.message).toContain('task-1');
  });
  it('versionMismatchError creates correct error', () => {
    const err = versionMismatchError(5, 3);
    expect(err.code).toBe('VERSION_MISMATCH');
    expect(err.message).toContain('5');
  });
  it('hasOpenChildrenError creates correct error', () => {
    const err = hasOpenChildrenError('milestone-1', 3);
    expect(err.code).toBe('HAS_OPEN_CHILDREN');
    expect(err.message).toContain('3');
  });
});
