import { rankCandidates } from '../../application/patterns/rank-candidates.js';
import { isOk } from '../../domain/result.js';
import { JsonlStoreAdapter } from '../../infrastructure/adapters/jsonl/jsonl-store.adapter.js';

export const patternsRankCmd = async (args: string[]): Promise<string> => {
  const store = new JsonlStoreAdapter('.tff/observations');
  const patternsResult = await store.readPatterns();
  if (!isOk(patternsResult)) return JSON.stringify({ ok: false, error: patternsResult.error });
  const obsResult = await store.readObservations();
  const totalSessions = isOk(obsResult) ? new Set(obsResult.data.map((o) => o.session)).size : 1;
  const totalProjects = isOk(obsResult) ? new Set(obsResult.data.map((o) => o.project)).size : 1;
  const threshold = parseFloat(args[0] ?? '0.5');
  const candidates = rankCandidates(patternsResult.data, {
    totalProjects,
    totalSessions,
    now: new Date().toISOString().slice(0, 10),
    threshold,
  });
  await store.writeCandidates(candidates);
  return JSON.stringify({ ok: true, data: candidates });
};
