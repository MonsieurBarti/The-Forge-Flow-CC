import { enforceFreshReviewer } from '../../application/review/enforce-fresh-reviewer.js';
import { isOk } from '../../domain/result.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';

export const reviewCheckFreshCmd = async (args: string[]): Promise<string> => {
  const [sliceId, agent] = args;
  if (!sliceId || !agent)
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: review:check-fresh <slice-id> <agent>' },
    });
  // TODO(T07-T12): inject new ReviewStore adapter once SQLite review store is implemented
  const { store: _beadStore } = await createBeadAdapter();
  // reviewStore will be wired up in T07-T12 migration; placeholder avoids missing-module error
  const reviewStore: Parameters<typeof enforceFreshReviewer>[1]['reviewStore'] = {
    getExecutorsForSlice: async () => ({ ok: true, data: [] }),
    record: async () => ({ ok: true, data: undefined }),
    getReviewsForSlice: async () => ({ ok: true, data: [] }),
  } as unknown as Parameters<typeof enforceFreshReviewer>[1]['reviewStore'];
  const result = await enforceFreshReviewer({ sliceId, reviewerAgent: agent }, { reviewStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
