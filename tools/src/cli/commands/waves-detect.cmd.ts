import { detectWaves } from '../../application/waves/detect-waves.js';
import { isOk } from '../../domain/result.js';

export const wavesDetectCmd = async (args: string[]): Promise<string> => {
  const input = args[0];
  if (!input)
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: waves:detect <json-tasks>' } });
  try {
    const tasks = JSON.parse(input);
    const result = detectWaves(tasks);
    if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
    return JSON.stringify({ ok: false, error: result.error });
  } catch {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Invalid JSON input' } });
  }
};
