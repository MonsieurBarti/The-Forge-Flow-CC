interface CoActivation {
  skills: string[];
  sessions: number;
}

interface ClusterOptions {
  totalSessions: number;
  threshold?: number;
}

export interface SkillCluster {
  skills: string[];
  coActivationRate: number;
  sessions: number;
}

export const detectClusters = (
  coActivations: CoActivation[],
  options: ClusterOptions,
): SkillCluster[] => {
  const threshold = options.threshold ?? 0.7;

  return coActivations
    .filter((ca) => ca.skills.length >= 2)
    .map((ca) => ({
      skills: ca.skills.sort(),
      coActivationRate: options.totalSessions > 0 ? ca.sessions / options.totalSessions : 0,
      sessions: ca.sessions,
    }))
    .filter((c) => c.coActivationRate >= threshold)
    .sort((a, b) => b.coActivationRate - a.coActivationRate);
};
