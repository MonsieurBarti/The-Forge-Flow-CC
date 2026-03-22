import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { isErr, isOk } from '../result.js';
import type { BeadStore } from './bead-store.port.js';

export function runBeadStoreContractTests(name: string, createStore: () => Promise<BeadStore>) {
  describe(`BeadStore contract: ${name}`, () => {
    let store: BeadStore;

    beforeEach(async () => {
      store = await createStore();
      const initResult = await store.init();
      expect(isOk(initResult)).toBe(true);
    });

    it('should create and get a bead', async () => {
      const created = await store.create({
        label: 'tff:slice',
        title: 'M01-S01',
      });
      expect(isOk(created)).toBe(true);
      if (!isOk(created)) return;

      const fetched = await store.get(created.data.id);
      expect(isOk(fetched)).toBe(true);
      if (isOk(fetched)) {
        expect(fetched.data.title).toBe('M01-S01');
        expect(fetched.data.label).toBe('tff:slice');
      }
    });

    it('should list beads by label', async () => {
      await store.create({ label: 'tff:slice', title: 'S01' });
      await store.create({ label: 'tff:slice', title: 'S02' });
      await store.create({ label: 'tff:task', title: 'T01' });

      const slices = await store.list({ label: 'tff:slice' });
      expect(isOk(slices)).toBe(true);
      if (isOk(slices)) expect(slices.data).toHaveLength(2);
    });

    it('should list beads by status', async () => {
      await store.create({ label: 'tff:task', title: 'T01' });
      const created = await store.create({ label: 'tff:task', title: 'T02' });
      if (isOk(created)) await store.updateStatus(created.data.id, 'executing');

      const openTasks = await store.list({ status: 'open' });
      expect(isOk(openTasks)).toBe(true);
      if (isOk(openTasks)) expect(openTasks.data).toHaveLength(1);
    });

    it('should list beads by parentId', async () => {
      await store.create({
        label: 'tff:task',
        title: 'T01',
        parentId: 'parent-1',
      });
      await store.create({
        label: 'tff:task',
        title: 'T02',
        parentId: 'parent-1',
      });
      await store.create({
        label: 'tff:task',
        title: 'T03',
        parentId: 'parent-2',
      });

      const children = await store.list({ parentId: 'parent-1' });
      expect(isOk(children)).toBe(true);
      if (isOk(children)) expect(children.data).toHaveLength(2);
    });

    it('should update status', async () => {
      const created = await store.create({
        label: 'tff:slice',
        title: 'S01',
      });
      if (!isOk(created)) return;

      const updateResult = await store.updateStatus(created.data.id, 'executing');
      expect(isOk(updateResult)).toBe(true);

      const fetched = await store.get(created.data.id);
      if (isOk(fetched)) expect(fetched.data.status).toBe('executing');
    });

    it('should update design', async () => {
      const created = await store.create({
        label: 'tff:slice',
        title: 'S01',
      });
      if (!isOk(created)) return;

      const updateResult = await store.updateDesign(created.data.id, '# Updated plan');
      expect(isOk(updateResult)).toBe(true);

      const fetched = await store.get(created.data.id);
      if (isOk(fetched)) expect(fetched.data.design).toBe('# Updated plan');
    });

    it('should update metadata', async () => {
      const created = await store.create({
        label: 'tff:task',
        title: 'T01',
      });
      if (!isOk(created)) return;

      const updateResult = await store.updateMetadata(created.data.id, 'pr', 'https://github.com/org/repo/pull/42');
      expect(isOk(updateResult)).toBe(true);

      const fetched = await store.get(created.data.id);
      if (isOk(fetched)) expect(fetched.data.metadata?.pr).toBe('https://github.com/org/repo/pull/42');
    });

    it('should claim a bead', async () => {
      const created = await store.create({
        label: 'tff:task',
        title: 'T01',
      });
      if (!isOk(created)) return;

      const claimResult = await store.claim(created.data.id);
      expect(isOk(claimResult)).toBe(true);

      const fetched = await store.get(created.data.id);
      if (isOk(fetched)) expect(fetched.data.status).toBe('in_progress');
    });

    it('should add a blocks dependency', async () => {
      const a = await store.create({ label: 'tff:task', title: 'A' });
      const b = await store.create({ label: 'tff:task', title: 'B' });
      if (!isOk(a) || !isOk(b)) return;

      const depResult = await store.addDependency(a.data.id, b.data.id, 'blocks');
      expect(isOk(depResult)).toBe(true);

      const fetched = await store.get(a.data.id);
      if (isOk(fetched)) expect(fetched.data.blocks).toContain(b.data.id);
    });

    it('should add a validates dependency', async () => {
      const a = await store.create({ label: 'tff:task', title: 'A' });
      const b = await store.create({ label: 'tff:req', title: 'R01' });
      if (!isOk(a) || !isOk(b)) return;

      const depResult = await store.addDependency(a.data.id, b.data.id, 'validates');
      expect(isOk(depResult)).toBe(true);

      const fetched = await store.get(a.data.id);
      if (isOk(fetched)) expect(fetched.data.validates).toContain(b.data.id);
    });

    it('should close a bead', async () => {
      const created = await store.create({
        label: 'tff:slice',
        title: 'S01',
      });
      if (!isOk(created)) return;

      const closeResult = await store.close(created.data.id, 'Done');
      expect(isOk(closeResult)).toBe(true);

      const fetched = await store.get(created.data.id);
      if (isOk(fetched)) expect(fetched.data.status).toBe('closed');
    });

    it('should return ready beads (open with no blockers)', async () => {
      await store.create({ label: 'tff:task', title: 'T01' });
      await store.create({ label: 'tff:task', title: 'T02' });
      const closed = await store.create({ label: 'tff:task', title: 'T03' });
      if (isOk(closed)) await store.close(closed.data.id);

      const readyResult = await store.ready();
      expect(isOk(readyResult)).toBe(true);
      if (isOk(readyResult)) expect(readyResult.data).toHaveLength(2);
    });

    it('should return error for non-existent bead', async () => {
      const result = await store.get('nonexistent-id');
      expect(isErr(result)).toBe(true);
    });

    it('should return error when updating non-existent bead status', async () => {
      const result = await store.updateStatus('nonexistent-id', 'closed');
      expect(isErr(result)).toBe(true);
    });

    it('should return error when updating non-existent bead design', async () => {
      const result = await store.updateDesign('nonexistent-id', '# plan');
      expect(isErr(result)).toBe(true);
    });

    it('should return error when claiming non-existent bead', async () => {
      const result = await store.claim('nonexistent-id');
      expect(isErr(result)).toBe(true);
    });

    it('should create a bead with design', async () => {
      const created = await store.create({
        label: 'tff:slice',
        title: 'S01',
        design: '# Initial plan',
      });
      expect(isOk(created)).toBe(true);
      if (!isOk(created)) return;

      const fetched = await store.get(created.data.id);
      if (isOk(fetched)) expect(fetched.data.design).toBe('# Initial plan');
    });

    it('should create a bead with parentId', async () => {
      const parent = await store.create({
        label: 'tff:milestone',
        title: 'M01',
      });
      if (!isOk(parent)) return;

      const child = await store.create({
        label: 'tff:slice',
        title: 'S01',
        parentId: parent.data.id,
      });
      expect(isOk(child)).toBe(true);
      if (isOk(child)) expect(child.data.parentId).toBe(parent.data.id);
    });
  });
}

// Run contract tests against InMemoryBeadStore
runBeadStoreContractTests('InMemoryBeadStore', async () => new InMemoryBeadStore());
