import { describe, expect, it } from 'vitest';
import type { SliceStatus } from '../../src/domain/value-objects/slice-status.js';
import {
  assertOperationAllowed,
  getOperationPrerequisite,
  isOperationAllowed,
  OperationBlockedError,
  validateOperation,
} from '../../../src/application/guard/validate-operation.js';

describe('validate-operation', () => {
  describe('validateOperation', () => {
    describe('successful validations', () => {
      it('should allow execute when status is executing', () => {
        const result = validateOperation('execute', 'executing');

        expect(result.allowed).toBe(true);
        expect(result.operation).toBe('execute');
        expect(result.currentStatus).toBe('executing');
        expect(result.requiredStatus).toBe('executing');
        expect(result.message).toBe("Operation 'execute' is ready to execute (status: executing)");
        expect(result.recoveryHint).toBe('');
      });

      it('should allow plan when status is planning', () => {
        const result = validateOperation('plan', 'planning');

        expect(result.allowed).toBe(true);
        expect(result.currentStatus).toBe('planning');
        expect(result.requiredStatus).toBe('planning');
      });

      it('should allow complete when status is completing', () => {
        const result = validateOperation('complete', 'completing');

        expect(result.allowed).toBe(true);
        expect(result.requiredStatus).toBe('completing');
      });

      it('should allow all operations at their respective required statuses', () => {
        const validCases: Array<{ op: string; status: SliceStatus }> = [
          { op: 'discuss', status: 'discussing' },
          { op: 'research', status: 'researching' },
          { op: 'plan', status: 'planning' },
          { op: 'execute', status: 'executing' },
          { op: 'verify', status: 'verifying' },
          { op: 'ship', status: 'reviewing' },
          { op: 'complete', status: 'completing' },
        ];

        for (const { op, status } of validCases) {
          const result = validateOperation(op, status);
          expect(result.allowed).toBe(true);
          expect(result.currentStatus).toBe(status);
          expect(result.requiredStatus).toBe(status);
        }
      });
    });

    describe('blocked validations', () => {
      it('should block execute when status is discussing', () => {
        const result = validateOperation('execute', 'discussing');

        expect(result.allowed).toBe(false);
        expect(result.operation).toBe('execute');
        expect(result.currentStatus).toBe('discussing');
        expect(result.requiredStatus).toBe('executing');
        expect(result.message).toBe('Cannot execute from discussing.');
        expect(result.recoveryHint).toBeTruthy();
        expect(result.recoveryHint.length).toBeGreaterThan(0);
      });

      it('should block execute when status is researching', () => {
        const result = validateOperation('execute', 'researching');

        expect(result.allowed).toBe(false);
        expect(result.currentStatus).toBe('researching');
        expect(result.requiredStatus).toBe('executing');
      });

      it('should block plan when status is closed', () => {
        const result = validateOperation('plan', 'closed');

        expect(result.allowed).toBe(false);
        expect(result.message).toBe('Cannot plan from closed.');
        expect(result.recoveryHint).toContain('closed');
      });

      it('should block ship when status is executing', () => {
        const result = validateOperation('ship', 'executing');

        expect(result.allowed).toBe(false);
        expect(result.requiredStatus).toBe('reviewing');
        expect(result.message).toBe('Cannot ship from executing.');
      });

      it('should provide recovery hints for all blocked cases', () => {
        const blockedCases: Array<{ op: string; status: SliceStatus }> = [
          { op: 'execute', status: 'discussing' },
          { op: 'plan', status: 'discussing' },
          { op: 'verify', status: 'discussing' },
          { op: 'complete', status: 'executing' },
        ];

        for (const { op, status } of blockedCases) {
          const result = validateOperation(op, status);
          expect(result.allowed).toBe(false);
          expect(result.recoveryHint).toBeTruthy();
          expect(result.recoveryHint.length).toBeGreaterThan(0);
        }
      });
    });

    describe('error handling', () => {
      it('should throw for unknown operations', () => {
        expect(() => validateOperation('unknown', 'discussing')).toThrow('Unknown operation: unknown');
      });

      it('should throw for empty operation string', () => {
        expect(() => validateOperation('', 'discussing')).toThrow('Unknown operation');
      });

      it('should include supported operations in error message', () => {
        expect(() => validateOperation('invalid-op', 'discussing')).toThrow(/Supported operations:/);
      });
    });
  });

  describe('assertOperationAllowed', () => {
    it('should not throw when operation is allowed', () => {
      expect(() => assertOperationAllowed('execute', 'executing')).not.toThrow();
    });

    it('should throw OperationBlockedError when operation is blocked', () => {
      expect(() => assertOperationAllowed('execute', 'discussing')).toThrow(OperationBlockedError);
    });

    it('should throw with correct error message', () => {
      try {
        assertOperationAllowed('execute', 'discussing');
        expect.fail('Should have thrown');
      } catch (error) {
        if (error instanceof OperationBlockedError) {
          expect(error.message).toBe('Cannot execute from discussing.');
          expect(error.operation).toBe('execute');
          expect(error.currentStatus).toBe('discussing');
          expect(error.requiredStatus).toBe('executing');
          expect(error.recoveryHint).toBeTruthy();
        } else {
          expect.fail('Expected OperationBlockedError');
        }
      }
    });

    it('should throw for unknown operations', () => {
      expect(() => assertOperationAllowed('unknown', 'discussing')).toThrow('Unknown operation');
    });

    describe('OperationBlockedError', () => {
      it('should expose all validation fields', () => {
        try {
          assertOperationAllowed('execute', 'discussing');
          expect.fail('Should have thrown');
        } catch (error) {
          if (error instanceof OperationBlockedError) {
            expect(error.name).toBe('OperationBlockedError');
            expect(error.operation).toBe('execute');
            expect(error.currentStatus).toBe('discussing');
            expect(error.requiredStatus).toBe('executing');
            expect(error.recoveryHint).toContain('/tff:');
          }
        }
      });

      it('should format display string with BLOCKED prefix', () => {
        try {
          assertOperationAllowed('execute', 'discussing');
          expect.fail('Should have thrown');
        } catch (error) {
          if (error instanceof OperationBlockedError) {
            const display = error.toDisplayString();
            expect(display).toMatch(/^BLOCKED:/);
            expect(display).toContain('Cannot execute from discussing');
            expect(display).toContain(error.recoveryHint);
          }
        }
      });
    });
  });

  describe('isOperationAllowed', () => {
    it('should return true for allowed operations', () => {
      expect(isOperationAllowed('execute', 'executing')).toBe(true);
      expect(isOperationAllowed('plan', 'planning')).toBe(true);
      expect(isOperationAllowed('complete', 'completing')).toBe(true);
    });

    it('should return false for blocked operations', () => {
      expect(isOperationAllowed('execute', 'discussing')).toBe(false);
      expect(isOperationAllowed('execute', 'researching')).toBe(false);
      expect(isOperationAllowed('plan', 'closed')).toBe(false);
    });

    it('should return false for unknown operations', () => {
      expect(isOperationAllowed('unknown', 'discussing')).toBe(false);
      expect(isOperationAllowed('invalid', 'executing')).toBe(false);
    });

    it('should return false for empty operation', () => {
      expect(isOperationAllowed('', 'discussing')).toBe(false);
    });
  });

  describe('getOperationPrerequisite', () => {
    it('should return prerequisite for valid operations', () => {
      const prereq = getOperationPrerequisite('execute');
      expect(prereq.operation).toBe('execute');
      expect(prereq.requiredStatus).toBe('executing');
      expect(prereq.description).toBeDefined();
    });

    it('should throw for unknown operations', () => {
      expect(() => getOperationPrerequisite('unknown')).toThrow('Unknown operation: unknown');
    });
  });

  describe('structured result fields', () => {
    it('should include all required fields in validation result', () => {
      const result = validateOperation('execute', 'discussing');

      // Verify all fields are present and have correct types
      expect(result).toHaveProperty('allowed', false);
      expect(result).toHaveProperty('operation', 'execute');
      expect(result).toHaveProperty('currentStatus', 'discussing');
      expect(result).toHaveProperty('requiredStatus', 'executing');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('recoveryHint');

      // Verify types
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.operation).toBe('string');
      expect(typeof result.currentStatus).toBe('string');
      expect(typeof result.requiredStatus).toBe('string');
      expect(typeof result.message).toBe('string');
      expect(typeof result.recoveryHint).toBe('string');
    });

    it('should use SliceStatus type for status fields', () => {
      const result = validateOperation('execute', 'executing');

      // These should be valid SliceStatus values
      const validStatuses: SliceStatus[] = [
        'discussing',
        'researching',
        'planning',
        'executing',
        'verifying',
        'reviewing',
        'completing',
        'closed',
      ];

      expect(validStatuses).toContain(result.currentStatus);
      expect(validStatuses).toContain(result.requiredStatus);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle all valid status values', () => {
      const allStatuses: SliceStatus[] = [
        'discussing',
        'researching',
        'planning',
        'executing',
        'verifying',
        'reviewing',
        'completing',
        'closed',
      ];

      for (const status of allStatuses) {
        // Each status should either allow or block execute with a valid result
        const result = validateOperation('execute', status);
        expect(result).toBeDefined();
        expect(result.currentStatus).toBe(status);
      }
    });

    it('should provide helpful recovery for closed slice blocking', () => {
      const result = validateOperation('execute', 'closed');

      expect(result.allowed).toBe(false);
      expect(result.recoveryHint).toContain('closed');
      expect(result.recoveryHint).toContain('No further operations');
    });

    it('should validate ship operation requires reviewing status', () => {
      // Ship is special - it requires reviewing, not shipping
      const valid = validateOperation('ship', 'reviewing');
      expect(valid.allowed).toBe(true);

      const invalid = validateOperation('ship', 'verifying');
      expect(invalid.allowed).toBe(false);
      expect(invalid.requiredStatus).toBe('reviewing');
    });
  });
});
