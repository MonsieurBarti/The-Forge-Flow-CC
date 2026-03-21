import { detectClusters } from '../../application/compose/detect-clusters.js';

export const composeDetectCmd = async (args: string[]): Promise<string> => {
  const input = args[0];
  if (!input) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: compose:detect <co-activations-json>' } });
  try {
    const data = JSON.parse(input);
    const totalSessions = parseInt(args[1] ?? '20', 10);
    const result = detectClusters(data, { totalSessions });
    return JSON.stringify({ ok: true, data: result });
  } catch {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Invalid JSON' } });
  }
};
