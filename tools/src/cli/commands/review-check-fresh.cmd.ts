import { enforceFreshReviewer } from '../../application/review/enforce-fresh-reviewer.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';
import { ReviewMetadataAdapter } from '../../infrastructure/adapters/review/review-metadata.adapter.js';
import { isOk } from '../../domain/result.js';

export const reviewCheckFreshCmd = async (args: string[]): Promise<string> => {
  const [sliceId, agent] = args;
  if (!sliceId || !agent) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: review:check-fresh <slice-id> <agent>' } });
  const { store: beadStore } = await createBeadAdapter();
  const reviewStore = new ReviewMetadataAdapter(beadStore);
  const result = await enforceFreshReviewer({ sliceId, reviewerAgent: agent }, { reviewStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
