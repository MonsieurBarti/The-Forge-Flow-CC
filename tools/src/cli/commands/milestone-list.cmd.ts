import { listMilestones } from '../../application/milestone/list-milestones.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { isOk } from '../../domain/result.js';

export const milestoneListCmd = async (_args: string[]): Promise<string> => {
  const beadStore = new BdCliAdapter();
  const result = await listMilestones({ beadStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
