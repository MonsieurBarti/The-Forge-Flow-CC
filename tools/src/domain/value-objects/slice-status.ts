import { z } from 'zod';

export const SliceStatusSchema = z.enum([
  'discussing',
  'researching',
  'planning',
  'executing',
  'verifying',
  'reviewing',
  'completing',
  'closed',
]);

export type SliceStatus = z.infer<typeof SliceStatusSchema>;

const transitions: Record<SliceStatus, readonly SliceStatus[]> = {
  discussing: ['researching'],
  researching: ['planning'],
  planning: ['planning', 'executing'],
  executing: ['verifying'],
  verifying: ['reviewing', 'executing'],
  reviewing: ['completing', 'executing'],
  completing: ['closed'],
  closed: [],
};

export const canTransition = (from: SliceStatus, to: SliceStatus): boolean =>
  transitions[from].includes(to);

export const validTransitionsFrom = (status: SliceStatus): readonly SliceStatus[] =>
  transitions[status];
