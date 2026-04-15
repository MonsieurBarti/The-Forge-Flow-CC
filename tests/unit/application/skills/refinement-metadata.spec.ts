import { describe, expect, it } from 'vitest';
import { canRefine, type RefinementMetadata, recordRefinement } from '../../../src/application/skills/refinement-metadata.js';

describe('refinement-metadata', () => {
  it('should allow refinement when no prior refinements exist', () => {
    const metadata: RefinementMetadata[] = [];
    expect(canRefine('my-skill', metadata, { cooldownDays: 7 })).toBe(true);
  });

  it('should block refinement within cooldown period', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const metadata: RefinementMetadata[] = [
      { skillName: 'my-skill', refinedAt: threeDaysAgo.toISOString(), driftScore: 0.15 },
    ];
    expect(canRefine('my-skill', metadata, { cooldownDays: 7 })).toBe(false);
  });

  it('should allow refinement after cooldown expires', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const metadata: RefinementMetadata[] = [
      { skillName: 'my-skill', refinedAt: tenDaysAgo.toISOString(), driftScore: 0.15 },
    ];
    expect(canRefine('my-skill', metadata, { cooldownDays: 7 })).toBe(true);
  });

  it('should record a refinement event', () => {
    const entry = recordRefinement('my-skill', 0.18);
    expect(entry.skillName).toBe('my-skill');
    expect(entry.driftScore).toBe(0.18);
    expect(entry.refinedAt).toBeDefined();
  });
});
