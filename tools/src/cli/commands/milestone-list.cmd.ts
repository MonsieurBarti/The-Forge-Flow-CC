import { listMilestones } from '../../application/milestone/list-milestones.js';
import { isOk } from '../../domain/result.js';
import { createStateStores } from '../../infrastructure/adapters/sqlite/create-state-stores.js';

export const milestoneListCmd = async (_args: string[]): Promise<string> => {
  const { milestoneStore } = createStateStores();
  const result = await listMilestones({ milestoneStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
