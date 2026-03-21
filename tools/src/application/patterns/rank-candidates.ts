import { type Pattern } from '../../domain/value-objects/pattern.js';
import { type Candidate } from '../../domain/value-objects/candidate.js';

interface RankOptions {
  totalProjects: number;
  totalSessions: number;
  now: string;
  threshold?: number;
}

export const rankCandidates = (
  patterns: Pattern[],
  options: RankOptions,
): Candidate[] => {
  const threshold = options.threshold ?? 0;
  const nowMs = new Date(options.now).getTime();

  const scored = patterns.map((p) => {
    const frequency = Math.min(Math.log2(p.count + 1) / 10, 1.0);
    const breadth = options.totalProjects > 0 ? p.projects / options.totalProjects : 0;
    const ageDays = (nowMs - new Date(p.lastSeen).getTime()) / (24 * 60 * 60 * 1000);
    const recency = Math.exp(-ageDays * Math.LN2 / 14);
    const consistency = options.totalSessions > 0 ? p.sessions / options.totalSessions : 0;

    const score = frequency * 0.25 + breadth * 0.30 + recency * 0.25 + consistency * 0.20;

    return {
      pattern: p.sequence,
      score: Math.round(score * 100) / 100,
      evidence: { count: p.count, sessions: p.sessions, projects: p.projects },
    };
  });

  return scored
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score);
};
