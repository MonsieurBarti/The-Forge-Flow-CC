interface DriftOptions {
  maxDrift?: number;
}

interface DriftResult {
  driftScore: number;
  overThreshold: boolean;
}

export const checkDrift = (original: string, current: string, options: DriftOptions = {}): DriftResult => {
  const maxDrift = options.maxDrift ?? 0.6;

  if (original === current) return { driftScore: 0, overThreshold: false };

  // Simple character-level diff ratio
  const maxLen = Math.max(original.length, current.length);
  if (maxLen === 0) return { driftScore: 0, overThreshold: false };

  let changes = 0;
  for (let i = 0; i < maxLen; i++) {
    if (original[i] !== current[i]) changes++;
  }

  const driftScore = Math.round((changes / maxLen) * 100) / 100;
  return { driftScore, overThreshold: driftScore > maxDrift };
};
