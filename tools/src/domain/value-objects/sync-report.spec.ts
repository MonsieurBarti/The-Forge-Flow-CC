import { describe, expect, it } from 'vitest';
import { emptySyncReport, SyncReportSchema } from './sync-report.js';

describe('SyncReport', () => {
  it('should create an empty sync report', () => {
    const report = emptySyncReport();
    expect(report.created).toEqual([]);
    expect(report.updated).toEqual([]);
    expect(report.conflicts).toEqual([]);
    expect(report.orphans).toEqual([]);
  });

  it('should accept a populated report', () => {
    const report = SyncReportSchema.parse({
      created: [{ entityId: 'e1', source: 'markdown' }],
      updated: [{ entityId: 'e2', field: 'status', source: 'beads' }],
      conflicts: [{ entityId: 'e3', field: 'content', winner: 'markdown', mdValue: 'a', beadValue: 'b' }],
      orphans: [{ entityId: 'e4', location: 'beads' }],
    });
    expect(report.created).toHaveLength(1);
    expect(report.conflicts[0].winner).toBe('markdown');
  });
});
