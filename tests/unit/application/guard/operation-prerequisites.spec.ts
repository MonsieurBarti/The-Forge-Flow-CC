import { describe, expect, it } from 'vitest';
import type { SliceStatus } from '../../src/../domain/value-objects/slice-status.js';
import {
  generateRecoveryHint,
  getPrerequisite,
  getRequiredStatus,
  getSupportedOperations,
  isValidOperation,
  type WorkflowOperation,
} from '../../../src/application/guard/operation-prerequisites.js';

describe('operation-prerequisites', () => {
  describe('getPrerequisite', () => {
    it('should return prerequisite for each valid operation', () => {
      const operations: WorkflowOperation[] = ['discuss', 'research', 'plan', 'execute', 'verify', 'ship', 'complete'];

      for (const op of operations) {
        const prereq = getPrerequisite(op);
        expect(prereq).toBeDefined();
        expect(prereq.operation).toBe(op);
        expect(prereq.requiredStatus).toBeDefined();
        expect(prereq.description).toBeDefined();
      }
    });

    it('should map operations to correct required statuses', () => {
      expect(getPrerequisite('discuss').requiredStatus).toBe('discussing');
      expect(getPrerequisite('research').requiredStatus).toBe('researching');
      expect(getPrerequisite('plan').requiredStatus).toBe('planning');
      expect(getPrerequisite('execute').requiredStatus).toBe('executing');
      expect(getPrerequisite('verify').requiredStatus).toBe('verifying');
      expect(getPrerequisite('ship').requiredStatus).toBe('reviewing');
      expect(getPrerequisite('complete').requiredStatus).toBe('completing');
    });
  });

  describe('getSupportedOperations', () => {
    it('should return all 7 workflow operations', () => {
      const ops = getSupportedOperations();
      expect(ops).toHaveLength(7);
      expect(ops).toContain('discuss');
      expect(ops).toContain('research');
      expect(ops).toContain('plan');
      expect(ops).toContain('execute');
      expect(ops).toContain('verify');
      expect(ops).toContain('ship');
      expect(ops).toContain('complete');
    });

    it('should return readonly array (compile-time only)', () => {
      const ops = getSupportedOperations();
      // TypeScript enforces readonly at compile time
      // Runtime arrays can still be modified without Object.freeze()
      expect(ops).toBeInstanceOf(Array);
      expect(ops.length).toBe(7);
    });
  });

  describe('isValidOperation', () => {
    it('should return true for all valid operations', () => {
      expect(isValidOperation('discuss')).toBe(true);
      expect(isValidOperation('research')).toBe(true);
      expect(isValidOperation('plan')).toBe(true);
      expect(isValidOperation('execute')).toBe(true);
      expect(isValidOperation('verify')).toBe(true);
      expect(isValidOperation('ship')).toBe(true);
      expect(isValidOperation('complete')).toBe(true);
    });

    it('should return false for invalid operations', () => {
      expect(isValidOperation('invalid')).toBe(false);
      expect(isValidOperation('')).toBe(false);
      expect(isValidOperation('start')).toBe(false);
      expect(isValidOperation('stop')).toBe(false);
      expect(isValidOperation('unknown')).toBe(false);
    });

    it('should properly narrow types', () => {
      const op = 'execute';
      if (isValidOperation(op)) {
        // TypeScript should know this is a WorkflowOperation
        const prereq = getPrerequisite(op);
        expect(prereq).toBeDefined();
      }
    });
  });

  describe('getRequiredStatus', () => {
    it('should return correct required status for each operation', () => {
      expect(getRequiredStatus('discuss')).toBe('discussing');
      expect(getRequiredStatus('research')).toBe('researching');
      expect(getRequiredStatus('plan')).toBe('planning');
      expect(getRequiredStatus('execute')).toBe('executing');
      expect(getRequiredStatus('verify')).toBe('verifying');
      expect(getRequiredStatus('ship')).toBe('reviewing');
      expect(getRequiredStatus('complete')).toBe('completing');
    });
  });

  describe('generateRecoveryHint', () => {
    describe('when already at required status', () => {
      it('should return ready message', () => {
        const hint = generateRecoveryHint('execute', 'executing', 'executing');
        expect(hint).toBe('Ready to run /tff:execute');
      });
    });

    describe('when direct transition is available', () => {
      it('should suggest next step when blocked on execute from discussing', () => {
        const hint = generateRecoveryHint('execute', 'discussing', 'executing');
        // From discussing, the only valid next step is /tff:research
        expect(hint).toContain('/tff:research');
        expect(hint).toContain('Next:');
      });

      it('should suggest /tff:research when blocked on plan from discussing', () => {
        const hint = generateRecoveryHint('plan', 'discussing', 'planning');
        expect(hint).toContain('/tff:research');
        expect(hint).toContain('Next:');
      });

      it('should suggest valid options from planning for verify', () => {
        const hint = generateRecoveryHint('verify', 'planning', 'verifying');
        // From planning, you can stay in planning or move to executing
        expect(hint).toContain('/tff:plan');
        expect(hint).toContain('/tff:execute');
        expect(hint).toContain('Next:');
      });
    });

    describe('when no valid transitions available', () => {
      it('should indicate closed slice', () => {
        const hint = generateRecoveryHint('execute', 'closed', 'executing');
        expect(hint).toBe('Slice is closed. No further operations available.');
      });
    });

    describe('complex multi-step recovery paths', () => {
      it('should suggest next available step when direct transition not possible', () => {
        // From executing, trying to complete (requires completing status)
        // executing can only go to verifying
        const hint = generateRecoveryHint('complete', 'executing', 'completing');
        expect(hint).toBe('Current status is executing. Next: /tff:verify');
      });

      it('should show multiple options when available', () => {
        // From verifying, trying to complete (requires completing)
        // verifying can go to reviewing or executing
        const hint = generateRecoveryHint('complete', 'verifying', 'completing');
        expect(hint).toMatch(/Current status is verifying\. Next:/);
        expect(hint).toContain('/tff:verify');
        expect(hint).toContain('/tff:execute');
      });
    });

    describe('all operation recovery paths', () => {
      const testCases: Array<{
        op: WorkflowOperation;
        current: SliceStatus;
        required: SliceStatus;
        expectedContains: string;
      }> = [
        { op: 'discuss', current: 'researching', required: 'discussing', expectedContains: '/tff:plan' },
        { op: 'research', current: 'discussing', required: 'researching', expectedContains: '/tff:research' },
        { op: 'plan', current: 'researching', required: 'planning', expectedContains: '/tff:plan' },
        { op: 'execute', current: 'planning', required: 'executing', expectedContains: '/tff:execute' },
        { op: 'verify', current: 'executing', required: 'verifying', expectedContains: '/tff:verify' },
        { op: 'ship', current: 'verifying', required: 'reviewing', expectedContains: '/tff:verify' },
        { op: 'complete', current: 'reviewing', required: 'completing', expectedContains: '/tff:complete' },
      ];

      for (const { op, current, required, expectedContains } of testCases) {
        it(`should guide from ${current} toward ${required} for ${op}`, () => {
          const hint = generateRecoveryHint(op, current, required);
          expect(hint).toContain(expectedContains);
        });
      }
    });
  });
});
