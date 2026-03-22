import { describe, it, expect } from 'vitest';
import { classifyComplexity } from './classify-complexity.js';

const base = {
  taskCount: 1, estimatedFilesAffected: 1, newFilesCreated: 0,
  modulesAffected: 1, hasExternalIntegrations: false,
  requiresInvestigation: false, architectureImpact: false, unknownsSurfaced: 0,
};

describe('classifyComplexity', () => {
  it('should classify as S only when single-file, no new files, no investigation, no unknowns', () => {
    expect(classifyComplexity(base)).toBe('S');
  });

  it('should classify as F-lite when multiple files affected', () => {
    expect(classifyComplexity({ ...base, estimatedFilesAffected: 2 })).toBe('F-lite');
  });

  it('should classify as F-lite when new files are created', () => {
    expect(classifyComplexity({ ...base, newFilesCreated: 1 })).toBe('F-lite');
  });

  it('should classify as F-lite when investigation is required', () => {
    expect(classifyComplexity({ ...base, requiresInvestigation: true })).toBe('F-lite');
  });

  it('should classify as F-lite when architecture impact exists', () => {
    expect(classifyComplexity({ ...base, architectureImpact: true })).toBe('F-lite');
  });

  it('should classify as F-lite when unknowns are surfaced', () => {
    expect(classifyComplexity({ ...base, unknownsSurfaced: 1 })).toBe('F-lite');
  });

  it('should classify as F-full for external integrations regardless of size', () => {
    expect(classifyComplexity({ ...base, hasExternalIntegrations: true })).toBe('F-full');
  });

  it('should classify as F-full for large task count', () => {
    expect(classifyComplexity({ ...base, taskCount: 8 })).toBe('F-full');
  });

  it('should classify as F-full for many modules', () => {
    expect(classifyComplexity({ ...base, modulesAffected: 4 })).toBe('F-full');
  });

  it('should default to F-lite for moderate scope', () => {
    expect(classifyComplexity({
      taskCount: 5, estimatedFilesAffected: 8, newFilesCreated: 2,
      modulesAffected: 2, hasExternalIntegrations: false,
      requiresInvestigation: true, architectureImpact: false, unknownsSurfaced: 1,
    })).toBe('F-lite');
  });
});
