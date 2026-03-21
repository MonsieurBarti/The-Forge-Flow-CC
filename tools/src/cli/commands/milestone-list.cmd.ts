import { listMilestones } from '../../application/milestone/list-milestones.js';
import { createBeadAdapter } from '../../infrastructure/adapters/beads/bead-adapter-factory.js';
import { isOk } from '../../domain/result.js';

export const milestoneListCmd = async (_args: string[]): Promise<string> => {
  const { store: beadStore } = await createBeadAdapter();
  const result = await listMilestones({ beadStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
