import { describe, it, expect } from 'vitest';
import { createBeadAdapter } from './bead-adapter-factory';

describe('bead-adapter-factory', () => {
  it('should return markdown type when bd unavailable', async () => {
    const result = await createBeadAdapter({ checkBd: async () => false, basePath: '/tmp/test' });
    expect(result.type).toBe('markdown');
  });

  it('should return beads type when bd available', async () => {
    const result = await createBeadAdapter({ checkBd: async () => true, basePath: '/tmp/test' });
    expect(result.type).toBe('beads');
  });
});
