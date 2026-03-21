import { type Pattern } from '../../domain/value-objects/pattern.js';
import { type Candidate } from '../../domain/value-objects/candidate.js';

interface ScoringWeights {
  frequency?: number;
  breadth?: number;
  recency?: number;
  consistency?: number;
}

interface RankOptions {
  totalProjects: number;
  totalSessions: number;
  now: string;
  threshold?: number;
  weights?: ScoringWeights;
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

    const wF = options.weights?.frequency ?? 0.25;
    const wB = options.weights?.breadth ?? 0.30;
    const wR = options.weights?.recency ?? 0.25;
    const wC = options.weights?.consistency ?? 0.20;

    const score = frequency * wF + breadth * wB + recency * wR + consistency * wC;

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
