import { type Pattern } from '../../domain/value-objects/pattern.js';

interface AggregateOptions {
  minCount?: number;
  totalSessions?: number;
  noiseThreshold?: number;
}

export const aggregatePatterns = (
  patterns: Pattern[],
  options: AggregateOptions = {},
): Pattern[] => {
  const minCount = options.minCount ?? 3;
  const totalSessions = options.totalSessions ?? 0;
  const noiseThreshold = options.noiseThreshold ?? 0.8;

  return patterns.filter((p) => {
    // Filter below minimum count
    if (p.count < minCount) return false;

    // Filter framework noise
    if (totalSessions > 0 && p.sessions / totalSessions >= noiseThreshold) return false;

    return true;
  });
};
