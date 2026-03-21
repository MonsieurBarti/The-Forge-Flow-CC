import { describe, it, expect } from 'vitest';
import { classifyComplexity } from './classify-complexity.js';

describe('classifyComplexity', () => {
  it('should classify as S when few tasks and single module', () => {
    const tier = classifyComplexity({ taskCount: 2, estimatedFilesAffected: 3, modulesAffected: 1, hasExternalIntegrations: false, unknownsSurfaced: 0 });
    expect(tier).toBe('S');
  });

  it('should classify as F-lite for moderate scope', () => {
    const tier = classifyComplexity({ taskCount: 5, estimatedFilesAffected: 8, modulesAffected: 2, hasExternalIntegrations: false, unknownsSurfaced: 1 });
    expect(tier).toBe('F-lite');
  });

  it('should classify as F-full for complex scope', () => {
    const tier = classifyComplexity({ taskCount: 12, estimatedFilesAffected: 20, modulesAffected: 4, hasExternalIntegrations: true, unknownsSurfaced: 3 });
    expect(tier).toBe('F-full');
  });

  it('should classify as F-full when external integrations present regardless of size', () => {
    const tier = classifyComplexity({ taskCount: 3, estimatedFilesAffected: 5, modulesAffected: 2, hasExternalIntegrations: true, unknownsSurfaced: 0 });
    expect(tier).toBe('F-full');
  });

  it('should classify as F-lite when many unknowns even with few tasks', () => {
    const tier = classifyComplexity({ taskCount: 2, estimatedFilesAffected: 3, modulesAffected: 1, hasExternalIntegrations: false, unknownsSurfaced: 3 });
    expect(tier).toBe('F-lite');
  });
});
