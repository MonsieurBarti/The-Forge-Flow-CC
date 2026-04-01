import { describe, expect, it } from 'vitest';
import { RestoreResultSchema } from './restore-result.js';

describe('RestoreResult', () => {
  it('should validate a valid restore result', () => {
    const result = RestoreResultSchema.safeParse({ filesRestored: 5, schemaVersion: 2 });
    expect(result.success).toBe(true);
  });

  it('should reject negative filesRestored', () => {
    const result = RestoreResultSchema.safeParse({ filesRestored: -1, schemaVersion: 2 });
    expect(result.success).toBe(false);
  });
});
