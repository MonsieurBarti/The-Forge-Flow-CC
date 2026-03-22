import type { Observation } from '../../domain/value-objects/observation.js';
import type { Pattern } from '../../domain/value-objects/pattern.js';

export const extractNgrams = (observations: Observation[], n: number): Pattern[] => {
  if (observations.length < n) return [];

  // Group observations by session
  const sessions = new Map<string, Observation[]>();
  for (const obs of observations) {
    const list = sessions.get(obs.session) ?? [];
    list.push(obs);
    sessions.set(obs.session, list);
  }

  // Extract n-grams per session, track counts
  const ngramMap = new Map<
    string,
    {
      sequence: string[];
      count: number;
      sessionSet: Set<string>;
      projectSet: Set<string>;
      lastSeen: string;
    }
  >();

  for (const [sessionId, sessionObs] of sessions) {
    for (let i = 0; i <= sessionObs.length - n; i++) {
      const sequence = sessionObs.slice(i, i + n).map((o) => o.tool);
      const key = sequence.join('→');

      const existing = ngramMap.get(key);
      const lastTs = sessionObs[i + n - 1].ts;

      if (existing) {
        existing.count++;
        existing.sessionSet.add(sessionId);
        existing.projectSet.add(sessionObs[i].project);
        if (lastTs > existing.lastSeen) existing.lastSeen = lastTs;
      } else {
        ngramMap.set(key, {
          sequence,
          count: 1,
          sessionSet: new Set([sessionId]),
          projectSet: new Set([sessionObs[i].project]),
          lastSeen: lastTs,
        });
      }
    }
  }

  return [...ngramMap.values()].map((v) => ({
    sequence: v.sequence,
    count: v.count,
    sessions: v.sessionSet.size,
    projects: v.projectSet.size,
    lastSeen: v.lastSeen,
  }));
};
