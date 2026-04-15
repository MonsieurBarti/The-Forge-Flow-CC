import { describe, expect, it } from 'vitest';
import { canTransition, type SliceStatus } from '../../domain/value-objects/slice-status.js';
import { nextWorkflow, shouldAutoTransition } from './chain-workflow.js';

describe('autonomous flow - integration', () => {
  it('should produce valid transitions from discussing to first gate', () => {
    const statusMap: Record<string, SliceStatus> = {
      'research-slice': 'researching',
      'plan-slice': 'planning',
      'verify-slice': 'verifying',
      'ship-slice': 'reviewing',
    };

    let current: SliceStatus = 'discussing';
    const visited: SliceStatus[] = [current];

    while (true) {
      const next = nextWorkflow(current);
      if (!next) break;
      const nextStatus = statusMap[next];
      if (!nextStatus) break;
      // Verify the domain state machine allows this transition
      expect(canTransition(current, nextStatus)).toBe(true);
      current = nextStatus;
      visited.push(current);
      if (visited.length > 10) break; // safety
    }

    expect(current).toBe('planning'); // first human gate
  });

  it('should auto-transition all non-gate statuses in plan-to-pr', () => {
    const nonGates = ['discussing', 'researching', 'executing', 'verifying', 'reviewing'];
    for (const status of nonGates) {
      expect(shouldAutoTransition(status, 'plan-to-pr')).toBe(true);
    }
  });

  it('should block at all gates in plan-to-pr', () => {
    const gates = ['planning', 'completing'];
    for (const status of gates) {
      expect(shouldAutoTransition(status, 'plan-to-pr')).toBe(false);
    }
  });

  it('should never auto-transition in guided mode', () => {
    const allStatuses = ['discussing', 'researching', 'planning', 'executing', 'verifying', 'reviewing', 'completing'];
    for (const status of allStatuses) {
      expect(shouldAutoTransition(status, 'guided')).toBe(false);
    }
  });
});
